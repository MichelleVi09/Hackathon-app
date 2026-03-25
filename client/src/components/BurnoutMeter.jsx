import { useContext } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext.jsx";

function getTier(burnRate) {
  if (burnRate < 0.3) return "good";
  if (burnRate < 0.6) return "warn";
  return "high";
}

export default function BurnoutMeter({ burnRate, onOpenDetails }) {
  const { colors } = useContext(ThemeContext);
  const percent = Math.round(burnRate * 100);
  const tier = getTier(burnRate);
  const fillColor =
    tier === "good" ? colors.burnGood : tier === "warn" ? colors.burnWarn : colors.burnHigh;
  const pillConfig =
    tier === "good"
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

  return (
    <button
      type="button"
      onClick={onOpenDetails}
      className="w-full rounded-[28px] p-5 text-left shadow-lg transition hover:translate-y-[-2px]"
      style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
            Burnout Meter
          </p>
          <h3 className="font-display text-2xl" style={{ color: colors.secondaryText }}>
            {label}
          </h3>
          <p className="mt-1 text-sm" style={{ color: colors.muted }}>
            Click to learn what this score means
          </p>
        </div>
        <div className="rounded-full border px-4 py-2 text-sm font-bold" style={pillStyles}>
          {percent}%
        </div>
      </div>
      <div className="relative h-5 overflow-hidden rounded-full" style={{ background: colors.secondary }}>
        <motion.div
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 18 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: fillColor }}
        />
      </div>
    </button>
  );
}
