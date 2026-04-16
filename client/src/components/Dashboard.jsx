import { useContext, useMemo, useState } from "react";
import { motion } from "framer-motion";
import BurnoutMeter from "./BurnoutMeter.jsx";
import TrendChart from "./TrendChart.jsx";
import LeafIcon from "./LeafIcon.jsx";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { formatDueDateTime, formatDuration } from "../lib/wellbeing.js";
import { hexToRgba } from "../lib/color.js";

const SECTION_LABELS = {
  planner: "Planner",
  sessionStats: "Session stats",
  moodCheckIn: "Mood",
  burnoutMeter: "Burnout meter",
  breakRecommendation: "Break panel",
  weeklyPlanner: "Weekly planner"
};

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

function getTaskState(task) {
  if (task.completedAt) {
    return "completed";
  }
  if (new Date(task.dueAt).getTime() < Date.now()) {
    return "overdue";
  }
  return "open";
}

function getTaskPill(colors, state) {
  if (state === "completed") {
    return {
      label: "Done",
      background: colors.pillGoodBg,
      color: colors.pillGoodText,
      borderColor: colors.pillGoodBorder
    };
  }
  if (state === "overdue") {
    return {
      label: "Overdue",
      background: colors.pillDangerBg,
      color: colors.pillDangerText,
      borderColor: colors.pillDangerBorder
    };
  }
  return {
    label: "Planned",
    background: colors.pillWarnBg,
    color: colors.pillWarnText,
    borderColor: colors.pillWarnBorder
  };
}

export default function Dashboard({
  profile,
  session,
  burnRate,
  meterReady,
  flowState,
  flowRatio,
  statusText,
  breakMinutes,
  history,
  taskDraft,
  plannerTasks,
  plannerInsights,
  dashboardSections,
  fatigueStatus,
  onTaskDraftChange,
  onCreateTask,
  onCompleteTask,
  onDeleteTask,
  onToggleSection,
  onMoodSelect,
  onStartBreak,
  onOpenBurnoutInfo,
  onOpenSettings,
  onLogOut,
  banner,
  notificationState
}) {
  const { colors } = useContext(ThemeContext);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const elapsed = formatDuration(session.elapsedSeconds);
  const actionsPerMinute =
    session.elapsedSeconds > 0 ? ((session.actions / session.elapsedSeconds) * 60).toFixed(1) : "0.0";
  const statusPill = getStatusPill(colors, burnRate);
  const { label: statusLabel, ...statusPillStyles } = statusPill;
  const sortedTasks = useMemo(
    () =>
      [...plannerTasks].sort((left, right) => {
        const leftDone = left.completedAt ? 1 : 0;
        const rightDone = right.completedAt ? 1 : 0;
        if (leftDone !== rightDone) {
          return leftDone - rightDone;
        }
        return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
      }),
    [plannerTasks]
  );

  return (
    <div
      className="wellby-page-shell min-h-screen px-4 py-6 font-body sm:px-6 lg:px-8"
      style={{ background: colors.dashBg, color: colors.secondaryText }}
    >
      <div className="mx-auto max-w-7xl pb-24">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="wellby-glass-dark wellby-accent-ring mb-6 flex flex-col gap-4 rounded-[32px] p-6 lg:flex-row lg:items-center lg:justify-between"
          style={{ color: colors.wordmark }}
        >
          <div className="flex items-center gap-4">
            <LeafIcon className="h-12 w-12" primary={colors.primary} secondary={colors.secondary} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.navText }}>
                Wellby
              </p>
              <h1 className="font-display text-4xl">Hey {profile.name}, here’s your working rhythm.</h1>
              <p className="text-base" style={{ color: colors.tagline }}>
                Work well. Rest well. Be well.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCustomizer((current) => !current)}
              className="wellby-button rounded-full px-4 py-2 text-sm font-bold"
              style={{
                background: hexToRgba(colors.secondary, 0.16),
                color: colors.wordmark,
                border: `1px solid ${hexToRgba(colors.wordmark, 0.18)}`,
                backdropFilter: "blur(16px)"
              }}
            >
              Customize view
            </button>
            <button
              onClick={onLogOut}
              className="wellby-button rounded-full px-4 py-2 text-sm font-bold"
              style={{
                background: hexToRgba(colors.secondary, 0.16),
                color: colors.wordmark,
                border: `1px solid ${hexToRgba(colors.wordmark, 0.18)}`,
                backdropFilter: "blur(16px)"
              }}
            >
              Log out
            </button>
            <button
              onClick={onOpenSettings}
              className="wellby-button rounded-full px-4 py-2 text-sm font-bold"
              style={{
                background: hexToRgba(colors.navActiveBg, 0.72),
                color: colors.navActive,
                border: `1px solid ${hexToRgba(colors.navActiveBorder, 0.72)}`,
                backdropFilter: "blur(16px)"
              }}
            >
              Settings
            </button>
            <button
              onClick={onStartBreak}
              className="wellby-button rounded-full px-5 py-3 text-sm font-bold"
              style={{
                background: colors.primary,
                color: colors.primaryText,
                boxShadow: `0 16px 36px ${hexToRgba(colors.primary, 0.24)}`
              }}
            >
              Take a Wellby break
            </button>
          </div>
        </motion.header>

        {showCustomizer ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="wellby-glass wellby-accent-ring mb-6 rounded-[28px] p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Dashboard layout
                </p>
                <h2 className="font-display text-2xl">Choose what stays on your dashboard</h2>
              </div>
              <p className="text-sm" style={{ color: colors.muted }}>
                Toggle any section off or on instantly.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {Object.entries(SECTION_LABELS).map(([sectionId, label]) => {
                const active = dashboardSections[sectionId];
                return (
                  <button
                    key={sectionId}
                    onClick={() => onToggleSection(sectionId)}
                    className="wellby-button rounded-full px-4 py-2 text-sm font-bold"
                    style={{
                      background: active ? colors.primary : hexToRgba(colors.secondary, 0.68),
                      color: active ? colors.primaryText : colors.secondaryText,
                      border: `1px solid ${active ? colors.primary : hexToRgba(colors.cardBorder, 0.55)}`
                    }}
                  >
                    {active ? "Hide" : "Show"} {label}
                  </button>
                );
              })}
            </div>
          </motion.section>
        ) : null}

        {banner ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="wellby-glass wellby-accent-ring mb-6 rounded-[24px] px-5 py-4 text-sm font-bold"
            style={{
              color: colors.pillWarnText,
              boxShadow: `0 14px 34px ${hexToRgba(colors.pillWarnBorder, 0.15)}`
            }}
          >
            {banner}
          </motion.div>
        ) : null}

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            {dashboardSections.planner ? (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="wellby-glass wellby-accent-ring rounded-[32px] p-6"
              >
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                      To-do planner
                    </p>
                    <h2 className="font-display text-3xl">Plan what you need to finish this week</h2>
                  </div>
                  <div className="rounded-full border px-4 py-2 text-sm font-bold" style={statusPillStyles}>
                    {statusLabel}
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_auto]">
                  <input
                    value={taskDraft.title}
                    onChange={(event) => onTaskDraftChange("title", event.target.value)}
                    placeholder="Add a task for the week..."
                    className="w-full rounded-2xl border-0 px-4 py-3 text-base outline-none"
                    style={{
                      background: hexToRgba(colors.secondary, 0.72),
                      color: colors.secondaryText,
                      boxShadow: `inset 0 1px 0 ${hexToRgba(colors.cardBg, 0.48)}`
                    }}
                  />
                  <input
                    type="datetime-local"
                    value={taskDraft.dueAt}
                    onChange={(event) => onTaskDraftChange("dueAt", event.target.value)}
                    className="w-full rounded-2xl border-0 px-4 py-3 text-base outline-none"
                    style={{
                      background: hexToRgba(colors.secondary, 0.72),
                      color: colors.secondaryText,
                      boxShadow: `inset 0 1px 0 ${hexToRgba(colors.cardBg, 0.48)}`
                    }}
                  />
                  <button
                    onClick={onCreateTask}
                    className="wellby-button rounded-2xl px-5 py-3 font-bold"
                    style={{
                      background: colors.primary,
                      color: colors.primaryText,
                      boxShadow: `0 14px 28px ${hexToRgba(colors.primary, 0.22)}`
                    }}
                  >
                    Add task
                  </button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Open tasks", value: plannerInsights.openCount },
                    { label: "Due today", value: plannerInsights.dueTodayCount },
                    { label: "Overdue", value: plannerInsights.overdueCount },
                    { label: "On-time rate", value: `${Math.round(plannerInsights.onTimeRate * 100)}%` }
                  ].map((item) => (
                    <motion.div
                      key={item.label}
                      whileHover={{ y: -3 }}
                      className="wellby-glass-soft rounded-[24px] p-4"
                    >
                      <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-extrabold">{item.value}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  {sortedTasks.length ? (
                    sortedTasks.map((task) => {
                      const taskState = getTaskState(task);
                      const pill = getTaskPill(colors, taskState);
                      const { label: taskLabel, ...taskPillStyles } = pill;
                      return (
                        <div
                          key={task.id}
                          className="wellby-glass-soft rounded-[24px] px-4 py-4"
                          style={{
                            border: `1px solid ${hexToRgba(
                              taskState === "overdue" ? colors.pillDangerBorder : colors.cardBorder,
                              0.4
                            )}`
                          }}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="text-base font-bold">{task.title}</p>
                                <span className="rounded-full border px-3 py-1 text-xs font-bold" style={taskPillStyles}>
                                  {taskLabel}
                                </span>
                              </div>
                              <p className="mt-2 text-sm" style={{ color: colors.muted }}>
                                Due {formatDueDateTime(task.dueAt)}
                              </p>
                              {task.completedAt ? (
                                <p className="mt-1 text-sm" style={{ color: colors.muted }}>
                                  Completed {formatDueDateTime(task.completedAt)}
                                </p>
                              ) : taskState === "overdue" ? (
                                <p className="mt-1 text-sm font-semibold" style={{ color: colors.pillDangerText }}>
                                  This task is now feeding extra pressure into your current fatigue estimate.
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {!task.completedAt ? (
                                <button
                                  onClick={() => onCompleteTask(task.id)}
                                  className="wellby-button rounded-full px-4 py-2 text-sm font-bold"
                                  style={{ background: colors.breakBtn, color: colors.breakBtnText }}
                                >
                                  Mark complete
                                </button>
                              ) : null}
                              <button
                                onClick={() => onDeleteTask(task.id)}
                                className="wellby-button rounded-full border px-4 py-2 text-sm font-bold"
                                style={{ borderColor: colors.cardBorder, color: colors.secondaryText }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div
                      className="wellby-glass-soft rounded-[24px] px-4 py-4 text-sm"
                      style={{ color: colors.muted }}
                    >
                      Add your first task with a due date and time. Wellby will use this planner to track completion pace,
                      overdue pressure, and weekly balance.
                    </div>
                  )}
                </div>
              </motion.section>
            ) : null}

            {dashboardSections.sessionStats ? (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.09 }}
                className="wellby-glass wellby-accent-ring rounded-[32px] p-6"
              >
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Session signals
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Session time", value: elapsed },
                    { label: "Actions / min", value: actionsPerMinute },
                    { label: "Completed this session", value: session.completedTasks.length },
                    {
                      label: "Flow status",
                      value:
                        flowRatio > 1
                          ? `${flowState} (${Math.round((flowRatio - 1) * 100)}% slower)`
                          : `${flowState} (on target)`
                    }
                  ].map((item) => (
                    <div key={item.label} className="wellby-glass-soft rounded-[24px] p-4">
                      <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-extrabold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </motion.section>
            ) : null}

            {dashboardSections.moodCheckIn ? (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="wellby-glass wellby-accent-ring rounded-[32px] p-6"
              >
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Mood check-in
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      onClick={() => onMoodSelect(score)}
                      className="wellby-button rounded-full px-4 py-3 text-lg font-bold"
                      style={{
                        background: session.moodScore === score ? colors.primary : colors.secondary,
                        color: session.moodScore === score ? colors.primaryText : colors.secondaryText,
                        boxShadow:
                          session.moodScore === score
                            ? `0 14px 30px ${hexToRgba(colors.primary, 0.18)}`
                            : "none"
                      }}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </motion.section>
            ) : null}
          </div>

          <div className="space-y-6">
            {dashboardSections.burnoutMeter ? (
              <BurnoutMeter
                burnRate={burnRate}
                meterReady={meterReady}
                plannerInsights={plannerInsights}
                onOpenDetails={onOpenBurnoutInfo}
              />
            ) : null}

            {dashboardSections.breakRecommendation ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="wellby-glass wellby-accent-ring rounded-[28px] p-5"
              >
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Break Recommendation
                </p>
                <h3 className="mt-2 font-display text-2xl">A {breakMinutes}-minute pause could help.</h3>
                <p className="mt-2 text-sm leading-7" style={{ color: colors.muted }}>
                  {statusText}
                </p>
                <p className="mt-2 text-sm leading-7" style={{ color: colors.muted }}>
                  You can still start a break anytime, even if your burnout meter is low or still waiting on planner deadlines.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="wellby-glass-soft rounded-[22px] px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                      Fatigue detector
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {fatigueStatus.running ? "Running" : "Idle"}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: colors.muted }}>
                      {fatigueStatus.running
                        ? `Confidence ${Math.round((fatigueStatus.confidence ?? 0) * 100)}%`
                        : "Enable the camera sensor in Settings to keep the fatigue monitor active."}
                    </p>
                  </div>
                  <div className="wellby-glass-soft rounded-[22px] px-4 py-4">
                    <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                      Notifications
                    </p>
                    <p className="mt-2 text-xl font-bold">
                      {!plannerInsights.totalCount || !meterReady
                        ? "Waiting on planner"
                        : session.elapsedSeconds >= 15 * 60
                          ? "Live"
                          : "Warming up"}
                    </p>
                    <p className="mt-1 text-sm" style={{ color: colors.muted }}>
                      {!plannerInsights.totalCount || !meterReady
                        ? "Notifications stay off until at least one planned deadline has passed."
                        : session.elapsedSeconds >= 15 * 60
                          ? "Wellby can now notify you if your pace and overdue pressure drift upward."
                          : "Notifications wait until you have worked for at least 15 minutes."}
                    </p>
                  </div>
                </div>
                {notificationState ? (
                  <div className="wellby-glass-soft mt-3 rounded-2xl px-4 py-3 text-sm font-semibold">
                    {notificationState === "high"
                      ? "A high reading will move you straight into break mode."
                      : "Mild readings can be dismissed fully until Wellby checks in again later."}
                  </div>
                ) : null}
                <button
                  onClick={onStartBreak}
                  className="wellby-button mt-4 rounded-full px-5 py-3 text-sm font-bold"
                  style={{
                    background: colors.breakBtn,
                    color: colors.breakBtnText,
                    boxShadow: `0 14px 30px ${hexToRgba(colors.breakBtn, 0.18)}`
                  }}
                >
                  Enter break mode
                </button>
              </motion.div>
            ) : null}
          </div>
        </section>

        {dashboardSections.weeklyPlanner ? (
          <TrendChart history={history} tasks={plannerTasks} />
        ) : null}
      </div>
    </div>
  );
}
