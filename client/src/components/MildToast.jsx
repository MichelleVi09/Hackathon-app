import { useContext, useEffect } from "react";
import { ThemeContext } from "../context/ThemeContext.jsx";
import LeafIcon from "./LeafIcon.jsx";

export default function MildToast({
  burnRate,
  flowState,
  flowRatio,
  onDismiss,
  onSnooze,
  onTakeBreak,
  snoozeCount
}) {
  const { colors } = useContext(ThemeContext);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSnooze();
    }, 60000);
    return () => clearTimeout(timer);
  }, [onSnooze]);

  return (
    <div
      className="w-[360px] rounded-[24px] border p-4 shadow-2xl"
      style={{
        background: colors.cardBg,
        borderColor: colors.cardBorder,
        color: colors.secondaryText
      }}
    >
      <div className="flex items-start gap-3">
        <LeafIcon className="h-8 w-8 shrink-0" primary={colors.primary} secondary={colors.secondary} />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold">Heads up - you've been at it a while</h3>
              <p className="mt-1 text-sm" style={{ color: colors.muted }}>
                Your burn rate is climbing. A short break might help, but no pressure just yet!
              </p>
              {flowRatio > 1 ? (
                <p className="mt-1 text-xs" style={{ color: colors.muted }}>
                  Current flow: {flowState} - {Math.round((flowRatio - 1) * 100)}% slower than baseline.
                </p>
              ) : null}
            </div>
            <div
              className="rounded-full border px-3 py-1 text-xs font-bold"
              style={{
                background: colors.pillWarnBg,
                color: colors.pillWarnText,
                borderColor: colors.pillWarnBorder
              }}
            >
              {Math.round(burnRate * 100)}%
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={onTakeBreak}
              className="rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: colors.breakBtn, color: colors.breakBtnText }}
            >
              Take a break
            </button>
            {snoozeCount < 2 ? (
              <button
                onClick={onSnooze}
                className="rounded-full border px-4 py-2 text-sm font-bold"
                style={{ borderColor: colors.muted, color: colors.muted }}
              >
                5 more minutes
              </button>
            ) : null}
            <button
              onClick={onDismiss}
              className="rounded-full border px-4 py-2 text-sm font-bold"
              style={{ borderColor: colors.cardBorder, color: colors.secondaryText }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
