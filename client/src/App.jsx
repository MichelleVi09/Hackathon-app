import { useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Dashboard from "./components/Dashboard.jsx";
import OnboardingFlow from "./components/OnboardingFlow.jsx";
import BreakMode from "./components/BreakMode.jsx";
import MildToast from "./components/MildToast.jsx";
import BurnoutInfoPage from "./components/BurnoutInfoPage.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import WelcomePage from "./components/WelcomePage.jsx";
import { ThemeContext } from "./context/ThemeContext.jsx";
import { DEFAULT_DASHBOARD_SECTIONS, STORAGE_KEYS } from "./lib/constants.js";
import { useLocalStorage } from "./hooks/useLocalStorage.js";
import {
  average,
  getBreakMinutes,
  getFlowBaseline,
  getFlowDeviation,
  getSetupAvailability,
  getTaskInsights,
  normalizeHistory
} from "./lib/wellbeing.js";

function createSession() {
  return {
    startedAt: Date.now(),
    elapsedSeconds: 0,
    completedTasks: [],
    actions: 0,
    moodScore: 3
  };
}

const DEFAULT_PASSCODE = "0000";

function createFatigueState(overrides = {}) {
  return {
    fatigueDetected: false,
    connected: false,
    confidence: 0,
    running: false,
    cameraAvailable: false,
    lastEar: 0,
    leftEar: 0,
    rightEar: 0,
    leftEyeWidth: 0,
    rightEyeWidth: 0,
    leftEyeHeight: 0,
    rightEyeHeight: 0,
    closedFrames: 0,
    blinkCount: 0,
    blinkRatePerMinute: 0,
    avgEarWindow: 0,
    eyeClosureRatio: 0,
    landmarkCount: 0,
    signalSummary: "",
    modelSummary: "",
    earThreshold: 0.23,
    perclos: 0,
    framesAnalyzed: 0,
    lastUpdatedAt: null,
    warning: "",
    ...overrides
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

function CameraIndicator({ colors, active, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="fixed right-4 top-24 z-40 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-xl"
      style={{
        background: active ? colors.primary : colors.secondary,
        color: active ? colors.primaryText : colors.secondaryText,
        border: `1px solid ${active ? colors.primary : colors.cardBorder}`
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 8.5C4 7.12 5.12 6 6.5 6H13.5C14.88 6 16 7.12 16 8.5V9.5L20 7V17L16 14.5V15.5C16 16.88 14.88 18 13.5 18H6.5C5.12 18 4 16.88 4 15.5V8.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
          strokeLinejoin="round"
        />
      </svg>
      {active ? "Camera live" : "Camera armed"}
    </button>
  );
}

export default function App() {
  const { theme, setTheme, mode, toggleMode, colors } = useContext(ThemeContext);
  const [profile, setProfile] = useLocalStorage(STORAGE_KEYS.profile, null);
  const [history, setHistory] = useLocalStorage(STORAGE_KEYS.history, []);
  const [sessions, setSessions] = useLocalStorage(STORAGE_KEYS.sessions, []);
  const [fatigueOptIn, setFatigueOptIn] = useLocalStorage(STORAGE_KEYS.fatigueOptIn, false);
  const [breakLogs, setBreakLogs] = useLocalStorage(STORAGE_KEYS.breakLogs, []);
  const [lastLoginName, setLastLoginName] = useLocalStorage(STORAGE_KEYS.lastLoginName, "");
  const [plannerTasks, setPlannerTasks] = useLocalStorage(STORAGE_KEYS.plannerTasks, []);
  const [dashboardSections, setDashboardSections] = useLocalStorage(
    STORAGE_KEYS.dashboardSections,
    DEFAULT_DASHBOARD_SECTIONS
  );
  const [session, setSession] = useState(createSession);
  const [taskDraft, setTaskDraft] = useState({ title: "", dueAt: "" });
  const [apiBurnRate, setApiBurnRate] = useState(0.18);
  const [breakOpen, setBreakOpen] = useState(false);
  const [banner, setBanner] = useState("");
  const [fatigueStatus, setFatigueStatus] = useState(createFatigueState);
  const [breakCredit, setBreakCredit] = useState(0);
  const [breakContext, setBreakContext] = useState({
    noSnooze: false,
    reason: "manual",
    beforeBurnRate: 0
  });
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [flowState, setFlowState] = useState("stable");
  const [flowRatio, setFlowRatio] = useState(1);
  const [notificationState, setNotificationState] = useState(null);
  const [lastApiUpdatedAt, setLastApiUpdatedAt] = useState(0);
  const [notificationCooldownUntil, setNotificationCooldownUntil] = useState(0);
  const [fatiguePreviewPinned, setFatiguePreviewPinned] = useState(false);
  const apiRefreshRef = useRef(0);
  const activeToastIdRef = useRef(null);

  const baseline = useMemo(() => {
    if (sessions.length < 3) {
      return null;
    }
    const seed = sessions.slice(0, 3);
    return {
      avgTaskSeconds: average(seed.map((item) => item.avgTaskSeconds || 0)),
      avgSessionSeconds: average(seed.map((item) => item.durationSeconds || 0))
    };
  }, [sessions]);

  const plannerInsights = useMemo(() => getTaskInsights(plannerTasks), [plannerTasks]);
  const flowBaseline = useMemo(() => getFlowBaseline(sessions), [sessions]);
  const flowDeviation = useMemo(() => getFlowDeviation(session, flowBaseline), [session, flowBaseline]);
  const adaptiveBurnRate = useMemo(() => getAdaptiveBurnRate(session, baseline), [session, baseline]);
  const meterReady = plannerInsights.totalCount > 0 && plannerInsights.meterReady;
  const effectiveBurnRate = meterReady
    ? Math.max(
        plannerInsights.plannerBurnRate,
        fatigueStatus.fatigueDetected ? 0.6 : 0,
        fatigueStatus.confidence >= 0.75 ? 0.55 : 0
      )
    : 0;
  const breakMinutes = useMemo(
    () => getBreakMinutes(effectiveBurnRate, fatigueStatus.fatigueDetected),
    [effectiveBurnRate, fatigueStatus.fatigueDetected]
  );
  const mergedSections = useMemo(
    () => ({ ...DEFAULT_DASHBOARD_SECTIONS, ...(dashboardSections || {}) }),
    [dashboardSections]
  );
  const notificationEligible = session.elapsedSeconds >= 15 * 60 && meterReady;
  const detectorRequested = fatigueOptIn || fatiguePreviewPinned;
  const showCameraIndicator = isAuthenticated && detectorRequested && currentPage !== "burnout-info";
  const stackedOverdue = plannerInsights.overdueCount >= 2 || plannerInsights.lateCompletedCount >= 2;

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

  function triggerFullBreakMode({ noSnooze, reason }) {
    dismissToast();
    setBanner(
      noSnooze
        ? "Wellby is stepping in - your burn rate is high. Let's take a proper break."
        : "Wellby is clearing the rest of your alerts for now. Let's recharge and reset."
    );
    setNotificationState("high");
    setBreakContext({ noSnooze, reason, beforeBurnRate: effectiveBurnRate });
    setBreakOpen(true);
    setCurrentPage("break");
  }

  function triggerManualBreak() {
    dismissToast();
    setNotificationState(null);
    setBanner("You can take a Wellby break anytime. Let's pause and reset for a few minutes.");
    setBreakContext({ noSnooze: false, reason: "manual", beforeBurnRate: effectiveBurnRate });
    setBreakOpen(true);
    setCurrentPage("break");
  }

  function handleMildDismiss() {
    dismissToast();
    setNotificationState(null);
    setBanner("Notifications dismissed for now. Wellby will check in again after more work time has passed.");
    setNotificationCooldownUntil(Date.now() + 15 * 60 * 1000);
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
        onDismissForNow={handleMildDismiss}
        onTakeBreak={() => {
          dismissToast();
          triggerManualBreak();
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
    if (!profile) {
      return;
    }

    if (!plannerInsights.totalCount) {
      setApiBurnRate(0);
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
            (6 - session.moodScore) * 1.4 +
              Math.min(4, session.elapsedSeconds / 3600) +
              Math.max(0, (averageTaskSeconds - (baseline?.avgTaskSeconds || averageTaskSeconds)) / 600) +
              plannerInsights.overdueCount * 0.8 +
              plannerInsights.lateCompletedCount * 0.4 +
              (1 - plannerInsights.onTimeRate) * 1.8
          )
        ).toFixed(2)
      ),
      hours_worked: Number((session.elapsedSeconds / 3600).toFixed(2)),
      wfh_setup_available: getSetupAvailability(profile.setup),
      designation: profile.seniority,
      resource_allocation: Number(
        Math.min(
          10,
          Math.max(
            1,
            4 +
              session.completedTasks.length +
              session.actions / 12 +
              plannerInsights.openCount * 0.35 +
              plannerInsights.overdueCount * 0.85
          )
        ).toFixed(2)
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
        if (breakCredit > 0) {
          setBreakCredit(0);
        }
        setLastApiUpdatedAt(Date.now());
        setHistory((current) =>
          normalizeHistory([
            ...current.filter((entry) => entry.sessionId !== session.startedAt),
            {
              sessionId: session.startedAt,
              burnRate: plannerInsights.meterReady
                ? Math.max(plannerInsights.plannerBurnRate, adjusted)
                : 0,
              timestamp: new Date().toISOString()
            }
          ])
        );
      })
      .catch(() => null)
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
    baseline,
    breakCredit,
    session.startedAt,
    plannerInsights.totalCount,
    plannerInsights.overdueCount,
    plannerInsights.onTimeRate,
    plannerInsights.lateCompletedCount,
    plannerInsights.openCount,
    setHistory
  ]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    let cancelled = false;

    if (!detectorRequested) {
      fetch("/api/fatigue/stop", { method: "POST" }).catch(() => null);
      setFatigueStatus(createFatigueState());
      return;
    }

    fetch("/api/fatigue/start", { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) {
          return;
        }
        setFatigueStatus(
          createFatigueState({
            connected: Boolean(data.connected),
            fatigueDetected: Boolean(data.fatigueDetected),
            confidence: Number(data.confidence ?? 0),
            running: Boolean(data.running),
            cameraAvailable: Boolean(data.cameraAvailable),
            lastEar: Number(data.lastEar ?? 0),
            leftEar: Number(data.leftEar ?? 0),
            rightEar: Number(data.rightEar ?? 0),
            leftEyeWidth: Number(data.leftEyeWidth ?? 0),
            rightEyeWidth: Number(data.rightEyeWidth ?? 0),
            leftEyeHeight: Number(data.leftEyeHeight ?? 0),
            rightEyeHeight: Number(data.rightEyeHeight ?? 0),
            closedFrames: Number(data.closedFrames ?? 0),
            blinkCount: Number(data.blinkCount ?? 0),
            blinkRatePerMinute: Number(data.blinkRatePerMinute ?? 0),
            avgEarWindow: Number(data.avgEarWindow ?? 0),
            eyeClosureRatio: Number(data.eyeClosureRatio ?? 0),
            landmarkCount: Number(data.landmarkCount ?? 0),
            signalSummary: data.signalSummary ?? "",
            modelSummary: data.modelSummary ?? "",
            earThreshold: Number(data.earThreshold ?? 0.23),
            perclos: Number(data.perclos ?? 0),
            framesAnalyzed: Number(data.framesAnalyzed ?? 0),
            lastUpdatedAt: data.lastUpdatedAt ?? null,
            warning: data.warning ?? ""
          })
        );
      })
      .catch(() => {
        if (!cancelled) {
          setFatigueStatus(createFatigueState({ warning: "Unable to start the fatigue detector." }));
        }
      });

    const poll = () => {
      fetch("/api/fatigue/status")
        .then((response) => response.json())
        .then((data) => {
          if (cancelled) {
            return;
          }
          const confidence = Number(data.confidence ?? 0);
          setFatigueStatus(
            createFatigueState({
              connected: Boolean(data.connected),
              fatigueDetected: confidence >= 0.6 && Boolean(data.fatigueDetected),
              confidence,
              running: Boolean(data.running),
              cameraAvailable: Boolean(data.cameraAvailable),
              lastEar: Number(data.lastEar ?? 0),
              leftEar: Number(data.leftEar ?? 0),
              rightEar: Number(data.rightEar ?? 0),
              leftEyeWidth: Number(data.leftEyeWidth ?? 0),
              rightEyeWidth: Number(data.rightEyeWidth ?? 0),
              leftEyeHeight: Number(data.leftEyeHeight ?? 0),
              rightEyeHeight: Number(data.rightEyeHeight ?? 0),
              closedFrames: Number(data.closedFrames ?? 0),
              blinkCount: Number(data.blinkCount ?? 0),
              blinkRatePerMinute: Number(data.blinkRatePerMinute ?? 0),
              avgEarWindow: Number(data.avgEarWindow ?? 0),
              eyeClosureRatio: Number(data.eyeClosureRatio ?? 0),
              landmarkCount: Number(data.landmarkCount ?? 0),
              signalSummary: data.signalSummary ?? "",
              modelSummary: data.modelSummary ?? "",
              earThreshold: Number(data.earThreshold ?? 0.23),
              perclos: Number(data.perclos ?? 0),
              framesAnalyzed: Number(data.framesAnalyzed ?? 0),
              lastUpdatedAt: data.lastUpdatedAt ?? null,
              warning: data.warning ?? ""
            })
          );
        })
        .catch(() => {
          if (!cancelled) {
            setFatigueStatus(createFatigueState({ warning: "Fatigue detector unavailable." }));
          }
        });
    };

    poll();
    const interval = setInterval(poll, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [detectorRequested, profile]);

  useEffect(() => {
    if (!profile || breakOpen) {
      return;
    }

    if (!notificationEligible) {
      clearAllNotifications();
      return;
    }

    if (Date.now() < notificationCooldownUntil) {
      dismissToast();
      setNotificationState(null);
      return;
    }

    if (effectiveBurnRate < 0.3) {
      clearAllNotifications();
      return;
    }

    if (!stackedOverdue && !fatigueStatus.fatigueDetected) {
      clearAllNotifications();
      return;
    }

    if (effectiveBurnRate >= 0.6 || fatigueStatus.fatigueDetected) {
      triggerFullBreakMode({ noSnooze: true, reason: "high" });
      return;
    }

    if (lastApiUpdatedAt > 0 && notificationState !== "mild") {
      showMildToast();
    }
  }, [
    profile,
    breakOpen,
    notificationEligible,
    notificationCooldownUntil,
    effectiveBurnRate,
    stackedOverdue,
    fatigueStatus.fatigueDetected,
    lastApiUpdatedAt,
    notificationState
  ]);

  function completeCurrentSession() {
    const taskDurations = session.completedTasks.map((task) => task.durationSeconds);
    const summary = {
      id: session.startedAt,
      durationSeconds: session.elapsedSeconds,
      avgTaskSeconds: taskDurations.length ? average(taskDurations) : session.elapsedSeconds || 0,
      completedTasks: session.completedTasks.length,
      breakTakenAt: new Date().toISOString()
    };

    setSessions((current) => [...current, summary]);
    setBreakLogs((current) => [
      ...current,
      { timestamp: summary.breakTakenAt, durationMinutes: breakMinutes }
    ]);
    setBreakCredit(0.1);
    setApiBurnRate((current) => Math.max(0, Number((current - 0.1).toFixed(2))));
    setNotificationCooldownUntil(0);
    clearAllNotifications();
    setSession(createSession());
  }

  function handleTaskDraftChange(field, value) {
    setTaskDraft((current) => ({ ...current, [field]: value }));
  }

  function handleTaskCreate() {
    if (!taskDraft.title.trim() || !taskDraft.dueAt) {
      return;
    }

    const createdAt = Date.now();
    setPlannerTasks((current) => [
      ...current,
      {
        id: createdAt,
        title: taskDraft.title.trim(),
        dueAt: new Date(taskDraft.dueAt).toISOString(),
        createdAt: new Date(createdAt).toISOString(),
        completedAt: null
      }
    ]);
    setTaskDraft({ title: "", dueAt: "" });
    setSession((current) => ({
      ...current,
      actions: current.actions + 1
    }));
  }

  function handleTaskComplete(taskId) {
    const currentTask = plannerTasks.find((task) => task.id === taskId && !task.completedAt);
    if (!currentTask) {
      return;
    }

    const completedTask = {
      ...currentTask,
      completedAt: new Date().toISOString()
    };

    setPlannerTasks((current) =>
      current.map((task) => (task.id === taskId ? completedTask : task))
    );

    setSession((current) => ({
      ...current,
      actions: current.actions + 1,
      completedTasks: [
        ...current.completedTasks,
        {
          id: completedTask.id,
          name: completedTask.title,
          completedAt: new Date(completedTask.completedAt).getTime(),
          durationSeconds: Math.max(
            30,
            Math.floor(
              (new Date(completedTask.completedAt).getTime() - new Date(completedTask.createdAt).getTime()) / 1000
            )
          )
        }
      ]
    }));
  }

  function handleTaskDelete(taskId) {
    setPlannerTasks((current) => current.filter((task) => task.id !== taskId));
  }

  function handleLogin(name, password) {
    if (!profile) {
      setCurrentPage("onboarding");
      return;
    }

    const submitted = name.trim().toLowerCase();
    const saved = profile.name.trim().toLowerCase();
    const normalizedPassword = String(password ?? "").trim();

    if (normalizedPassword !== DEFAULT_PASSCODE) {
      setLoginError("That password does not match the current Wellby passcode on this device.");
      return;
    }

    if (!submitted || submitted === saved) {
      setLoginError("");
      setLastLoginName(profile.name);
      setIsAuthenticated(true);
      setCurrentPage("dashboard");
      return;
    }

    setLoginError("That name does not match the saved Wellby profile on this device yet.");
  }

  function handleProfileComplete(nextProfile) {
    setProfile(nextProfile);
    setLastLoginName(nextProfile.name);
    setLoginError("");
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
  }

  function handleToggleSection(sectionId) {
    setDashboardSections((current) => ({
      ...DEFAULT_DASHBOARD_SECTIONS,
      ...(current || {}),
      [sectionId]: !(current?.[sectionId] ?? DEFAULT_DASHBOARD_SECTIONS[sectionId])
    }));
  }

  const statusText =
    !plannerInsights.totalCount
      ? "Add at least one planner task with a due time to arm the burnout meter."
      : !meterReady
        ? "Wellby is waiting for the first declared deadline to pass before it starts scoring burnout."
        : plannerInsights.overdueCount > 1
          ? `${plannerInsights.overdueCount} overdue tasks are stacking up, so Wellby is stepping in more firmly.`
          : plannerInsights.overdueCount === 1
            ? "One task slipped past its due time, so Wellby has started watching your fatigue more closely."
            : plannerInsights.completedOnTimeCount > 0
              ? "You are landing tasks on time, so the burnout meter is staying in a normal range."
              : effectiveBurnRate < 0.3
                ? "Your pace looks sustainable right now."
                : effectiveBurnRate < 0.6
                  ? "Things are starting to stack up. A shorter pause could help."
                  : "Your system is asking for a real pause before work gets heavier.";

  if (!profile && currentPage === "onboarding") {
    return <OnboardingFlow onComplete={handleProfileComplete} />;
  }

  if (!isAuthenticated) {
    return (
      <WelcomePage
        profile={profile}
        defaultName={lastLoginName}
        errorMessage={loginError}
        onLogin={handleLogin}
        onCreateProfile={() => {
          setLoginError("");
          setCurrentPage("onboarding");
        }}
      />
    );
  }

  if (currentPage === "burnout-info") {
    return (
      <BurnoutInfoPage
        burnRate={effectiveBurnRate}
        fatigueStatus={fatigueStatus}
        fatigueOptIn={fatigueOptIn}
        taskInsights={plannerInsights}
        meterReady={meterReady}
        previewPinned={fatiguePreviewPinned}
        onTogglePreviewPinned={() => setFatiguePreviewPinned((current) => !current)}
        onBack={() => setCurrentPage("dashboard")}
      />
    );
  }

  if (currentPage === "settings") {
    return (
      <SettingsPage
        fatigueOptIn={fatigueOptIn}
        onToggleFatigue={() => {
          setFatigueOptIn((current) => {
            const next = !current;
            if (!next) {
              setFatiguePreviewPinned(false);
            }
            return next;
          });
        }}
        fatigueStatus={fatigueStatus}
        mode={mode}
        onToggleMode={toggleMode}
        activeTheme={theme}
        onSetTheme={setTheme}
        onBack={() => setCurrentPage("dashboard")}
      />
    );
  }

  if (currentPage === "break" && breakOpen) {
    return (
      <BreakMode
        initialGame={profile.favoriteGame}
        noSnooze={breakContext.noSnooze}
        reason={breakContext.reason}
        beforeBurnRate={breakContext.beforeBurnRate}
        afterBurnRate={Math.max(0, Number((effectiveBurnRate - 0.1).toFixed(2)))}
        onClose={() => {
          setBreakOpen(false);
          setCurrentPage("dashboard");
          completeCurrentSession();
        }}
      />
    );
  }

  return (
    <>
      <Dashboard
        profile={profile}
        session={session}
        burnRate={effectiveBurnRate}
        meterReady={meterReady}
        flowState={flowState}
        flowRatio={flowRatio}
        breakMinutes={breakMinutes}
        history={history}
        taskDraft={taskDraft}
        plannerTasks={plannerTasks}
        plannerInsights={plannerInsights}
        dashboardSections={mergedSections}
        statusText={statusText}
        notificationState={notificationState}
        fatigueStatus={fatigueStatus}
        onTaskDraftChange={handleTaskDraftChange}
        onCreateTask={handleTaskCreate}
        onCompleteTask={handleTaskComplete}
        onDeleteTask={handleTaskDelete}
        onToggleSection={handleToggleSection}
        onMoodSelect={(score) => setSession((current) => ({ ...current, moodScore: score }))}
        onStartBreak={triggerManualBreak}
        onOpenBurnoutInfo={() => setCurrentPage("burnout-info")}
        onOpenSettings={() => setCurrentPage("settings")}
        onLogOut={() => {
          setFatiguePreviewPinned(false);
          setIsAuthenticated(false);
          setCurrentPage("dashboard");
        }}
        banner={banner}
      />
      {showCameraIndicator ? (
        <CameraIndicator
          colors={colors}
          active={fatigueStatus.running}
          onOpen={() => setCurrentPage("burnout-info")}
        />
      ) : null}
      <footer
        className="fixed inset-x-0 bottom-0 top-auto z-[70] px-4 py-3 text-center text-xs font-semibold"
        style={{ background: colors.sidebarBg, color: colors.wordmark }}
      >
        Wellby is a wellness companion, not a substitute for professional mental health care.
      </footer>
    </>
  );
}
