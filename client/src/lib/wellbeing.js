export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${String(remainder).padStart(2, "0")}s`;
}

export function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getSetupAvailability(setup) {
  return setup === "wfh" || setup === "hybrid" ? 1 : 0;
}

export function getBreakMinutes(burnRate, fatigueDetected) {
  if (fatigueDetected || burnRate > 0.7) {
    return 15;
  }
  if (burnRate > 0.5) {
    return 10;
  }
  return 5;
}

export function getFlowBaseline(sessions) {
  if (!sessions || sessions.length < 3) {
    return null;
  }

  const seed = sessions.slice(0, 3);
  const avgTaskSeconds = average(seed.map((item) => item.avgTaskSeconds || 0)) || 0;
  const avgSessionSeconds = average(seed.map((item) => item.durationSeconds || 0)) || 0;

  return { avgTaskSeconds, avgSessionSeconds };
}

export function getFlowDeviation(session, baseline) {
  if (!baseline || !baseline.avgTaskSeconds || !session.completedTasks.length) {
    return { state: "stable", ratio: 1, penalty: 0 };
  }

  const currentAvg =
    average(session.completedTasks.map((task) => task.durationSeconds)) || baseline.avgTaskSeconds;
  const ratio = currentAvg / baseline.avgTaskSeconds;

  if (ratio <= 1.1) {
    return { state: "stable", ratio, penalty: 0 };
  }
  if (ratio <= 1.2) {
    return { state: "caution", ratio, penalty: 0.16 };
  }
  if (ratio <= 1.3) {
    return { state: "drift", ratio, penalty: 0.36 };
  }

  return { state: "overloaded", ratio, penalty: 0.55 };
}

export function normalizeHistory(history) {
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return history.filter((item) => new Date(item.timestamp).getTime() >= oneWeekAgo);
}

function getLocalDayKey(dateLike) {
  const date = new Date(dateLike);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getWeekStart(referenceDate = new Date()) {
  const current = new Date(referenceDate);
  const dayOfWeek = current.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(current);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(current.getDate() + mondayOffset);
  return weekStart;
}

export function getTaskInsights(tasks, referenceDate = new Date()) {
  const now = new Date(referenceDate).getTime();
  const sorted = [...tasks].sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
  const completed = sorted.filter((task) => task.completedAt);
  const open = sorted.filter((task) => !task.completedAt);
  const overdue = open.filter((task) => new Date(task.dueAt).getTime() < now);
  const meterReady = sorted.some((task) => new Date(task.dueAt).getTime() <= now);
  const dueToday = open.filter((task) => {
    const due = new Date(task.dueAt);
    return due.toDateString() === new Date(referenceDate).toDateString();
  });
  const completedOnTime = completed.filter(
    (task) => !task.dueAt || new Date(task.completedAt).getTime() <= new Date(task.dueAt).getTime()
  );
  const lateCompleted = completed.filter(
    (task) => task.dueAt && new Date(task.completedAt).getTime() > new Date(task.dueAt).getTime()
  );
  const completionRate = sorted.length ? completed.length / sorted.length : 1;
  const onTimeRate = sorted.length ? completedOnTime.length / sorted.length : 1;
  const overduePenalty = !sorted.length || !meterReady
    ? 0
    : Number(
        Math.min(
          0.92,
          Math.max(
            0.12,
            0.12 +
              overdue.length * 0.18 +
              lateCompleted.length * 0.1 -
              completedOnTime.length * 0.04 +
              Math.max(0, 0.12 - onTimeRate * 0.12)
          )
        ).toFixed(2)
      );

  return {
    all: sorted,
    open,
    completed,
    overdue,
    meterReady,
    dueToday,
    lateCompleted,
    completedOnTime,
    totalCount: sorted.length,
    openCount: open.length,
    completedCount: completed.length,
    completedOnTimeCount: completedOnTime.length,
    lateCompletedCount: lateCompleted.length,
    overdueCount: overdue.length,
    dueTodayCount: dueToday.length,
    completionRate: Number(completionRate.toFixed(2)),
    onTimeRate: Number(onTimeRate.toFixed(2)),
    plannerBurnRate: overduePenalty,
    overduePenalty
  };
}

export function buildPlannerWeek(tasks, referenceDate = new Date()) {
  const weekStart = getWeekStart(referenceDate);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const dayKey = getLocalDayKey(day);
    const dayTasks = tasks
      .filter((task) => getLocalDayKey(task.dueAt) === dayKey)
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());

    return {
      timestamp: day.toISOString(),
      isToday: day.toDateString() === new Date(referenceDate).toDateString(),
      tasks: dayTasks
    };
  });
}

export function buildPlannerDay(tasks, referenceDate = new Date()) {
  const current = new Date(referenceDate);
  const dayKey = getLocalDayKey(current);
  return [...tasks]
    .filter((task) => getLocalDayKey(task.dueAt) === dayKey)
    .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
}

export function buildPlannerMonth(tasks, referenceDate = new Date()) {
  const current = new Date(referenceDate);
  const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
  const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
  const calendarStart = new Date(monthStart);
  const startDay = calendarStart.getDay();
  const offset = startDay === 0 ? -6 : 1 - startDay;
  calendarStart.setDate(monthStart.getDate() + offset);
  calendarStart.setHours(0, 0, 0, 0);

  return Array.from({ length: 35 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    const key = getLocalDayKey(day);
    const dayTasks = [...tasks]
      .filter((task) => getLocalDayKey(task.dueAt) === key)
      .sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());

    return {
      timestamp: day.toISOString(),
      isToday: day.toDateString() === current.toDateString(),
      inCurrentMonth: day >= monthStart && day <= monthEnd,
      tasks: dayTasks
    };
  });
}

export function formatDueDateTime(dateLike) {
  const date = new Date(dateLike);
  return date.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function buildWeekHistory(history, referenceDate = new Date()) {
  const current = new Date(referenceDate);
  const weekStart = getWeekStart(referenceDate);

  const grouped = history.reduce((accumulator, entry) => {
    const date = new Date(entry.timestamp);
    date.setHours(0, 0, 0, 0);
    accumulator[getLocalDayKey(date)] = entry;
    return accumulator;
  }, {});

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    const key = getLocalDayKey(day);
    const saved = grouped[key];

    return {
      timestamp: day.toISOString(),
      burnRate: Number((saved?.burnRate ?? 0).toFixed(2)),
      isToday: day.toDateString() === current.toDateString()
    };
  });
}
