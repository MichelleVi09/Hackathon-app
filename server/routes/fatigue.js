import { Router } from "express";
import { requestJson } from "../services/httpClient.js";

const router = Router();
const fatigueServiceUrl = process.env.FATIGUE_SERVICE_URL ?? "http://127.0.0.1:5002";

function normalizeFatigueResponse(data = {}) {
  return {
    connected: Boolean(data.connected ?? true),
    running: Boolean(
      data.running ??
        data.backgroundActive ??
        data.background_active ??
        data.monitoring ??
        false
    ),
    fatigueDetected: Boolean(
      data.fatigueDetected ?? data.fatigue_detected ?? data.status === "fatigued"
    ),
    confidence: Number(data.confidence ?? 0),
    cameraAvailable: Boolean(
      data.cameraAvailable ?? data.camera_available ?? data.connected ?? false
    ),
    lastEar: Number(data.lastEar ?? data.last_ear ?? 0),
    leftEar: Number(data.leftEar ?? data.left_ear ?? 0),
    rightEar: Number(data.rightEar ?? data.right_ear ?? 0),
    leftEyeWidth: Number(data.leftEyeWidth ?? data.left_eye_width ?? 0),
    rightEyeWidth: Number(data.rightEyeWidth ?? data.right_eye_width ?? 0),
    leftEyeHeight: Number(data.leftEyeHeight ?? data.left_eye_height ?? 0),
    rightEyeHeight: Number(data.rightEyeHeight ?? data.right_eye_height ?? 0),
    closedFrames: Number(data.closedFrames ?? data.closed_frames ?? 0),
    blinkCount: Number(data.blinkCount ?? data.blink_count ?? 0),
    blinkRatePerMinute: Number(data.blinkRatePerMinute ?? data.blink_rate_per_minute ?? 0),
    avgEarWindow: Number(data.avgEarWindow ?? data.avg_ear_window ?? 0),
    eyeClosureRatio: Number(data.eyeClosureRatio ?? data.eye_closure_ratio ?? data.perclosRate ?? 0),
    landmarkCount: Number(data.landmarkCount ?? data.landmark_count ?? 0),
    signalSummary: data.signalSummary ?? data.signal_summary ?? "",
    modelSummary: data.modelSummary ?? data.model_summary ?? "",
    earThreshold: Number(data.earThreshold ?? data.ear_threshold ?? 0.23),
    perclos: Number(data.perclos ?? data.perclosRate ?? 0),
    framesAnalyzed: Number(data.framesAnalyzed ?? data.frames_analyzed ?? 0),
    lastUpdatedAt: data.lastUpdatedAt ?? data.last_updated_at ?? null,
    warning: data.warning ?? null,
    raw: data
  };
}

router.get("/status", async (_req, res) => {
  try {
    const data = await requestJson(`${fatigueServiceUrl}/status`, {
      method: "GET",
      timeout: 5000
    });

    return res.json(normalizeFatigueResponse(data));
  } catch (error) {
    return res.json({
      connected: false,
      running: false,
      fatigueDetected: false,
      confidence: 0,
      cameraAvailable: false,
      lastEar: 0,
      leftEar: 0,
      rightEar: 0,
      leftEyeWidth: 0,
      rightEyeWidth: 0,
      leftEyeHeight: 0,
      rightEyeHeight: 0,
      closedFrames: 0,
      earThreshold: 0.23,
      perclos: 0,
      framesAnalyzed: 0,
      lastUpdatedAt: null,
      warning: "Fatigue detection service unavailable."
    });
  }
});

router.get("/frame", async (_req, res) => {
  try {
    const response = await fetch(`${fatigueServiceUrl}/frame`);
    if (!response.ok) {
      return res.status(response.status).end();
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    return res.send(buffer);
  } catch (error) {
    return res.status(503).json({
      warning: "Unable to load the fatigue preview frame."
    });
  }
});

router.post("/start", async (_req, res) => {
  try {
    const data = await requestJson(`${fatigueServiceUrl}/start`, {
      method: "POST",
      timeout: 7000
    });

    return res.json(normalizeFatigueResponse(data));
  } catch (error) {
    return res.status(502).json({
      connected: false,
      running: false,
      fatigueDetected: false,
      confidence: 0,
      cameraAvailable: false,
      lastEar: 0,
      leftEar: 0,
      rightEar: 0,
      leftEyeWidth: 0,
      rightEyeWidth: 0,
      leftEyeHeight: 0,
      rightEyeHeight: 0,
      closedFrames: 0,
      earThreshold: 0.23,
      perclos: 0,
      framesAnalyzed: 0,
      lastUpdatedAt: null,
      warning: "Unable to start the local fatigue detector."
    });
  }
});

router.post("/stop", async (_req, res) => {
  try {
    const data = await requestJson(`${fatigueServiceUrl}/stop`, {
      method: "POST",
      timeout: 7000
    });

    return res.json(normalizeFatigueResponse(data));
  } catch (error) {
    return res.status(502).json({
      connected: false,
      running: false,
      fatigueDetected: false,
      confidence: 0,
      cameraAvailable: false,
      lastEar: 0,
      leftEar: 0,
      rightEar: 0,
      leftEyeWidth: 0,
      rightEyeWidth: 0,
      leftEyeHeight: 0,
      rightEyeHeight: 0,
      closedFrames: 0,
      earThreshold: 0.23,
      perclos: 0,
      framesAnalyzed: 0,
      lastUpdatedAt: null,
      warning: "Unable to stop the local fatigue detector."
    });
  }
});

export default router;
