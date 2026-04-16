(function mountWellbyLauncher() {
  const EXTENSION_THEME_TOKENS = {
    warm: {
      light: {
        panelBg: "rgba(255, 250, 244, 0.99)",
        panelBgSoft: "rgba(255, 255, 255, 0.78)",
        railBg: "rgba(255, 250, 244, 0.98)",
        text: "#4b3423",
        muted: "#8e7158",
        border: "#ddcdbd",
        borderSoft: "#eadccf",
        accent: "#8e7158",
        accentStrong: "#4b3423",
        accentText: "#fff7ee",
        shadow: "rgba(75, 52, 35, 0.14)"
      },
      dark: {
        panelBg: "rgba(24, 17, 13, 0.98)",
        panelBgSoft: "rgba(34, 24, 18, 0.9)",
        railBg: "rgba(24, 17, 13, 0.97)",
        text: "#ede4d6",
        muted: "#b5967e",
        border: "#5a3d2b",
        borderSoft: "#3d2b1f",
        accent: "#b5967e",
        accentStrong: "#b5967e",
        accentText: "#1a1210",
        shadow: "rgba(0, 0, 0, 0.28)"
      }
    },
    cool: {
      light: {
        panelBg: "rgba(248, 251, 255, 0.99)",
        panelBgSoft: "rgba(255, 255, 255, 0.8)",
        railBg: "rgba(248, 251, 255, 0.98)",
        text: "#1e3a5f",
        muted: "#5c84ad",
        border: "#c9d9ee",
        borderSoft: "#dce8f5",
        accent: "#3a6ea8",
        accentStrong: "#1e3a5f",
        accentText: "#f4f7fb",
        shadow: "rgba(30, 58, 95, 0.14)"
      },
      dark: {
        panelBg: "rgba(12, 26, 41, 0.98)",
        panelBgSoft: "rgba(20, 35, 56, 0.9)",
        railBg: "rgba(12, 26, 41, 0.97)",
        text: "#dde9f5",
        muted: "#7aaed4",
        border: "#2d5080",
        borderSoft: "#1e3a5f",
        accent: "#7aaed4",
        accentStrong: "#7aaed4",
        accentText: "#0d1b2a",
        shadow: "rgba(0, 0, 0, 0.28)"
      }
    },
    dark: {
      light: {
        panelBg: "rgba(247, 249, 251, 0.99)",
        panelBgSoft: "rgba(255, 255, 255, 0.8)",
        railBg: "rgba(247, 249, 251, 0.98)",
        text: "#1c2128",
        muted: "#6f8296",
        border: "#d0d8e0",
        borderSoft: "#dde4ea",
        accent: "#5a8a6a",
        accentStrong: "#1c2128",
        accentText: "#e8f4ec",
        shadow: "rgba(28, 33, 40, 0.14)"
      },
      dark: {
        panelBg: "rgba(13, 17, 23, 0.98)",
        panelBgSoft: "rgba(28, 33, 40, 0.9)",
        railBg: "rgba(13, 17, 23, 0.97)",
        text: "#c8d8e8",
        muted: "#7ab890",
        border: "#2d3748",
        borderSoft: "#1c2128",
        accent: "#7ab890",
        accentStrong: "#7ab890",
        accentText: "#0d1117",
        shadow: "rgba(0, 0, 0, 0.3)"
      }
    },
    pastel: {
      light: {
        panelBg: "rgba(250, 247, 255, 0.99)",
        panelBgSoft: "rgba(255, 255, 255, 0.8)",
        railBg: "rgba(250, 247, 255, 0.98)",
        text: "#3a2860",
        muted: "#7b6ba8",
        border: "#ddd6f0",
        borderSoft: "#e8e1f5",
        accent: "#7b6ba8",
        accentStrong: "#4a3870",
        accentText: "#ede8f8",
        shadow: "rgba(74, 56, 112, 0.14)"
      },
      dark: {
        panelBg: "rgba(15, 13, 24, 0.98)",
        panelBgSoft: "rgba(26, 21, 48, 0.9)",
        railBg: "rgba(15, 13, 24, 0.97)",
        text: "#ede8f8",
        muted: "#9a8ac0",
        border: "#2a2040",
        borderSoft: "#1a1530",
        accent: "#9a8ac0",
        accentStrong: "#9a8ac0",
        accentText: "#0f0d18",
        shadow: "rgba(0, 0, 0, 0.28)"
      }
    }
  };

  if (window.top !== window.self) {
    return;
  }

  const isWellbyPage =
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") &&
    window.location.port === "3000";

  if (isWellbyPage) {
    let lastDeliveredMoodAt = 0;
    let lastTaskValue = "";
    let lastTaskListValue = "[]";

    function syncThemeFromStorage() {
      const nextTheme = String(window.localStorage.getItem("wellby-theme") || "warm");
      const nextMode = String(window.localStorage.getItem("wellby-mode") || "light");

      chrome.storage.local.set({
        wellbyExtensionTheme: nextTheme,
        wellbyExtensionMode: nextMode
      });
    }

    function deliverCheckInSync(moodScore, stressLevel, intent, updatedAt) {
      const nextUpdatedAt = Number(updatedAt) || Date.now();
      if (nextUpdatedAt <= lastDeliveredMoodAt) {
        return;
      }

      lastDeliveredMoodAt = nextUpdatedAt;
      window.localStorage.setItem(
        "wellbyExtensionCheckIn",
        JSON.stringify({
          moodScore: Number(moodScore),
          stressLevel: Number(stressLevel),
          intent: intent ?? "open",
          updatedAt: nextUpdatedAt
        })
      );
      window.postMessage(
        {
          source: "wellby-extension",
          type: "MOOD_SYNC",
          moodScore: Number(moodScore),
          stressLevel: Number(stressLevel),
          intent: intent ?? "open",
          updatedAt: nextUpdatedAt
        },
        window.location.origin
      );
    }

    function syncStoredMood() {
      chrome.storage.local
        .get([
          "wellbyExtensionMoodScore",
          "wellbyExtensionStressLevel",
          "wellbyExtensionIntent",
          "wellbyExtensionUpdatedAt"
        ])
        .then((stored) => {
          if (
            !Number.isFinite(Number(stored.wellbyExtensionMoodScore)) &&
            !Number.isFinite(Number(stored.wellbyExtensionStressLevel))
          ) {
            return;
          }

          deliverCheckInSync(
            stored.wellbyExtensionMoodScore,
            stored.wellbyExtensionStressLevel,
            stored.wellbyExtensionIntent,
            stored.wellbyExtensionUpdatedAt
          );
        });
    }

    function syncCurrentTaskFromStorage() {
      const nextTaskValue = String(window.localStorage.getItem("wellbyCurrentTask") || "");
      if (nextTaskValue === lastTaskValue) {
      } else {
        lastTaskValue = nextTaskValue;
        chrome.storage.local.set({
          wellbyCurrentTask: nextTaskValue
        });
      }

      const nextTaskListValue = String(window.localStorage.getItem("wellbyActiveTasks") || "[]");
      if (nextTaskListValue === lastTaskListValue) {
        return;
      }

      lastTaskListValue = nextTaskListValue;

      try {
        const parsedTasks = JSON.parse(nextTaskListValue);
        chrome.storage.local.set({
          wellbyActiveTasks: Array.isArray(parsedTasks) ? parsedTasks : []
        });
      } catch {
        chrome.storage.local.set({
          wellbyActiveTasks: []
        });
      }
    }

    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.source !== "wellby-app") {
        return;
      }

      if (event.data?.type === "SETTINGS_SYNC") {
        chrome.storage.local.set({
          wellbyPromptIntervalMinutes: Number(event.data.extensionPromptInterval) || 5,
          wellbyExtensionTheme: String(event.data.theme || "warm"),
          wellbyExtensionMode: String(event.data.mode || "light")
        });
        return;
      }

      if (event.data?.type === "TASK_SYNC") {
        chrome.storage.local.set({
          wellbyCurrentTask: String(event.data.currentTask || ""),
          wellbyActiveTasks: Array.isArray(event.data.activeTasks) ? event.data.activeTasks : []
        });
      }
    });

    window.addEventListener("focus", syncStoredMood);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        syncStoredMood();
        syncCurrentTaskFromStorage();
        syncThemeFromStorage();
      }
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== "SET_WELLBY_CHECKIN") {
        return false;
      }

      deliverCheckInSync(message.moodScore, message.stressLevel, message.intent, message.updatedAt);

      sendResponse({ ok: true });
      return false;
    });

    syncStoredMood();
    syncCurrentTaskFromStorage();
    syncThemeFromStorage();
    const taskSyncInterval = window.setInterval(syncCurrentTaskFromStorage, 750);
    const themeSyncInterval = window.setInterval(syncThemeFromStorage, 1500);

    return () => {
      window.clearInterval(taskSyncInterval);
      window.clearInterval(themeSyncInterval);
    };
  }

  if (document.getElementById("wellby-floating-launcher")) {
    return;
  }

  const host = document.createElement("div");
  host.id = "wellby-floating-launcher";

  const railButton = document.createElement("button");
  railButton.type = "button";
  railButton.className = "wellby-rail-button";
  railButton.setAttribute("aria-label", "Open Wellby mood check");
  railButton.title = "Wellby mood check";

  const dot = document.createElement("span");
  dot.className = "wellby-launcher-dot";
  dot.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "wellby-launcher-text";
  text.textContent = "Wellby";

  railButton.appendChild(dot);
  railButton.appendChild(text);

  const panel = document.createElement("div");
  panel.className = "wellby-mood-panel";
  panel.hidden = true;

  const panelTitle = document.createElement("div");
  panelTitle.className = "wellby-panel-title";
  panelTitle.textContent = "Quick mood + stress check";

  const panelBody = document.createElement("div");
  panelBody.className = "wellby-panel-body";
  panelBody.textContent = "Share both so Wellby can keep your app check-in in sync.";

  const taskLine = document.createElement("div");
  taskLine.className = "wellby-task-line";

  const taskLabel = document.createElement("span");
  taskLabel.className = "wellby-task-label";
  taskLabel.textContent = "Current task:";

  const taskValue = document.createElement("span");
  taskValue.className = "wellby-task-value";
  taskValue.textContent = "No active task";

  taskLine.appendChild(taskLabel);
  taskLine.appendChild(taskValue);

  const taskPanel = document.createElement("div");
  taskPanel.className = "wellby-task-panel";

  const taskPanelLabel = document.createElement("div");
  taskPanelLabel.className = "wellby-task-panel-label";
  taskPanelLabel.textContent = "Active tasks";

  const taskList = document.createElement("div");
  taskList.className = "wellby-task-list";

  taskPanel.appendChild(taskPanelLabel);
  taskPanel.appendChild(taskList);

  const moodLabel = document.createElement("div");
  moodLabel.className = "wellby-section-label";
  moodLabel.textContent = "Mood";

  const moodHint = document.createElement("div");
  moodHint.className = "wellby-section-hint";
  moodHint.textContent = "1 = low mood, 5 = feeling great";

  const moodRow = document.createElement("div");
  moodRow.className = "wellby-mood-row";

  const stressLabel = document.createElement("div");
  stressLabel.className = "wellby-section-label";
  stressLabel.textContent = "Stress";

  const stressHint = document.createElement("div");
  stressHint.className = "wellby-section-hint";
  stressHint.textContent = "1 = calm, 5 = overloaded";

  const stressRow = document.createElement("div");
  stressRow.className = "wellby-mood-row";

  const feedback = document.createElement("div");
  feedback.className = "wellby-feedback";
  feedback.hidden = true;

  const actionButton = document.createElement("button");
  actionButton.type = "button";
  actionButton.className = "wellby-action-button";
  actionButton.hidden = true;
  actionButton.textContent = "Open Wellby";

  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.className = "wellby-dismiss-button";
  dismissButton.hidden = true;
  dismissButton.textContent = "Close";

  const actionRow = document.createElement("div");
  actionRow.className = "wellby-action-row";
  actionRow.hidden = true;

  let selectedMoodScore = 3;
  let selectedStressLevel = 3;
  let selectedIntent = "open";
  let promptTimerId = null;
  let promptIntervalMinutes = 5;
  let currentTheme = "warm";
  let currentMode = "light";

  function updateTaskValue(nextTask) {
    const trimmedTask = String(nextTask || "").trim();
    taskValue.textContent = trimmedTask || "No active task";
    taskValue.title = trimmedTask || "No active task";
  }

  function updateTaskList(tasks) {
    taskList.replaceChildren();

    const normalizedTasks = Array.isArray(tasks)
      ? tasks.map((task) => String(task || "").trim()).filter(Boolean)
      : [];

    if (!normalizedTasks.length) {
      const emptyState = document.createElement("div");
      emptyState.className = "wellby-task-empty";
      emptyState.textContent = "No active tasks yet.";
      taskList.appendChild(emptyState);
      return;
    }

    normalizedTasks.forEach((task, index) => {
      const item = document.createElement("div");
      item.className = "wellby-task-item";
      item.textContent = `${index + 1}. ${task}`;
      item.title = task;
      taskList.appendChild(item);
    });
  }

  function resolveThemeTokens(theme, mode) {
    const themeConfig = EXTENSION_THEME_TOKENS[theme] || EXTENSION_THEME_TOKENS.warm;
    return themeConfig[mode] || themeConfig.light || EXTENSION_THEME_TOKENS.warm.light;
  }

  function applyTheme(theme, mode) {
    currentTheme = theme || "warm";
    currentMode = mode || "light";
    const tokens = resolveThemeTokens(currentTheme, currentMode);

    host.style.setProperty("--wellby-ext-panel-bg", tokens.panelBg);
    host.style.setProperty("--wellby-ext-panel-bg-soft", tokens.panelBgSoft);
    host.style.setProperty("--wellby-ext-rail-bg", tokens.railBg);
    host.style.setProperty("--wellby-ext-text", tokens.text);
    host.style.setProperty("--wellby-ext-muted", tokens.muted);
    host.style.setProperty("--wellby-ext-border", tokens.border);
    host.style.setProperty("--wellby-ext-border-soft", tokens.borderSoft);
    host.style.setProperty("--wellby-ext-accent", tokens.accent);
    host.style.setProperty("--wellby-ext-accent-strong", tokens.accentStrong);
    host.style.setProperty("--wellby-ext-accent-text", tokens.accentText);
    host.style.setProperty("--wellby-ext-shadow", tokens.shadow);
  }

  function closePanel() {
    panel.hidden = true;
    host.classList.remove("is-open");
  }

  function openPanel() {
    panel.hidden = false;
    host.classList.add("is-open");
  }

  function resetPromptTimer() {
    if (promptTimerId) {
      window.clearTimeout(promptTimerId);
    }

    promptTimerId = window.setTimeout(() => {
      openPanel();
      resetPromptTimer();
    }, promptIntervalMinutes * 60 * 1000);
  }

  function applyPromptInterval(nextIntervalMinutes) {
    promptIntervalMinutes = Math.max(1, Number(nextIntervalMinutes) || 5);
    resetPromptTimer();
  }

  function setFeedback() {
    feedback.hidden = false;
    actionRow.hidden = false;
    actionButton.hidden = false;
    dismissButton.hidden = false;

    if (selectedStressLevel >= 4) {
      feedback.textContent = "We recommend taking a break.";
      actionButton.textContent = "Take a Wellby break";
      actionButton.dataset.intent = "break";
      selectedIntent = "break";
      return;
    }

    if (selectedStressLevel === 3 || selectedMoodScore <= 2) {
      feedback.textContent = "A short reset might help if this keeps building.";
      actionButton.textContent = "Open Wellby";
      actionButton.dataset.intent = "check-in";
      selectedIntent = "check-in";
      return;
    }

    feedback.textContent = "You seem steady. Keep going if things still feel manageable.";
    actionButton.textContent = "Open Wellby";
    actionButton.dataset.intent = "open";
    selectedIntent = "open";
  }

  function createScaleButton(level, row, applySelection, title) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "wellby-mood-option";
    button.textContent = String(level);
    button.title = title;
    if (level === 3) {
      button.classList.add("is-selected");
    }
    button.addEventListener("click", () => {
      row.querySelectorAll(".wellby-mood-option").forEach((buttonElement) => {
        buttonElement.classList.remove("is-selected");
      });
      button.classList.add("is-selected");
      applySelection(level);
      setFeedback();
      chrome.runtime.sendMessage({
        type: "SYNC_WELLBY_CHECKIN",
        moodScore: selectedMoodScore,
        stressLevel: selectedStressLevel,
        intent: selectedIntent
      });
    });
    return button;
  }

  [1, 2, 3, 4, 5].forEach((level) => {
    moodRow.appendChild(
      createScaleButton(
        level,
        moodRow,
        (selectedLevel) => {
          selectedMoodScore = selectedLevel;
        },
        `Mood level ${level}`
      )
    );

    stressRow.appendChild(
      createScaleButton(
        level,
        stressRow,
        (selectedLevel) => {
          selectedStressLevel = selectedLevel;
        },
        `Stress level ${level}`
      )
    );
  });
  setFeedback();

  railButton.addEventListener("click", () => {
    if (panel.hidden) {
      openPanel();
    } else {
      closePanel();
    }
  });

  actionButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({
      type: "OPEN_WELLBY",
      moodScore: selectedMoodScore,
      stressLevel: selectedStressLevel,
      intent: selectedIntent
    });
  });

  dismissButton.addEventListener("click", () => {
    closePanel();
    resetPromptTimer();
  });

  document.addEventListener("click", (event) => {
    if (!host.contains(event.target)) {
      closePanel();
    }
  });

  chrome.storage.local
    .get([
      "wellbyPromptIntervalMinutes",
      "wellbyCurrentTask",
      "wellbyActiveTasks",
      "wellbyExtensionTheme",
      "wellbyExtensionMode"
    ])
    .then((stored) => {
      applyPromptInterval(stored.wellbyPromptIntervalMinutes);
      updateTaskValue(stored.wellbyCurrentTask);
      updateTaskList(stored.wellbyActiveTasks);
      applyTheme(stored.wellbyExtensionTheme, stored.wellbyExtensionMode);
    });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes.wellbyPromptIntervalMinutes) {
      applyPromptInterval(changes.wellbyPromptIntervalMinutes.newValue);
    }

    if (changes.wellbyCurrentTask) {
      updateTaskValue(changes.wellbyCurrentTask.newValue);
    }

    if (changes.wellbyActiveTasks) {
      updateTaskList(changes.wellbyActiveTasks.newValue);
    }

    if (changes.wellbyExtensionTheme || changes.wellbyExtensionMode) {
      applyTheme(
        changes.wellbyExtensionTheme ? changes.wellbyExtensionTheme.newValue : currentTheme,
        changes.wellbyExtensionMode ? changes.wellbyExtensionMode.newValue : currentMode
      );
    }
  });

  panel.appendChild(panelTitle);
  panel.appendChild(panelBody);
  panel.appendChild(taskLine);
  panel.appendChild(taskPanel);
  panel.appendChild(moodLabel);
  panel.appendChild(moodHint);
  panel.appendChild(moodRow);
  panel.appendChild(stressLabel);
  panel.appendChild(stressHint);
  panel.appendChild(stressRow);
  panel.appendChild(feedback);
  actionRow.appendChild(actionButton);
  actionRow.appendChild(dismissButton);
  panel.appendChild(actionRow);
  host.appendChild(railButton);
  host.appendChild(panel);
  document.documentElement.appendChild(host);
})();
