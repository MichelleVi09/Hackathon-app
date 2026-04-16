import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { hexToRgba } from "../lib/color.js";

function getEyeStatus(fatigueStatus) {
  if (fatigueStatus.fatigueDetected || fatigueStatus.confidence >= 0.75) {
    return "Fatigue likely";
  }
  if (fatigueStatus.lastEar > 0 && fatigueStatus.lastEar < fatigueStatus.earThreshold + 0.02) {
    return "Caution";
  }
  return "Alert";
}

export default function FatiguePreviewPanel({
  fatigueStatus,
  backgroundEnabled,
  persistentEnabled,
  colors,
  onTogglePersistent
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [liveMetrics, setLiveMetrics] = useState(fatigueStatus);
  const [frameUrl, setFrameUrl] = useState("");
  const [frameVisible, setFrameVisible] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setLiveMetrics(fatigueStatus);
  }, [fatigueStatus]);

  useEffect(() => {
    let cancelled = false;

    async function attachStream(stream) {
      if (!videoRef.current) {
        return;
      }
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // Some browsers will still start after metadata loads.
      }
    }

    async function startPreview() {
      try {
        setCameraState("loading");

        if (!backgroundEnabled) {
          const startResponse = await fetch("/api/fatigue/start", { method: "POST" });
          if (!startResponse.ok) {
            throw new Error("Unable to start fatigue preview");
          }
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
          if (!cancelled) {
            streamRef.current = stream;
            await attachStream(stream);
          } else {
            stream.getTracks().forEach((track) => track.stop());
          }
        } catch {
          // Fall back to the annotated detector frame if direct browser video is unavailable.
        }

        if (!cancelled) {
          setCameraState("ready");
        }
      } catch (_error) {
        if (cancelled) {
          return;
        }
        setCameraState("error");
        setCameraError(
          "The local fatigue preview could not start. Make sure the fatigue service is running and the camera is available."
        );
      }
    }

    startPreview();

    const interval = setInterval(() => {
      fetch("/api/fatigue/status")
        .then((response) => response.json())
        .then((data) => {
          if (cancelled) {
            return;
          }
          setLiveMetrics((current) => {
            const next = { ...current, ...data };
            setHistory((existing) => [
              ...existing.slice(-19),
              {
                confidence: next.confidence ?? 0,
                ear: next.lastEar ?? 0,
                perclos: next.perclos ?? 0
              }
            ]);
            return next;
          });
          setFrameVisible(false);
          setFrameUrl(`/api/fatigue/frame?ts=${Date.now()}`);
          setCameraState("ready");
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setCameraState("error");
          setCameraError("Live preview is unavailable right now.");
        });
    }, 1200);

    return () => {
      cancelled = true;
      clearInterval(interval);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [backgroundEnabled]);

  const eyeStatus = useMemo(() => getEyeStatus(liveMetrics), [liveMetrics]);
  const statusColor = liveMetrics.fatigueDetected ? colors.burnHigh : colors.burnGood;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[40px] px-6 py-8"
      style={{
        minHeight: "72vh",
        background: `linear-gradient(135deg, ${hexToRgba(colors.sidebarBg, 0.94)}, ${hexToRgba(colors.cardBg, 0.92)})`,
        color: colors.wordmark,
        border: `1px solid ${hexToRgba(colors.cardBorder, 0.32)}`,
        boxShadow: `0 24px 70px ${hexToRgba(colors.sidebarBg, 0.22)}`
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at top left, ${hexToRgba(colors.primary, 0.16)}, transparent 35%), radial-gradient(circle at bottom right, ${hexToRgba(colors.burnWarn, 0.16)}, transparent 30%)`
        }}
      />

      <div className="relative z-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.navText }}>
              Facial Fatigue Reading
            </p>
            <h3 className="mt-2 font-display text-4xl">Live landmark preview</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: hexToRgba(colors.wordmark, 0.84) }}>
              This section stays in sync with the EAR-based fatigue detector running locally on your machine. You can
              see the live camera feed, the annotated landmark frame, and the current eye-width and fatigue signals in
              real time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div
              className="rounded-full px-4 py-2 text-sm font-bold"
              style={{
                background: hexToRgba(statusColor, 0.16),
                color: statusColor,
                border: `1px solid ${hexToRgba(statusColor, 0.32)}`
              }}
            >
              {liveMetrics.fatigueDetected ? "High fatigue signal" : "Live monitoring"}
            </div>
            <button
              onClick={onTogglePersistent}
              className="wellby-button rounded-full px-4 py-2 text-sm font-bold"
              style={{
                background: hexToRgba(colors.wordmark, 0.08),
                color: colors.wordmark,
                border: `1px solid ${hexToRgba(colors.wordmark, 0.16)}`
              }}
            >
              {persistentEnabled ? "Stop keeping camera on across pages" : "Keep camera on across pages"}
            </button>
          </div>
        </div>

        {!backgroundEnabled ? (
          <div
            className="mt-5 rounded-[24px] px-4 py-4 text-sm font-semibold"
            style={{
              background: hexToRgba(colors.pillWarnBg, 0.16),
              color: colors.wordmark,
              border: `1px solid ${hexToRgba(colors.pillWarnBorder, 0.45)}`
            }}
          >
            Background fatigue monitoring is currently off. Opening this guide starts a local reading session, and you
            can choose to keep it active after navigation with the button above.
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
          <div
            className="relative overflow-hidden rounded-[34px]"
            style={{
              minHeight: "58vh",
              background: hexToRgba(colors.sidebarBg, 0.9),
              border: `1px solid ${hexToRgba(colors.cardBorder, 0.28)}`
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${frameVisible ? "opacity-0" : "opacity-100"}`}
            />
            {frameUrl ? (
              <img
                src={frameUrl}
                alt="Live facial fatigue preview"
                onLoad={() => setFrameVisible(true)}
                onError={() => setFrameVisible(false)}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${frameVisible ? "opacity-100" : "opacity-0"}`}
              />
            ) : null}
            {cameraState !== "ready" ? (
              <div
                className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-semibold"
                style={{ background: hexToRgba(colors.sidebarBg, 0.74), color: colors.wordmark }}
              >
                {cameraState === "loading" ? "Starting local camera preview..." : cameraError}
              </div>
            ) : null}

            <div className="absolute left-4 top-4 rounded-full px-4 py-2 text-sm font-bold" style={{ background: hexToRgba(colors.sidebarBg, 0.72), color: colors.wordmark }}>
              {eyeStatus}
            </div>
            <div className="absolute right-4 top-4 rounded-full px-4 py-2 text-sm font-bold" style={{ background: hexToRgba(colors.primary, 0.18), color: colors.wordmark, border: `1px solid ${hexToRgba(colors.primary, 0.26)}` }}>
              {frameVisible ? "Annotated detector frame" : "Direct camera view"}
            </div>

            <div
              className="absolute bottom-4 left-4 right-4 rounded-[24px] px-5 py-4"
              style={{ background: hexToRgba(colors.sidebarBg, 0.66), backdropFilter: "blur(16px)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: colors.navText }}>
                    Detector summary
                  </p>
                  <p className="mt-2 text-lg font-bold">
                    EAR {liveMetrics.lastEar > 0 ? liveMetrics.lastEar.toFixed(3) : "--"} | PERCLOS{" "}
                    {Math.round((liveMetrics.perclos ?? 0) * 100)}%
                  </p>
                </div>
                <div className="min-w-[12rem] flex-1">
                  <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em]">
                    <span style={{ color: colors.navText }}>Fatigue confidence</span>
                    <span>{Math.round((liveMetrics.confidence ?? 0) * 100)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full" style={{ background: hexToRgba(colors.wordmark, 0.12) }}>
                    <motion.div
                      animate={{ width: `${Math.max(6, (liveMetrics.confidence ?? 0) * 100)}%` }}
                      className="h-full rounded-full"
                      style={{ background: statusColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid content-start gap-4">
            <div className="rounded-[28px] p-5" style={{ background: hexToRgba(colors.cardBg, 0.12), border: `1px solid ${hexToRgba(colors.wordmark, 0.12)}` }}>
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.navText }}>
                Live state
              </p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold">{eyeStatus}</p>
                  <p className="mt-2 text-sm" style={{ color: hexToRgba(colors.wordmark, 0.72) }}>
                    {liveMetrics.running ? "Detector connected to the local camera feed." : "Waiting for detector signal."}
                  </p>
                </div>
                <div
                  className="grid h-20 w-20 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(${statusColor} ${Math.round((liveMetrics.confidence ?? 0) * 360)}deg, ${hexToRgba(colors.wordmark, 0.12)} 0deg)`
                  }}
                >
                  <div
                    className="grid h-14 w-14 place-items-center rounded-full"
                    style={{ background: hexToRgba(colors.sidebarBg, 0.92) }}
                  >
                    <span className="text-sm font-bold">{Math.round((liveMetrics.confidence ?? 0) * 100)}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] p-5" style={{ background: hexToRgba(colors.cardBg, 0.12), border: `1px solid ${hexToRgba(colors.wordmark, 0.12)}` }}>
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.navText }}>
                Recent fatigue trend
              </p>
              <div className="mt-4 flex h-24 items-end gap-2">
                {history.length ? (
                  history.map((item, index) => (
                    <div
                      key={`${item.ear}-${index}`}
                      className="flex-1 rounded-full"
                      style={{
                        height: `${Math.max(16, item.confidence * 100)}%`,
                        background: item.confidence >= 0.75 ? colors.burnHigh : colors.primary,
                        opacity: 0.88
                      }}
                    />
                  ))
                ) : (
                  <div className="text-sm" style={{ color: hexToRgba(colors.wordmark, 0.72) }}>
                    Collecting live readings...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] px-5 py-4" style={{ background: hexToRgba(colors.cardBg, 0.14), border: `1px solid ${hexToRgba(colors.wordmark, 0.12)}` }}>
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.navText }}>
            Signal reasoning
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: hexToRgba(colors.wordmark, 0.8) }}>
            {liveMetrics.signalSummary ||
              "The original EAR fatigue approach treats prolonged low eye openness across many frames as a stronger fatigue cue than a single blink."}
          </p>
          <p className="mt-2 text-sm leading-7" style={{ color: hexToRgba(colors.wordmark, 0.8) }}>
            {liveMetrics.modelSummary ||
              "This viewer uses eye landmarks, Eye Aspect Ratio, and time-window closure tracking to estimate fatigue."}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Average EAR", value: liveMetrics.lastEar > 0 ? liveMetrics.lastEar.toFixed(3) : "Waiting..." },
            { label: "Window EAR", value: liveMetrics.avgEarWindow > 0 ? liveMetrics.avgEarWindow.toFixed(3) : "Waiting..." },
            { label: "EAR threshold", value: Number(liveMetrics.earThreshold ?? 0.23).toFixed(2) },
            { label: "Left EAR", value: liveMetrics.leftEar > 0 ? liveMetrics.leftEar.toFixed(3) : "Waiting..." },
            { label: "Right EAR", value: liveMetrics.rightEar > 0 ? liveMetrics.rightEar.toFixed(3) : "Waiting..." },
            {
              label: "Left eye width",
              value: liveMetrics.leftEyeWidth > 0 ? liveMetrics.leftEyeWidth.toFixed(3) : "Waiting..."
            },
            {
              label: "Right eye width",
              value: liveMetrics.rightEyeWidth > 0 ? liveMetrics.rightEyeWidth.toFixed(3) : "Waiting..."
            },
            {
              label: "Left eye height",
              value: liveMetrics.leftEyeHeight > 0 ? liveMetrics.leftEyeHeight.toFixed(3) : "Waiting..."
            },
            {
              label: "Right eye height",
              value: liveMetrics.rightEyeHeight > 0 ? liveMetrics.rightEyeHeight.toFixed(3) : "Waiting..."
            },
            { label: "Closed-frame streak", value: liveMetrics.closedFrames ?? 0 },
            { label: "Blink count", value: liveMetrics.blinkCount ?? 0 },
            {
              label: "Blinks / min",
              value: liveMetrics.blinkRatePerMinute ? liveMetrics.blinkRatePerMinute.toFixed(1) : "0.0"
            },
            { label: "PERCLOS", value: `${Math.round((liveMetrics.perclos ?? 0) * 100)}%` },
            { label: "Eye closure ratio", value: `${Math.round((liveMetrics.eyeClosureRatio ?? 0) * 100)}%` },
            { label: "Fatigue confidence", value: `${Math.round((liveMetrics.confidence ?? 0) * 100)}%` },
            { label: "Frames analyzed", value: liveMetrics.framesAnalyzed ?? 0 },
            { label: "Tracked landmarks", value: liveMetrics.landmarkCount ?? 0 }
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] p-4"
              style={{
                background: hexToRgba(colors.cardBg, 0.12),
                border: `1px solid ${hexToRgba(colors.wordmark, 0.1)}`
              }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.navText }}>
                {item.label}
              </p>
              <p className="mt-2 text-xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
