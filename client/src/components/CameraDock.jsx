import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { hexToRgba } from "../lib/color.js";

export default function CameraDock({ colors, fatigueStatus, onOpen, onHide }) {
  const [frameUrl, setFrameUrl] = useState("");
  const [frameVisible, setFrameVisible] = useState(false);

  useEffect(() => {
    const updateFrame = () => {
      setFrameVisible(false);
      setFrameUrl(`/api/fatigue/frame?ts=${Date.now()}`);
    };

    updateFrame();
    const interval = setInterval(updateFrame, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed bottom-20 right-4 z-40 w-[20rem] overflow-hidden rounded-[28px]"
      style={{
        background: hexToRgba(colors.sidebarBg, 0.94),
        color: colors.wordmark,
        border: `1px solid ${hexToRgba(colors.cardBorder, 0.26)}`,
        boxShadow: `0 20px 58px ${hexToRgba(colors.sidebarBg, 0.25)}`
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: colors.navText }}>
            Camera live
          </p>
          <p className="text-sm font-semibold">
            {fatigueStatus.running ? "Tracking outside the guide" : "Waiting for detector"}
          </p>
        </div>
        <button
          onClick={onHide}
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{
            background: hexToRgba(colors.wordmark, 0.08),
            color: colors.wordmark,
            border: `1px solid ${hexToRgba(colors.wordmark, 0.16)}`
          }}
        >
          Hide
        </button>
      </div>
      <button type="button" onClick={onOpen} className="relative block h-52 w-full text-left">
        {frameUrl ? (
          <img
            src={frameUrl}
            alt="Persistent fatigue preview"
            onLoad={() => setFrameVisible(true)}
            onError={() => setFrameVisible(false)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${frameVisible ? "opacity-100" : "opacity-0"}`}
          />
        ) : null}
        {!frameVisible ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
            Loading live camera feed...
          </div>
        ) : null}
        <div
          className="absolute bottom-3 left-3 right-3 rounded-[18px] px-3 py-3"
          style={{ background: hexToRgba(colors.sidebarBg, 0.68), backdropFilter: "blur(14px)" }}
        >
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>EAR {fatigueStatus.lastEar ? fatigueStatus.lastEar.toFixed(3) : "--"}</span>
            <span>{Math.round((fatigueStatus.confidence ?? 0) * 100)}%</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: colors.navText }}>
            Tap to reopen the full burnout viewer
          </p>
        </div>
      </button>
    </motion.aside>
  );
}
