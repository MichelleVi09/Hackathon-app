import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Dashboard from "./components/Dashboard.jsx";
import OnboardingFlow from "./components/OnboardingFlow.jsx";
import BreakMode from "./components/BreakMode.jsx";
import MildToast from "./components/MildToast.jsx";
import BurnoutInfoPage from "./components/BurnoutInfoPage.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import { ThemeContext } from "./context/ThemeContext.jsx";
import { STORAGE_KEYS } from "./lib/constants.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import {
  average,
  getBreakMinutes,
  getFlowBaseline,
  getFlowDeviation,
  getSetupAvailability,
  normalizeHistory
} from "./lib/wellbeing.js";

function createSession() {
  return {
    startedAt: Date.now(),
    elapsedSeconds: 0,
    taskInput: "",
    activeTask: null,
    completedTasks: [],
    actions: 0,
    moodScore: 3,
    stressLevel: 3
  };
}

function getAdaptiveBurnRate(session, baseline) {
  if (!baseline || !baseline.avgTaskSeconds || !baseline.avgSessionSeconds) {
    return 0;
  }

  const currentAvgTask =
    average(session.completedTasks.map((task) => task.durationSeconds)) || baseline.avgTaskSeconds;
  const paceRatio = baseline.avgTaskSeconds / Math.max(currentAvgTask, 1);
  const durationRatio = session.elapsedSeconds / Math.max(baseline.avgSessionSeconds, 1);

  let score = 0;
  if (paceRatio < 0.7) {
    score = Math.max(score, 0.45 + (0.7 - paceRatio) * 0.6);
  }
  if (durationRatio > 1.4) {
    score = Math.max(score, 0.45 + (durationRatio - 1.4) * 0.35);
  }

  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function getRecoveredBurnRate(burnRate) {
  return Math.max(0, Number((burnRate - 0.1).toFixed(2)));
}

function clampMoodScore(value) {
  return Math.max(1, Math.min(5, Number(value) || 3));
}

function getBurnRateFromCheckIn(currentBurnRate, moodScore, stressLevel) {
  const normalizedMood = clampMoodScore(moodScore);
  const normalizedStress = clampMoodScore(stressLevel);
  const adjustment = (normalizedStress - 3) * 0.08 + (3 - normalizedMood) * 0.05;
  return Math.max(0, Math.min(1, Number((currentBurnRate + adjustment).toFixed(2))));
}

function readStoredExtensionCheckIn() {
  try {
    const rawValue = window.localStorage.getItem("wellbyExtensionCheckIn");
    return rawValue ? JSON.parse(rawValue) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const { theme, setTheme, mode, toggleMode, colors } = useContext(ThemeContext);
  const [profile, setProfile] = useLocalStorage(STORAGE_KEYS.profile, null);
  const [history, setHistory] = useLocalStorage(STORAGE_KEYS.history, []);
  const [sessions, setSessions] = useLocalStorage(STORAGE_KEYS.sessions, []);
  const [fatigueOptIn, setFatigueOptIn] = useLocalStorage(STORAGE_KEYS.fatigueOptIn, false);
  const [breakLogs, setBreakLogs] = useLocalStorage(STORAGE_KEYS.breakLogs, []);
  const [extensionPromptInterval, setExtensionPromptInterval] = useLocalStorage(
    STORAGE_KEYS.extensionPromptInterval,
    5
  );
  const [session, setSession] = useState(createSession);
  const [apiBurnRate, setApiBurnRate] = useState(0.18);
  const [breakOpen, setBreakOpen] = useState(false);
  const [banner, setBanner] = useState("");
  const [snoozeCount, setSnoozeCount] = useState(0);
  const [fatigueStatus, setFatigueStatus] = useState({
    fatigueDetected: false,
    connected: false,
    confidence: 0
  });
  const [breakCredit, setBreakCredit] = useState(0);
  const [breakContext, setBreakContext] = useState({
    noSnooze: false,
    reason: "manual",
    beforeBurnRate: 0
  });
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [flowState, setFlowState] = useState("stable");
  const [flowRatio, setFlowRatio] = useState(1);
  const [notificationState, setNotificationState] = useState(null);
  const [burnRateRecoveryOverride, setBurnRateRecoveryOverride] = useState(null);
  const [lastApiUpdatedAt, setLastApiUpdatedAt] = useState(0);
  const apiRefreshRef = useRef(0);
  const activeToastIdRef = useRef(null);
  const escalateOnNextRef = useRef(false);
  const lastExtensionMoodAtRef = useRef(0);

  const baseline = useMemo(() => getFlowBaseline(sessions), [sessions]);
  const flowBaseline = useMemo(() => getFlowBaseline(sessions), [sessions]);
  const flowDeviation = useMemo(() => getFlowDeviation(session, flowBaseline), [session, flowBaseline]);
  const adaptiveBurnRate = useMemo(() => getAdaptiveBurnRate(session, baseline), [session, baseline]);
  const calculatedBurnRate = Math.max(
    0,
    Math.min(
      1,
      Number(
        (
          Math.max(
            apiBurnRate,
            adaptiveBurnRate,
            flowDeviation.penalty,
            fatigueStatus.fatigueDetected ? 0.6 : 0
          )
        ).toFixed(2)
      )
    )
  );
  const recoveryOverrideActive =
    burnRateRecoveryOverride &&
    Date.now() < burnRateRecoveryOverride.activeUntil;
  const effectiveBurnRate = recoveryOverrideActive
    ? Math.min(burnRateRecoveryOverride.value, calculatedBurnRate)
    : calculatedBurnRate;
  const breakMinutes = useMemo(
    () => getBreakMinutes(effectiveBurnRate, fatigueStatus.fatigueDetected),
    [effectiveBurnRate, fatigueStatus.fatigueDetected]
  );

  useEffect(() => {
    setFlowState(flowDeviation.state);
    setFlowRatio(flowDeviation.ratio);
  }, [flowDeviation]);

  function dismissToast() {
    if (activeToastIdRef.current) {
      toast.dismiss(activeToastIdRef.current);
      activeToastIdRef.current = null;
    }
  }

  function clearAllNotifications() {
    dismissToast();
    setBanner("");
    setNotificationState(null);
  }

  function collapseMildNotification() {
    dismissToast();
    setNotificationState("mild-collapsed");
  }

  function reopenMildNotification() {
    dismissToast();
    showMildToast();
  }

  function triggerFullBreakMode({ noSnooze, reason }) {
    dismissToast();
    setBanner(
      noSnooze
        ? "Wellby is stepping in - your burn rate is high. Let's take a proper break."
        : "You've snoozed twice - Wellby thinks it's really time now. Let's recharge!"
    );
    setNotificationState("high");
    setBreakContext({ noSnooze, reason, beforeBurnRate: effectiveBurnRate });
    setBreakOpen(true);
  }

  function handleSnooze() {
    const nextCount = snoozeCount + 1;
    setSnoozeCount(nextCount);
    dismissToast();
    if (nextCount >= 2) {
      escalateOnNextRef.current = true;
      setBanner("One more check-in and Wellby will ask for a real break.");
    }
  }

  function showMildToast() {
    if (activeToastIdRef.current) {
      return;
    }

    setNotificationState("mild");
    const toastId = toast.custom(
      <MildToast
        burnRate={effectiveBurnRate}
        flowState={flowState}
        flowRatio={flowRatio}
        snoozeCount={snoozeCount}
        onDismiss={collapseMildNotification}
        onSnooze={handleSnooze}
        onTakeBreak={() => {
          dismissToast();
          triggerFullBreakMode({ noSnooze: false, reason: "mild-escalation" });
        }}
      />,
      { duration: Infinity }
    );

    activeToastIdRef.current = toastId;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setSession((current) => ({
        ...current,
        elapsedSeconds: Math.floor((Date.now() - current.startedAt) / 1000)
      }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function applyExtensionCheckIn(nextMoodScore, nextStressLevel, intent) {
      const moodScore = clampMoodScore(nextMoodScore);
      const stressLevel = clampMoodScore(nextStressLevel);
      setSession((current) => ({ ...current, moodScore, stressLevel }));
      setApiBurnRate((current) => getBurnRateFromCheckIn(current, moodScore, stressLevel));

      if (intent === "break" || stressLevel >= 4) {
        setBanner("Wellby picked up a higher stress check. A short break could help.");
      } else if (intent === "check-in") {
        setBanner("Wellby logged your browser check-in and updated your session.");
      } else {
        setBanner("Wellby logged your browser check-in.");
      }
    }

    function applyStoredCheckInIfNeeded() {
      const storedCheckIn = readStoredExtensionCheckIn();
      if (!storedCheckIn) {
        return;
      }

      const updatedAt = Number(storedCheckIn.updatedAt) || Date.now();
      if (updatedAt <= lastExtensionMoodAtRef.current) {
        return;
      }

      lastExtensionMoodAtRef.current = updatedAt;
      applyExtensionCheckIn(storedCheckIn.moodScore, storedCheckIn.stressLevel, storedCheckIn.intent);
    }

    function handleExtensionMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.source !== "wellby-extension" || event.data?.type !== "MOOD_SYNC") {
        return;
      }

      const updatedAt = Number(event.data.updatedAt) || Date.now();
      if (updatedAt <= lastExtensionMoodAtRef.current) {
        return;
      }

      lastExtensionMoodAtRef.current = updatedAt;
      applyExtensionCheckIn(event.data.moodScore, event.data.stressLevel, event.data.intent);
    }

    const params = new URLSearchParams(window.location.search);
    const extensionMoodScore = params.get("extensionMoodScore");
    const extensionStressLevel = params.get("extensionStressLevel");
    const extensionIntent = params.get("extensionIntent");
    const extensionMoodUpdatedAt = Number(params.get("extensionMoodUpdatedAt")) || Date.now();

    if (extensionMoodScore !== null || extensionStressLevel !== null) {
      lastExtensionMoodAtRef.current = extensionMoodUpdatedAt;
      applyExtensionCheckIn(
        extensionMoodScore ?? session.moodScore,
        extensionStressLevel ?? session.stressLevel,
        extensionIntent
      );
      params.delete("extensionMoodScore");
      params.delete("extensionStressLevel");
      params.delete("extensionIntent");
      params.delete("extensionMoodUpdatedAt");
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }

    window.addEventListener("message", handleExtensionMessage);
    window.addEventListener("focus", applyStoredCheckInIfNeeded);
    document.addEventListener("visibilitychange", applyStoredCheckInIfNeeded);
    applyStoredCheckInIfNeeded();

    return () => {
      window.removeEventListener("message", handleExtensionMessage);
      window.removeEventListener("focus", applyStoredCheckInIfNeeded);
      document.removeEventListener("visibilitychange", applyStoredCheckInIfNeeded);
    };
  }, []);

  useEffect(() => {
    window.postMessage(
      {
        source: "wellby-app",
        type: "SETTINGS_SYNC",
        extensionPromptInterval,
        theme,
        mode
      },
      window.location.origin
    );
  }, [extensionPromptInterval, theme, mode]);

  useEffect(() => {
    const syncedTask = session.activeTask?.name ?? session.taskInput ?? "";
    const activeTasks = session.activeTask?.name ? [session.activeTask.name] : [];

    window.localStorage.setItem("wellbyCurrentTask", syncedTask);
    window.localStorage.setItem("wellbyActiveTasks", JSON.stringify(activeTasks));

    window.postMessage(
      {
        source: "wellby-app",
        type: "TASK_SYNC",
        currentTask: syncedTask,
        activeTasks
      },
      window.location.origin
    );
  }, [session.activeTask, session.taskInput]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const averageTaskSeconds =
      average(session.completedTasks.map((task) => task.durationSeconds)) || baseline?.avgTaskSeconds || 2400;

    const burnoutPayload = {
      mental_fatigue_score: Number(
        Math.min(
          10,
          Math.max(
            0,
            (6 - session.moodScore) * 1.1 +
              (session.stressLevel - 1) * 1.2 +
              Math.min(4, session.elapsedSeconds / 3600) +
              Math.max(0, (averageTaskSeconds - (baseline?.avgTaskSeconds || averageTaskSeconds)) / 600)
          )
        ).toFixed(2)
      ),
      hours_worked: Number((session.elapsedSeconds / 3600).toFixed(2)),
      wfh_setup_available: getSetupAvailability(profile.setup),
      designation: profile.seniority,
      resource_allocation: Number(
        Math.min(10, Math.max(1, 4 + session.completedTasks.length + session.actions / 12)).toFixed(2)
      )
    };

    const requestId = Date.now();
    apiRefreshRef.current = requestId;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    fetch("/api/burnout/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(burnoutPayload),
      signal: controller.signal
    })
      .then((response) => response.json())
      .then((data) => {
        if (apiRefreshRef.current !== requestId) {
          return;
        }
        const adjusted = Math.max(0, Number((Number(data.burn_rate ?? 0) - breakCredit).toFixed(2)));
        setApiBurnRate(adjusted);
        if (!recoveryOverrideActive) {
          setBurnRateRecoveryOverride(null);
        }
        if (breakCredit > 0) {
          setBreakCredit(0);
        }
        setLastApiUpdatedAt(Date.now());
        setHistory((current) =>
          normalizeHistory([
            ...current.filter((entry) => entry.sessionId !== session.startedAt),
            {
              sessionId: session.startedAt,
              burnRate: Math.max(adjusted, adaptiveBurnRate, flowDeviation.penalty),
              timestamp: new Date().toISOString()
            }
          ])
        );
      })
      .catch(() => {
        return;
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [
    profile,
    session.elapsedSeconds,
    session.completedTasks,
    session.actions,
    session.moodScore,
    session.stressLevel,
    baseline,
    breakCredit,
    session.startedAt,
    adaptiveBurnRate,
    flowDeviation.penalty,
    setHistory
  ]);

  useEffect(() => {
    if (!fatigueOptIn || !profile) {
      return;
    }

    const poll = () => {
      fetch("/api/fatigue/status")
        .then((response) => response.json())
        .then((data) => {
          const confidence = Number(data.confidence ?? 0);
          setFatigueStatus({
            connected: data.connected ?? true,
            fatigueDetected: confidence >= 0.6 && Boolean(data.fatigueDetected),
            confidence
          });
        })
        .catch(() => {
          setFatigueStatus({ fatigueDetected: false, connected: false, confidence: 0 });
        });
    };

    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [fatigueOptIn, profile]);

  useEffect(() => {
    if (!profile || breakOpen) {
      return;
    }

    if (effectiveBurnRate < 0.3) {
      clearAllNotifications();
      return;
    }

    if (flowState === "overloaded") {
      triggerFullBreakMode({ noSnooze: true, reason: "flow-overload" });
      return;
    }

    if (effectiveBurnRate >= 0.6 || fatigueStatus.fatigueDetected) {
      triggerFullBreakMode({ noSnooze: true, reason: "high" });
      return;
    }

    if (escalateOnNextRef.current && lastApiUpdatedAt > 0) {
      triggerFullBreakMode({ noSnooze: false, reason: "mild-escalation" });
      return;
    }

    if (notificationState === "mild-collapsed") {
      return;
    }

    if (notificationState !== "mild") {
      showMildToast();
    }
  }, [
    profile,
    breakOpen,
    effectiveBurnRate,
    fatigueStatus.fatigueDetected,
    flowState,
    lastApiUpdatedAt,
    notificationState
  ]);

  function completeCurrentSession() {
    const recoveredBurnRate = getRecoveredBurnRate(effectiveBurnRate);
    const breakTimestamp = new Date().toISOString();
    setBreakLogs((current) => [
      ...current,
      { timestamp: breakTimestamp, durationMinutes: breakMinutes }
    ]);
    setBurnRateRecoveryOverride({
      value: recoveredBurnRate,
      activeUntil: Date.now() + 45000
    });
    setBreakCredit(0.1);
    setApiBurnRate(recoveredBurnRate);
    setSnoozeCount(0);
    escalateOnNextRef.current = false;
    clearAllNotifications();
  }

  function handleTaskStart() {
    if (!session.taskInput.trim()) {
      return;
    }

    setSession((current) => ({
      ...current,
      actions: current.actions + 1,
      activeTask: {
        id: Date.now(),
        name: current.taskInput.trim(),
        startedAt: Date.now()
      },
      taskInput: ""
    }));
  }

  function handleTaskComplete() {
    setSession((current) => {
      if (!current.activeTask) {
        return current;
      }

      const completedTask = {
        ...current.activeTask,
        completedAt: Date.now(),
        durationSeconds: Math.max(30, Math.floor((Date.now() - current.activeTask.startedAt) / 1000))
      };
      const completedTasks = [...current.completedTasks, completedTask];
      const taskDurations = completedTasks.map((task) => task.durationSeconds);
      const summary = {
        id: current.startedAt,
        durationSeconds: current.elapsedSeconds,
        avgTaskSeconds: taskDurations.length ? average(taskDurations) : current.elapsedSeconds || 0,
        completedTasks: completedTasks.length,
        completedAt: new Date().toISOString()
      };

      setSessions((existing) => [...existing, summary]);
      clearAllNotifications();
      setBreakOpen(false);
      setSnoozeCount(0);
      escalateOnNextRef.current = false;

      return createSession();
    });
  }

  if (!profile) {
    return (
      <OnboardingFlow
        onComplete={(nextProfile) => {
          setProfile(nextProfile);
          setCurrentPage("dashboard");
        }}
      />
    );
  }

  if (currentPage === "burnout-info") {
    return <BurnoutInfoPage burnRate={effectiveBurnRate} onBack={() => setCurrentPage("dashboard")} />;
  }

  if (currentPage === "settings") {
    return (
      <SettingsPage
        fatigueOptIn={fatigueOptIn}
        onToggleFatigue={() => setFatigueOptIn((current) => !current)}
        extensionPromptInterval={extensionPromptInterval}
        onSetExtensionPromptInterval={setExtensionPromptInterval}
        mode={mode}
        onToggleMode={toggleMode}
        activeTheme={theme}
        onSetTheme={setTheme}
        onBack={() => setCurrentPage("dashboard")}
      />
    );
  }

  return (
    <>
      <Dashboard
        profile={profile}
        session={session}
        burnRate={effectiveBurnRate}
        flowState={flowState}
        flowRatio={flowRatio}
        statusText={
          effectiveBurnRate < 0.3
            ? "Your pace looks sustainable right now."
            : effectiveBurnRate < 0.6
              ? "Things are starting to stack up. A shorter pause could help."
              : "Your system is asking for a real pause before work gets heavier."
        }
        breakMinutes={breakMinutes}
        history={history}
        onTaskInputChange={(value) => setSession((current) => ({ ...current, taskInput: value }))}
        onTaskStart={handleTaskStart}
        onTaskComplete={handleTaskComplete}
        onMoodSelect={(score) => {
          const moodScore = clampMoodScore(score);
          setSession((current) => ({ ...current, moodScore }));
          setApiBurnRate((current) => getBurnRateFromCheckIn(current, moodScore, session.stressLevel));
        }}
        onStressSelect={(score) => {
          const stressLevel = clampMoodScore(score);
          setSession((current) => ({ ...current, stressLevel }));
          setApiBurnRate((current) => getBurnRateFromCheckIn(current, session.moodScore, stressLevel));
        }}
        onStartBreak={() => triggerFullBreakMode({ noSnooze: false, reason: "manual" })}
        onOpenBurnoutInfo={() => setCurrentPage("burnout-info")}
        onOpenSettings={() => setCurrentPage("settings")}
        banner={banner}
        notificationState={notificationState}
        onExpandNotification={reopenMildNotification}
      />
      {breakOpen ? (
        <BreakMode
          initialGame={profile.favoriteGame}
          noSnooze={breakContext.noSnooze}
          reason={breakContext.reason}
          beforeBurnRate={breakContext.beforeBurnRate}
          afterBurnRate={getRecoveredBurnRate(effectiveBurnRate)}
          onClose={() => {
            setBreakOpen(false);
            completeCurrentSession();
          }}
        />
      ) : null}
      <footer
        className="fixed bottom-0 left-0 right-0 px-4 py-3 text-center text-xs font-semibold"
        style={{ background: colors.sidebarBg, color: colors.wordmark }}
      >
        Wellby is a wellness companion, not a substitute for professional mental health care.
      </footer>
    </>
  );
}
