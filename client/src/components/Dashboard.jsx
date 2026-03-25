import { useContext } from "react";
import BurnoutMeter from "./BurnoutMeter.jsx";
import TrendChart from "./TrendChart.jsx";
import LeafIcon from "./LeafIcon.jsx";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { formatDuration } from "../lib/wellbeing.js";

function getStatusPill(colors, burnRate) {
  if (burnRate < 0.3) {
    return {
      label: "Doing great",
      background: colors.pillGoodBg,
      color: colors.pillGoodText,
      borderColor: colors.pillGoodBorder
    };
  }
  if (burnRate < 0.6) {
    return {
      label: "Keep an eye out",
      background: colors.pillWarnBg,
      color: colors.pillWarnText,
      borderColor: colors.pillWarnBorder
    };
  }
  return {
    label: "Time for a break",
    background: colors.pillDangerBg,
    color: colors.pillDangerText,
    borderColor: colors.pillDangerBorder
  };
}

export default function Dashboard({
  profile,
  session,
  burnRate,
  flowState,
  flowRatio,
  statusText,
  breakMinutes,
  history,
  onTaskInputChange,
  onTaskStart,
  onTaskComplete,
  onMoodSelect,
  onStartBreak,
  onOpenBurnoutInfo,
  onOpenSettings,
  banner,
  notificationState
}) {
  const { colors } = useContext(ThemeContext);
  const elapsed = formatDuration(session.elapsedSeconds);
  const actionsPerMinute =
    session.elapsedSeconds > 0 ? ((session.actions / session.elapsedSeconds) * 60).toFixed(1) : "0.0";
  const statusPill = getStatusPill(colors, burnRate);
  const { label: statusLabel, ...statusPillStyles } = statusPill;

  return (
    <div
      className="min-h-screen px-4 py-6 font-body sm:px-6 lg:px-8"
      style={{ background: colors.dashBg, color: colors.secondaryText }}
    >
      <div className="mx-auto max-w-7xl pb-20">
        <header
          className="mb-6 flex flex-col gap-4 rounded-[32px] p-6 shadow-glow lg:flex-row lg:items-center lg:justify-between"
          style={{
            background: colors.sidebarBg,
            color: colors.wordmark,
            border: `1px solid ${colors.sidebarBorder}`
          }}
        >
          <div className="flex items-center gap-4">
            <LeafIcon className="h-12 w-12" primary={colors.primary} secondary={colors.secondary} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.navText }}>
                Wellby
              </p>
              <h1 className="font-display text-4xl">Hey {profile.name}, how are you feeling today?</h1>
              <p className="text-base" style={{ color: colors.tagline }}>
                Work well. Rest well. Be well.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenSettings}
              className="rounded-full px-4 py-2 text-sm font-bold"
              style={{
                background: colors.navActiveBg,
                color: colors.navActive,
                border: `1px solid ${colors.navActiveBorder}`
              }}
            >
              Settings
            </button>
            <button
              onClick={onStartBreak}
              className="rounded-full px-5 py-3 text-sm font-bold"
              style={{ background: colors.primary, color: colors.primaryText }}
            >
              Take a Wellby break
            </button>
          </div>
        </header>

        {banner ? (
          <div
            className="mb-6 rounded-[24px] px-5 py-4 text-sm font-bold shadow-lg"
            style={{
              background: colors.pillWarnBg,
              color: colors.pillWarnText,
              border: `1px solid ${colors.pillWarnBorder}`
            }}
          >
            {banner}
          </div>
        ) : null}

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div
            className="rounded-[32px] p-6 shadow-lg"
            style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Current Session
                </p>
                <h2 className="font-display text-3xl">What are you working on?</h2>
              </div>
              <div className="rounded-full border px-4 py-2 text-sm font-bold" style={statusPillStyles}>
                {statusLabel}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                value={session.taskInput}
                onChange={(event) => onTaskInputChange(event.target.value)}
                placeholder="Ship the onboarding polish, fix an API bug, review PR..."
                className="w-full rounded-2xl border-0 px-4 py-3 text-base outline-none"
                style={{ background: colors.secondary, color: colors.secondaryText }}
              />
              <button
                onClick={onTaskStart}
                className="rounded-2xl px-5 py-3 font-bold"
                style={{ background: colors.primary, color: colors.primaryText }}
              >
                Start task
              </button>
              <button
                onClick={onTaskComplete}
                disabled={!session.activeTask}
                className="rounded-2xl px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: colors.breakBtn, color: colors.breakBtnText }}
              >
                Complete
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Session time", value: elapsed },
                { label: "Actions / min", value: actionsPerMinute },
                { label: "Completed tasks", value: session.completedTasks.length },
                {
                  label: "Flow status",
                  value:
                    flowRatio > 1
                      ? `${flowState} (${Math.round((flowRatio - 1) * 100)}% slower)`
                      : `${flowState} (on target)`
                }
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] p-4" style={{ background: colors.secondary }}>
                  <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Mood check-in
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    onClick={() => onMoodSelect(score)}
                    className="rounded-full px-4 py-3 text-lg font-bold"
                    style={{
                      background: session.moodScore === score ? colors.primary : colors.secondary,
                      color: session.moodScore === score ? colors.primaryText : colors.secondaryText
                    }}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Recently finished
              </p>
              <div className="mt-3 space-y-2">
                {session.completedTasks.slice(-4).reverse().map((task) => (
                  <div key={task.id} className="rounded-2xl px-4 py-3 text-sm" style={{ background: colors.secondary }}>
                    <div className="font-bold">{task.name}</div>
                    <div style={{ color: colors.muted }}>
                      Took {Math.round(task.durationSeconds / 60)} min -{" "}
                      {new Date(task.completedAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                ))}
                {!session.completedTasks.length ? (
                  <div
                    className="rounded-2xl px-4 py-3 text-sm"
                    style={{ background: colors.secondary, color: colors.muted }}
                  >
                    Your completed tasks will show up here as Wellby learns your rhythm.
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <BurnoutMeter burnRate={burnRate} onOpenDetails={onOpenBurnoutInfo} />

            <div
              className="rounded-[28px] p-5 shadow-lg"
              style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
            >
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Break Recommendation
              </p>
              <h3 className="mt-2 font-display text-2xl">A {breakMinutes}-minute pause could help.</h3>
              <p className="mt-2 text-sm leading-7" style={{ color: colors.muted }}>
                {statusText}
              </p>
              {notificationState ? (
                <div className="mt-3 rounded-2xl px-4 py-3 text-sm font-semibold" style={{ background: colors.secondary }}>
                  {notificationState === "high"
                    ? "A high reading will move you straight into break mode."
                    : "Mild readings stay gentle unless they keep stacking up."}
                </div>
              ) : null}
              <button
                onClick={onStartBreak}
                className="mt-4 rounded-full px-5 py-3 text-sm font-bold"
                style={{ background: colors.breakBtn, color: colors.breakBtnText }}
              >
                Enter break mode
              </button>
            </div>
          </div>
        </section>

        <TrendChart history={history} />
      </div>
    </div>
  );
}
