import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext.jsx";
import LeafIcon from "./LeafIcon.jsx";
import { hexToRgba } from "../lib/color.js";
import FatiguePreviewPanel from "./FatiguePreviewPanel.jsx";

function getTierInfo(burnRate, colors, meterReady, hasTasks) {
  if (!hasTasks) {
    return {
      title: "Planner-gated standby",
      summary: "The burnout meter is paused until you add planner tasks with declared due times.",
      color: colors.muted,
      badge: "Standby",
      meaning:
        "Wellby now waits for planned work to exist before scoring burnout. No planner tasks means no timing benchmark, so the meter stays neutral rather than guessing."
    };
  }
  if (!meterReady) {
    return {
      title: "Waiting for the first due time",
      summary: "The planner is armed, but Wellby will not score burnout until at least one declared deadline has passed.",
      color: colors.muted,
      badge: "Armed",
      meaning:
        "This keeps the burnout meter tied to your own commitments instead of starting too early. Once a task crosses its due time, the meter begins judging whether work is landing on time or stacking into overdue pressure."
    };
  }
  if (burnRate < 0.3) {
    return {
      title: "Low burn-rate zone",
      summary: "Your recent signals suggest strain is present but still relatively well-contained.",
      color: colors.burnGood,
      badge: "Low",
      meaning:
        "Scientifically, this usually means your workload, task pace, and recent recovery signals are staying near your personal baseline. It does not mean zero stress, only that your current pattern does not strongly resemble burnout escalation."
    };
  }
  if (burnRate < 0.6) {
    return {
      title: "Moderate burn-rate zone",
      summary: "Your working pattern is drifting away from baseline and recovery may be lagging behind effort.",
      color: colors.burnWarn,
      badge: "Moderate",
      meaning:
        "Scientifically, this range suggests meaningful deviation in markers often associated with overload: slower pace, longer sustained effort, overdue task pressure, or fatigue-related inputs. It is not a diagnosis, but it is a signal that your stress load may be accumulating."
    };
  }
  return {
    title: "High burn-rate zone",
    summary: "Your current pattern strongly resembles sustained overload and reduced recovery capacity.",
    color: colors.burnHigh,
    badge: "High",
    meaning:
      "Scientifically, this means the app is seeing a stronger clustering of burnout-related indicators: extended duration, reduced pace, fatigue signals, overdue commitments, or repeated strain compared with your baseline. This is best treated as an early-warning indicator rather than a clinical conclusion."
  };
}

export default function BurnoutInfoPage({
  burnRate,
  fatigueStatus,
  fatigueOptIn,
  taskInsights,
  meterReady,
  previewPinned,
  onTogglePreviewPinned,
  onBack
}) {
  const { colors } = useContext(ThemeContext);
  const tier = getTierInfo(burnRate, colors, meterReady, taskInsights.totalCount > 0);
  const showFatiguePreview = fatigueOptIn || previewPinned || fatigueStatus.running;

  return (
    <div
      className="wellby-page-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8"
      style={{ background: colors.dashBg, color: colors.secondaryText }}
    >
      <div className="mx-auto max-w-6xl pb-20">
        <div className="wellby-glass-dark wellby-accent-ring rounded-[32px] p-6" style={{ color: colors.wordmark }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <LeafIcon className="h-12 w-12" primary={colors.primary} secondary={colors.secondary} />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.navText }}>
                  Burnout Meter Guide
                </p>
                <h1 className="font-display text-4xl">What your burnout score means</h1>
              </div>
            </div>
            <button
              onClick={onBack}
              className="wellby-button rounded-full px-5 py-3 text-sm font-bold"
              style={{
                background: colors.primary,
                color: colors.primaryText,
                boxShadow: `0 16px 34px ${hexToRgba(colors.primary, 0.22)}`
              }}
            >
              Back to dashboard
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="space-y-6">
            <div className="wellby-glass wellby-accent-ring rounded-[32px] p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                    Current reading
                  </p>
                  <h2 className="mt-2 font-display text-3xl">{tier.title}</h2>
                </div>
                <div
                  className="rounded-full border px-4 py-2 text-sm font-bold"
                  style={{
                    background: hexToRgba(colors.secondary, 0.72),
                    color: colors.secondaryText,
                    borderColor: hexToRgba(colors.cardBorder, 0.5)
                  }}
                >
                  {meterReady ? `${Math.round(burnRate * 100)}%` : tier.badge}
                </div>
              </div>

              <div className="mt-5 h-6 overflow-hidden rounded-full" style={{ background: hexToRgba(colors.secondary, 0.72) }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${meterReady ? Math.round(burnRate * 100) : 8}%`,
                    background: `linear-gradient(90deg, ${tier.color}, ${hexToRgba(tier.color, 0.86)})`,
                    boxShadow: `0 0 24px ${hexToRgba(tier.color, 0.28)}`
                  }}
                />
              </div>
              <p className="mt-4 text-sm leading-7" style={{ color: colors.muted }}>
                {tier.summary}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Overdue tasks", value: taskInsights.overdueCount },
                { label: "Open tasks", value: taskInsights.openCount },
                { label: "On-time rate", value: `${Math.round(taskInsights.onTimeRate * 100)}%` },
                { label: "Late completions", value: taskInsights.lateCompletedCount }
              ].map((item) => (
                <div key={item.label} className="wellby-glass wellby-accent-ring rounded-[24px] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="wellby-glass wellby-accent-ring rounded-[24px] p-5">
                <div className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Plain-language summary
                </div>
                <p className="mt-3 leading-8">{tier.summary}</p>
              </div>

              <div className="wellby-glass wellby-accent-ring rounded-[24px] p-5">
                <div className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Scientific interpretation
                </div>
                <p className="mt-3 leading-8">{tier.meaning}</p>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="wellby-glass wellby-accent-ring rounded-[32px] p-6">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                How Wellby estimates this
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                <li>Wellby looks for strain where workload timing and recovery begin drifting apart, not just when you have a busy day.</li>
                <li>The score blends work duration, perceived mental fatigue, task timing, and whether deadlines are stacking into overdue pressure.</li>
                <li>The planner gates the meter, so it waits for a real due time before scoring strain.</li>
                <li>Tasks completed before their declared deadline help keep the meter in a lower range.</li>
                <li>Late completions and overdue tasks add pressure, and stacked overdue tasks raise the meter faster.</li>
                <li>The fatigue camera adds eye-openness and sustained-closure signals when the local detector is running.</li>
              </ul>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="wellby-glass wellby-accent-ring rounded-[28px] p-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  EAR fatigue method
                </p>
                <div className="mt-4 space-y-3 text-sm leading-7">
                  <p>The fatigue detector tracks six landmark points around each eye and computes:</p>
                  <div className="wellby-glass-soft rounded-[20px] px-4 py-3 font-mono text-xs">
                    EAR = (||p2 - p6|| + ||p3 - p5||) / (2 ||p1 - p4||)
                  </div>
                  <p>
                    Lower EAR values mean the eye is closing. When low EAR persists across frames and PERCLOS rises,
                    Wellby treats that as stronger fatigue evidence than a single blink.
                  </p>
                  <p>
                    Facial fatigue tends to show up as sustained loss of eye openness over time, so the detector watches
                    both landmark geometry and closure duration instead of reacting to isolated frames.
                  </p>
                </div>
              </div>

              <div className="wellby-glass wellby-accent-ring rounded-[28px] p-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Live fatigue statistics
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: "Average EAR", value: fatigueStatus.lastEar > 0 ? fatigueStatus.lastEar.toFixed(3) : "--" },
                    { label: "EAR threshold", value: Number(fatigueStatus.earThreshold ?? 0.23).toFixed(2) },
                    { label: "PERCLOS", value: `${Math.round((fatigueStatus.perclos ?? 0) * 100)}%` },
                    { label: "Frames analyzed", value: fatigueStatus.framesAnalyzed ?? 0 }
                  ].map((item) => (
                    <div key={item.label} className="wellby-glass-soft rounded-[20px] p-4">
                      <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                        {item.label}
                      </p>
                      <p className="mt-2 text-xl font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7" style={{ color: colors.muted }}>
                  EAR compares vertical eye opening to horizontal eye width, while PERCLOS estimates how much of the
                  recent window your eyes were mostly closed.
                </p>
              </div>

              <div className="wellby-glass wellby-accent-ring rounded-[28px] p-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Facial fatigue reading
                </p>
                <p className="mt-3 text-sm leading-7">
                  The live camera view stays here in the burnout guide. If you leave the guide with the camera still
                  armed, Wellby keeps collecting fatigue signals in the background and shows a small camera indicator on
                  the edge of the screen.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={onTogglePreviewPinned}
                    className="wellby-button rounded-full px-5 py-3 text-sm font-bold"
                    style={{
                      background: colors.primary,
                      color: colors.primaryText,
                      boxShadow: `0 14px 30px ${hexToRgba(colors.primary, 0.2)}`
                    }}
                  >
                    {previewPinned ? "Camera stays on after navigation" : "Keep camera on across pages"}
                  </button>
                  <div
                    className="rounded-full border px-4 py-2 text-sm font-bold"
                    style={{
                      background: fatigueStatus.running ? colors.pillGoodBg : colors.pillWarnBg,
                      color: fatigueStatus.running ? colors.pillGoodText : colors.pillWarnText,
                      borderColor: fatigueStatus.running ? colors.pillGoodBorder : colors.pillWarnBorder
                    }}
                  >
                    {fatigueStatus.running ? "Connected live" : "Waiting for detector"}
                  </div>
                  {previewPinned ? (
                    <div
                      className="rounded-full border px-4 py-2 text-sm font-bold"
                      style={{
                        background: colors.pillGoodBg,
                        color: colors.pillGoodText,
                        borderColor: colors.pillGoodBorder
                      }}
                    >
                      Camera stays active after navigation
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="wellby-glass wellby-accent-ring rounded-[28px] p-5">
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  How to read the scale
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Standby", meaning: "Planner has not produced a passed deadline yet", color: colors.muted },
                    { label: "0% - 29%", meaning: "Lower current burnout risk signal", color: colors.burnGood },
                    { label: "30% - 59%", meaning: "Moderate strain, worth monitoring", color: colors.burnWarn },
                    { label: "60% - 100%", meaning: "High strain, break recommended", color: colors.burnHigh }
                  ].map((item) => (
                    <div key={item.label} className="wellby-glass-soft flex items-start gap-3 rounded-[20px] p-4">
                      <span className="mt-1 h-3 w-3 rounded-full" style={{ background: item.color }} />
                      <div>
                        <div className="font-bold">{item.label}</div>
                        <div className="text-sm" style={{ color: colors.muted }}>
                          {item.meaning}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>

        {showFatiguePreview ? (
          <section className="mt-8">
            <FatiguePreviewPanel
              fatigueStatus={fatigueStatus}
              backgroundEnabled={fatigueOptIn}
              persistentEnabled={previewPinned}
              colors={colors}
              onTogglePersistent={onTogglePreviewPinned}
            />
          </section>
        ) : null}

        {showFatiguePreview ? (
          <section className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="wellby-glass wellby-accent-ring rounded-[28px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Important note
              </p>
              <p className="mt-3 text-sm leading-7">
                This meter is an educational wellbeing estimate, not a medical or psychological diagnosis. It is best
                used as an early signal to reflect, rest, and adjust workload when needed.
              </p>
            </div>

            <div className="wellby-glass wellby-accent-ring rounded-[28px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Ethics and limits
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7">
                <li>The work-pattern examples used to calibrate the burnout model are synthetic, which reduces the risk of exposing real employee data.</li>
                <li>These signals are best used for reflection, education, and self-management rather than employee surveillance.</li>
                <li>Wellby should never be used to rank, discipline, or diagnose people from fatigue or productivity patterns.</li>
                <li>The burnout score is a reflective wellbeing signal only and should always stay under user control.</li>
              </ul>
            </div>
          </section>
        ) : null}
      </div>
      <footer
        className="fixed inset-x-0 bottom-0 top-auto z-[70] px-4 py-3 text-center text-xs font-semibold"
        style={{ background: colors.sidebarBg, color: colors.wordmark }}
      >
        Wellby is a wellness companion, not a substitute for professional mental health care.
      </footer>
    </div>
  );
}
