import argparse
import atexit
import threading
import time
from collections import deque

import cv2
import mediapipe as mp
import numpy as np
from flask import Flask, Response, jsonify


LEFT_EYE = [33, 160, 158, 133, 153, 144]
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
EYE_NODES = sorted(set(LEFT_EYE + RIGHT_EYE))
EAR_THRESHOLD = 0.23
CONSEC_FRAMES_FOR_FATIGUE = 18
PERCLOS_WINDOW = 180
PERCLOS_THRESHOLD = 0.38

app = Flask(__name__)
state_lock = threading.Lock()
frame_lock = threading.Lock()
monitor_thread = None
stop_event = threading.Event()
latest_frame = None

state = {
    "connected": True,
    "running": False,
    "fatigueDetected": False,
    "confidence": 0.0,
    "cameraAvailable": False,
    "lastEar": 0.0,
    "perclos": 0.0,
    "framesAnalyzed": 0,
    "lastUpdatedAt": None,
    "leftEar": 0.0,
    "rightEar": 0.0,
    "leftEyeWidth": 0.0,
    "rightEyeWidth": 0.0,
    "leftEyeHeight": 0.0,
    "rightEyeHeight": 0.0,
    "closedFrames": 0,
    "blinkCount": 0,
    "blinkRatePerMinute": 0.0,
    "avgEarWindow": 0.0,
    "eyeClosureRatio": 0.0,
    "landmarkCount": len(EYE_NODES),
    "signalSummary": "",
    "modelSummary": "MediaPipe Face Mesh + EAR + PERCLOS live heuristic",
    "earThreshold": EAR_THRESHOLD,
    "warning": "",
}


def euclidean(point_a, point_b):
    return float(np.linalg.norm(np.array(point_a) - np.array(point_b)))


def compute_ear(landmarks, indices):
    p1 = landmarks[indices[0]]
    p2 = landmarks[indices[1]]
    p3 = landmarks[indices[2]]
    p4 = landmarks[indices[3]]
    p5 = landmarks[indices[4]]
    p6 = landmarks[indices[5]]

    vertical = euclidean(p2, p6) + euclidean(p3, p5)
    horizontal = 2.0 * euclidean(p1, p4)

    if horizontal == 0:
        return 0.0

    return vertical / horizontal


def eye_dimensions(landmarks, indices):
    p1 = landmarks[indices[0]]
    p2 = landmarks[indices[1]]
    p3 = landmarks[indices[2]]
    p4 = landmarks[indices[3]]
    p5 = landmarks[indices[4]]
    p6 = landmarks[indices[5]]

    width = euclidean(p1, p4)
    height = (euclidean(p2, p6) + euclidean(p3, p5)) / 2.0
    return width, height


def update_state(**kwargs):
    with state_lock:
        state.update(kwargs)


def reset_runtime_state(warning=""):
    update_state(
        running=False,
        fatigueDetected=False,
        confidence=0.0,
        cameraAvailable=False,
        lastEar=0.0,
        perclos=0.0,
        leftEar=0.0,
        rightEar=0.0,
        leftEyeWidth=0.0,
        rightEyeWidth=0.0,
        leftEyeHeight=0.0,
        rightEyeHeight=0.0,
        closedFrames=0,
        blinkCount=0,
        blinkRatePerMinute=0.0,
        avgEarWindow=0.0,
        eyeClosureRatio=0.0,
        landmarkCount=len(EYE_NODES),
        signalSummary="",
        warning=warning,
    )


def capture_loop(camera_index=0):
    global latest_frame, monitor_thread

    closed_frames = 0
    blink_count = 0
    prev_eye_closed = False
    recent_eye_states = deque(maxlen=PERCLOS_WINDOW)
    recent_ear_values = deque(maxlen=90)
    face_mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    capture = cv2.VideoCapture(camera_index)

    if not capture.isOpened():
        reset_runtime_state("Camera unavailable. Check device permissions and try again.")
        face_mesh.close()
        monitor_thread = None
        return

    update_state(running=True, cameraAvailable=True, warning="")

    try:
        while not stop_event.is_set():
            success, frame = capture.read()
            if not success:
                update_state(
                    running=True,
                    cameraAvailable=False,
                    warning="Camera stream interrupted.",
                )
                time.sleep(0.4)
                continue

            frame = cv2.flip(frame, 1)
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            result = face_mesh.process(rgb_frame)
            annotated_frame = frame.copy()

            if not result.multi_face_landmarks:
                recent_eye_states.append(0)
                update_state(
                    running=True,
                    cameraAvailable=True,
                    fatigueDetected=False,
                    confidence=0.0,
                    perclos=0.0 if not recent_eye_states else sum(recent_eye_states) / len(recent_eye_states),
                    eyeClosureRatio=0.0 if not recent_eye_states else sum(recent_eye_states) / len(recent_eye_states),
                    avgEarWindow=0.0 if not recent_ear_values else float(sum(recent_ear_values) / len(recent_ear_values)),
                    landmarkCount=len(EYE_NODES),
                    signalSummary="No face detected - metrics are paused until the eyes are visible.",
                    warning="Face not detected. Keep the webcam roughly at eye level.",
                )
                cv2.putText(
                    annotated_frame,
                    "Face not detected",
                    (20, 36),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (235, 235, 235),
                    2,
                    cv2.LINE_AA,
                )
                success, encoded = cv2.imencode(".jpg", annotated_frame)
                if success:
                    with frame_lock:
                        latest_frame = encoded.tobytes()
                time.sleep(0.05)
                continue

            face_landmarks = result.multi_face_landmarks[0]
            points = [(lm.x, lm.y) for lm in face_landmarks.landmark]
            left_ear = compute_ear(points, LEFT_EYE)
            right_ear = compute_ear(points, RIGHT_EYE)
            left_width, left_height = eye_dimensions(points, LEFT_EYE)
            right_width, right_height = eye_dimensions(points, RIGHT_EYE)
            ear = float((left_ear + right_ear) / 2.0)

            eye_closed = ear < EAR_THRESHOLD
            closed_frames = closed_frames + 1 if eye_closed else 0
            if prev_eye_closed and not eye_closed:
                blink_count += 1
            prev_eye_closed = eye_closed
            recent_eye_states.append(1 if eye_closed else 0)
            recent_ear_values.append(ear)
            perclos = sum(recent_eye_states) / len(recent_eye_states) if recent_eye_states else 0.0
            avg_ear_window = sum(recent_ear_values) / len(recent_ear_values) if recent_ear_values else 0.0

            confidence = max(
                min(closed_frames / CONSEC_FRAMES_FOR_FATIGUE, 1.0),
                min(perclos / PERCLOS_THRESHOLD, 1.0),
            )
            fatigue_detected = closed_frames >= CONSEC_FRAMES_FOR_FATIGUE or perclos >= PERCLOS_THRESHOLD
            elapsed_minutes = max((state["framesAnalyzed"] + 1) / 30.0 / 60.0, 1 / 60.0)
            blink_rate_per_minute = blink_count / elapsed_minutes
            if fatigue_detected:
                signal_summary = "Sustained eye closure and elevated PERCLOS indicate likely fatigue."
            elif confidence >= 0.45:
                signal_summary = "Eye openness is drifting lower than normal and closure time is building."
            else:
                signal_summary = "Eye openness and closure timing are still within a more alert range."

            height, width = annotated_frame.shape[:2]
            for index in EYE_NODES:
                x = int(points[index][0] * width)
                y = int(points[index][1] * height)
                cv2.circle(annotated_frame, (x, y), 2, (86, 218, 255), -1)

            status_label = "FATIGUE" if fatigue_detected else "ACTIVE"
            status_color = (110, 110, 255) if fatigue_detected else (120, 220, 140)
            cv2.putText(
                annotated_frame,
                f"EAR {ear:.3f}  THR {EAR_THRESHOLD:.2f}",
                (20, 34),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.72,
                (245, 245, 245),
                2,
                cv2.LINE_AA,
            )
            cv2.putText(
                annotated_frame,
                f"PERCLOS {perclos * 100:.0f}%  CLOSED {closed_frames}",
                (20, 64),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.62,
                (220, 220, 220),
                2,
                cv2.LINE_AA,
            )
            cv2.putText(
                annotated_frame,
                status_label,
                (20, 96),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                status_color,
                2,
                cv2.LINE_AA,
            )

            with state_lock:
                state["running"] = True
                state["cameraAvailable"] = True
                state["fatigueDetected"] = fatigue_detected
                state["confidence"] = round(float(confidence), 2)
                state["lastEar"] = round(ear, 4)
                state["perclos"] = round(float(perclos), 3)
                state["leftEar"] = round(float(left_ear), 4)
                state["rightEar"] = round(float(right_ear), 4)
                state["leftEyeWidth"] = round(float(left_width), 4)
                state["rightEyeWidth"] = round(float(right_width), 4)
                state["leftEyeHeight"] = round(float(left_height), 4)
                state["rightEyeHeight"] = round(float(right_height), 4)
                state["closedFrames"] = closed_frames
                state["blinkCount"] = blink_count
                state["blinkRatePerMinute"] = round(float(blink_rate_per_minute), 2)
                state["avgEarWindow"] = round(float(avg_ear_window), 4)
                state["eyeClosureRatio"] = round(float(perclos), 3)
                state["landmarkCount"] = len(EYE_NODES)
                state["signalSummary"] = signal_summary
                state["modelSummary"] = "MediaPipe Face Mesh + EAR + PERCLOS live heuristic"
                state["earThreshold"] = EAR_THRESHOLD
                state["framesAnalyzed"] += 1
                state["lastUpdatedAt"] = time.time()
                state["warning"] = ""

            success, encoded = cv2.imencode(".jpg", annotated_frame)
            if success:
                with frame_lock:
                    latest_frame = encoded.tobytes()

            time.sleep(0.03)
    finally:
        capture.release()
        face_mesh.close()
        reset_runtime_state("Fatigue detector stopped.")
        monitor_thread = None


def ensure_monitor_running():
    global monitor_thread

    if monitor_thread and monitor_thread.is_alive():
        return

    stop_event.clear()
    monitor_thread = threading.Thread(target=capture_loop, daemon=True)
    monitor_thread.start()


@app.get("/status")
def status():
    with state_lock:
        return jsonify(dict(state))


@app.get("/frame")
def frame():
    with frame_lock:
        if latest_frame is None:
            return Response(status=204)
        return Response(latest_frame, mimetype="image/jpeg")


@app.post("/start")
def start():
    ensure_monitor_running()
    time.sleep(0.15)
    with state_lock:
        return jsonify(dict(state))


@app.post("/stop")
def stop():
    stop_event.set()
    update_state(
        running=False,
        fatigueDetected=False,
        confidence=0.0,
        warning="Fatigue detector stopped.",
    )
    return jsonify(
        {
            "connected": True,
            "running": False,
            "fatigueDetected": False,
            "confidence": 0.0,
            "cameraAvailable": state["cameraAvailable"],
            "warning": "Fatigue detector stopped.",
        }
    )


@atexit.register
def shutdown():
    stop_event.set()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Wellby's local EAR fatigue detection service.")
    parser.add_argument("--port", type=int, default=5002)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    app.run(host=args.host, port=args.port)
