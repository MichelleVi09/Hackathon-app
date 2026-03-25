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
