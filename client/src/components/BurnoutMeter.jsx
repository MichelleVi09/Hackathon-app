import { useContext } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { hexToRgba } from "../lib/color.js";

function getTier(burnRate) {
  if (burnRate < 0.3) return "good";
  if (burnRate < 0.6) return "warn";
  return "high";
}

export default function BurnoutMeter({ burnRate, meterReady, plannerInsights, onOpenDetails }) {
  const { colors } = useContext(ThemeContext);
  const percent = Math.round(burnRate * 100);
  const tier = getTier(burnRate);
  const fillColor =
    tier === "good" ? colors.burnGood : tier === "warn" ? colors.burnWarn : colors.burnHigh;
  const pillConfig =
    !meterReady
      ? {
          background: hexToRgba(colors.secondary, 0.72),
          color: colors.secondaryText,
          borderColor: colors.cardBorder,
          label: "Standby"
        }
      : tier === "good"
      ? {
          background: colors.pillGoodBg,
          color: colors.pillGoodText,
          borderColor: colors.pillGoodBorder,
          label: "Doing great"
        }
      : tier === "warn"
        ? {
            background: colors.pillWarnBg,
            color: colors.pillWarnText,
            borderColor: colors.pillWarnBorder,
            label: "Keep an eye out"
          }
        : {
            background: colors.pillDangerBg,
            color: colors.pillDangerText,
            borderColor: colors.pillDangerBorder,
            label: "Time for a break"
          };
  const { label, ...pillStyles } = pillConfig;
  const standbyTitle = !plannerInsights.totalCount
    ? "Planner not armed yet"
    : "Watching due times";
  const standbyCopy = !plannerInsights.totalCount
    ? "Add a planner task with a due date and time to start burnout tracking."
    : "The meter will start once the first declared deadline passes.";

  return (
    <motion.button
      type="button"
      onClick={onOpenDetails}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.995 }}
      className="wellby-glass wellby-accent-ring wellby-sheen w-full rounded-[28px] p-5 text-left"
      style={{ boxShadow: `0 22px 50px ${hexToRgba(colors.sidebarBg, 0.1)}` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
            Burnout Meter
          </p>
          <h3 className="font-display text-2xl" style={{ color: colors.secondaryText }}>
            {meterReady ? label : standbyTitle}
          </h3>
          <p className="mt-1 text-sm" style={{ color: colors.muted }}>
            {meterReady ? "Click to learn what this score means" : standbyCopy}
          </p>
        </div>
        <div className="rounded-full border px-4 py-2 text-sm font-bold" style={pillStyles}>
          {meterReady ? `${percent}%` : "--"}
        </div>
      </div>
      <div
        className="relative h-5 overflow-hidden rounded-full"
        style={{ background: hexToRgba(colors.secondary, 0.78), boxShadow: `inset 0 1px 2px ${hexToRgba(colors.sidebarBg, 0.08)}` }}
      >
        <motion.div
          animate={{ width: `${meterReady ? percent : 8}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: meterReady
              ? `linear-gradient(90deg, ${fillColor}, ${hexToRgba(fillColor, 0.85)})`
              : `linear-gradient(90deg, ${hexToRgba(colors.muted, 0.75)}, ${hexToRgba(colors.secondaryText, 0.55)})`,
            boxShadow: meterReady ? `0 0 24px ${hexToRgba(fillColor, 0.35)}` : "none"
          }}
        />
        <motion.div
          animate={{ x: ["-15%", "105%"] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "linear" }}
          className="absolute inset-y-0 left-0 w-16 rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)" }}
        />
      </div>
    </motion.button>
  );
}
