import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArcElement, Chart, DoughnutController, Legend, Tooltip } from "chart.js";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { hexToRgba } from "../lib/color.js";
import {
  buildPlannerDay,
  buildPlannerMonth,
  buildPlannerWeek,
  buildWeekHistory,
  formatDueDateTime,
  getTaskInsights
} from "../lib/wellbeing.js";

Chart.register(DoughnutController, ArcElement, Legend, Tooltip);

function TaskBullet({ task, colors, compact = false }) {
  return (
    <li className="flex gap-2">
      <span
        className={`rounded-full ${compact ? "mt-[6px] h-2 w-2" : "mt-[7px] h-2.5 w-2.5"}`}
        style={{
          background: task.completedAt
            ? colors.burnGood
            : new Date(task.dueAt).getTime() < Date.now()
              ? colors.burnHigh
              : colors.burnWarn
        }}
      />
      <div className="min-w-0">
        <div className={`font-semibold ${compact ? "text-sm" : ""}`}>{task.title}</div>
        <div className={`${compact ? "text-xs" : "text-sm"}`} style={{ color: colors.muted }}>
          {formatDueDateTime(task.dueAt)}
        </div>
      </div>
    </li>
  );
}

function WeekDayCard({ day, burnEntry, colors, index }) {
  const burnRate = burnEntry?.burnRate ?? 0;
  const badgeStyles =
    burnRate >= 0.6
      ? {
          background: colors.pillDangerBg,
          color: colors.pillDangerText
        }
      : burnRate >= 0.3
        ? {
            background: colors.pillWarnBg,
            color: colors.pillWarnText
          }
        : {
            background: colors.pillGoodBg,
            color: colors.pillGoodText
          };

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="wellby-glass-soft wellby-hover-lift min-h-[20rem] rounded-[28px] p-5"
      style={{
        border: day.isToday
          ? `2px solid ${colors.primary}`
          : `1px solid ${hexToRgba(colors.cardBorder, 0.35)}`,
        background: day.isToday
          ? `linear-gradient(180deg, ${hexToRgba(colors.cardBg, 0.82)}, ${hexToRgba(colors.secondary, 0.62)})`
          : undefined
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
            {new Date(day.timestamp).toLocaleDateString([], { weekday: "long" })}
          </p>
          <p className="mt-1 text-base font-bold">
            {new Date(day.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
          </p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={badgeStyles}
        >
          {Math.round(burnRate * 100)}%
        </span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ background: hexToRgba(colors.secondary, 0.72) }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(8, Math.round(burnRate * 100))}%` }}
          transition={{ delay: 0.2 + index * 0.04, duration: 0.45 }}
          className="h-full rounded-full"
          style={{
            background:
              burnRate >= 0.6
                ? colors.burnHigh
                : burnRate >= 0.3
                  ? colors.burnWarn
                  : colors.burnGood
          }}
        />
      </div>

      <div className="mt-4 text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
        Tasks for the day
      </div>
      <ul className="mt-3 space-y-3">
        {day.tasks.length ? (
          day.tasks.map((task) => <TaskBullet key={task.id} task={task} colors={colors} compact />)
        ) : (
          <li className="text-sm" style={{ color: colors.muted }}>
            No tasks planned.
          </li>
        )}
      </ul>
    </motion.div>
  );
}

export default function TrendChart({ history, tasks }) {
  const { colors } = useContext(ThemeContext);
  const [view, setView] = useState("week");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const taskInsights = useMemo(() => getTaskInsights(tasks), [tasks]);
  const burnWeek = useMemo(() => buildWeekHistory(history), [history]);
  const plannerWeek = useMemo(() => buildPlannerWeek(tasks), [tasks]);
  const plannerMonth = useMemo(() => buildPlannerMonth(tasks, new Date(selectedDate)), [tasks, selectedDate]);
  const plannerDay = useMemo(() => buildPlannerDay(tasks, new Date(selectedDate)), [tasks, selectedDate]);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const hasTasks = taskInsights.totalCount > 0;
    const chartData = hasTasks
      ? [
          taskInsights.completedCount,
          Math.max(0, taskInsights.openCount - taskInsights.overdueCount),
          taskInsights.overdueCount
        ]
      : [1, 0, 0];

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: hasTasks ? ["Completed", "Open", "Overdue"] : ["No tasks yet", "", ""],
        datasets: [
          {
            data: chartData,
            backgroundColor: hasTasks
              ? [colors.burnGood, colors.burnWarn, colors.burnHigh]
              : [hexToRgba(colors.secondary, 0.72), "transparent", "transparent"],
            borderColor: colors.cardBg,
            borderWidth: 4,
            hoverOffset: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "66%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: colors.muted,
              usePointStyle: true,
              padding: 16
            }
          }
        }
      }
    });

    return () => chartRef.current?.destroy();
  }, [taskInsights, colors]);

  return (
    <section
      className="wellby-glass wellby-accent-ring rounded-[32px] p-6"
      style={{ boxShadow: `0 20px 48px ${hexToRgba(colors.sidebarBg, 0.08)}` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
            Planner Views
          </p>
          <h3 className="font-display text-2xl" style={{ color: colors.secondaryText }}>
            Daily, weekly, and monthly planning
          </h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            ["day", "Daily"],
            ["week", "Weekly"],
            ["month", "Monthly"]
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className="rounded-full px-4 py-2 text-sm font-bold"
              style={{
                background: view === value ? colors.primary : hexToRgba(colors.secondary, 0.62),
                color: view === value ? colors.primaryText : colors.secondaryText,
                border: `1px solid ${view === value ? colors.primary : hexToRgba(colors.cardBorder, 0.45)}`
              }}
            >
              {label}
            </button>
          ))}
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-full px-4 py-2 text-sm font-bold outline-none"
            style={{
              background: hexToRgba(colors.secondary, 0.72),
              color: colors.secondaryText,
              border: `1px solid ${hexToRgba(colors.cardBorder, 0.45)}`
            }}
          />
        </div>
      </div>

      {view === "day" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="wellby-glass-soft rounded-[28px] p-6">
            <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
              Daily agenda
            </p>
            <h4 className="mt-2 font-display text-3xl">
              {new Date(selectedDate).toLocaleDateString([], {
                weekday: "long",
                month: "long",
                day: "numeric"
              })}
            </h4>
            <ul className="mt-6 space-y-4 text-sm">
              {plannerDay.length ? (
                plannerDay.map((task) => <TaskBullet key={task.id} task={task} colors={colors} />)
              ) : (
                <li style={{ color: colors.muted }}>No tasks assigned to this day yet.</li>
              )}
            </ul>
          </div>

          <div className="space-y-4">
            <div className="wellby-glass-soft rounded-[28px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Planner summary
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[20px] px-4 py-4" style={{ background: hexToRgba(colors.secondary, 0.5) }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    Due today
                  </p>
                  <p className="mt-2 text-xl font-bold">{taskInsights.dueTodayCount}</p>
                </div>
                <div className="rounded-[20px] px-4 py-4" style={{ background: hexToRgba(colors.secondary, 0.5) }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    On-time rate
                  </p>
                  <p className="mt-2 text-xl font-bold">{Math.round(taskInsights.onTimeRate * 100)}%</p>
                </div>
              </div>
            </div>

            <div className="wellby-glass-soft rounded-[28px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Task mix
              </p>
              <div className="relative mt-4 h-72">
                <canvas ref={canvasRef} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    On-time rate
                  </span>
                  <span className="mt-2 text-3xl font-extrabold">{Math.round(taskInsights.onTimeRate * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="mt-6 space-y-6">
          <div
            className="rounded-[30px] p-5"
            style={{
              background: `linear-gradient(135deg, ${hexToRgba(colors.cardBg, 0.9)}, ${hexToRgba(colors.secondary, 0.62)})`,
              border: `1px solid ${hexToRgba(colors.cardBorder, 0.35)}`
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Weekly planner
                </p>
                <h4 className="mt-2 font-display text-3xl">A full week at a glance</h4>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.pillGoodBg, color: colors.pillGoodText }}>
                  {taskInsights.completedCount} complete
                </div>
                <div className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.pillWarnBg, color: colors.pillWarnText }}>
                  {taskInsights.openCount} open
                </div>
                <div className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.pillDangerBg, color: colors.pillDangerText }}>
                  {taskInsights.overdueCount} overdue
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              {plannerWeek.map((day, index) => {
                const burnEntry = burnWeek.find(
                  (entry) => new Date(entry.timestamp).toDateString() === new Date(day.timestamp).toDateString()
                );
                return (
                  <WeekDayCard
                    key={day.timestamp}
                    day={day}
                    burnEntry={burnEntry}
                    colors={colors}
                    index={index}
                  />
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="wellby-glass-soft rounded-[28px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Weekly notes
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] px-4 py-4" style={{ background: hexToRgba(colors.secondary, 0.5) }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    Burn snapshot
                  </p>
                  <p className="mt-2 text-xl font-bold">
                    {Math.round((burnWeek[burnWeek.length - 1]?.burnRate ?? 0) * 100)}%
                  </p>
                </div>
                <div className="rounded-[20px] px-4 py-4" style={{ background: hexToRgba(colors.secondary, 0.5) }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    Planned overall
                  </p>
                  <p className="mt-2 text-xl font-bold">{tasks.length}</p>
                </div>
                <div className="rounded-[20px] px-4 py-4" style={{ background: hexToRgba(colors.secondary, 0.5) }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    On-time rate
                  </p>
                  <p className="mt-2 text-xl font-bold">{Math.round(taskInsights.onTimeRate * 100)}%</p>
                </div>
              </div>
            </div>

            <div className="wellby-glass-soft rounded-[28px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Task mix
              </p>
              <div className="relative mt-4 h-72">
                <canvas ref={canvasRef} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    On-time rate
                  </span>
                  <span className="mt-2 text-3xl font-extrabold">{Math.round(taskInsights.onTimeRate * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {plannerMonth.map((day) => (
              <div
                key={day.timestamp}
                className="wellby-glass-soft min-h-[13rem] rounded-[22px] p-4"
                style={{
                  opacity: day.inCurrentMonth ? 1 : 0.55,
                  border: day.isToday
                    ? `2px solid ${colors.primary}`
                    : `1px solid ${hexToRgba(colors.cardBorder, 0.35)}`
                }}
              >
                <div className="text-sm font-bold">
                  {new Date(day.timestamp).toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric"
                  })}
                </div>
                <ul className="mt-3 space-y-2 text-xs">
                  {day.tasks.length ? (
                    day.tasks.slice(0, 4).map((task) => (
                      <li key={task.id} className="rounded-[14px] px-3 py-2" style={{ background: hexToRgba(colors.secondary, 0.46) }}>
                        <div className="font-semibold">{task.title}</div>
                        <div style={{ color: colors.muted }}>
                          {new Date(task.dueAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </div>
                      </li>
                    ))
                  ) : (
                    <li style={{ color: colors.muted }}>No tasks</li>
                  )}
                  {day.tasks.length > 4 ? <li style={{ color: colors.muted }}>+{day.tasks.length - 4} more</li> : null}
                </ul>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="wellby-glass-soft rounded-[28px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Month summary
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] px-4 py-4" style={{ background: hexToRgba(colors.secondary, 0.5) }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    Planned overall
                  </p>
                  <p className="mt-2 text-xl font-bold">{tasks.length}</p>
                </div>
                <div className="rounded-[20px] px-4 py-4" style={{ background: hexToRgba(colors.secondary, 0.5) }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    Open tasks
                  </p>
                  <p className="mt-2 text-xl font-bold">{taskInsights.openCount}</p>
                </div>
                <div className="rounded-[20px] px-4 py-4" style={{ background: hexToRgba(colors.secondary, 0.5) }}>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    Overdue
                  </p>
                  <p className="mt-2 text-xl font-bold">{taskInsights.overdueCount}</p>
                </div>
              </div>
            </div>

            <div className="wellby-glass-soft rounded-[28px] p-5">
              <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Task mix
              </p>
              <div className="relative mt-4 h-72">
                <canvas ref={canvasRef} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                    On-time rate
                  </span>
                  <span className="mt-2 text-3xl font-extrabold">{Math.round(taskInsights.onTimeRate * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
