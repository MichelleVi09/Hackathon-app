export const STORAGE_KEYS = {
  profile: "wellby.profile",
  history: "wellby.burnHistory",
  sessions: "wellby.sessions",
  fatigueOptIn: "wellby.fatigueOptIn",
  breakLogs: "wellby.breakLogs",
  gameScores: "wellby.gameScores",
  extensionPromptInterval: "wellby.extensionPromptInterval"
  lastLoginName: "wellby.lastLoginName",
  plannerTasks: "wellby.plannerTasks",
  dashboardSections: "wellby.dashboardSections"
};

export const DEFAULT_DASHBOARD_SECTIONS = {
  planner: true,
  sessionStats: true,
  moodCheckIn: true,
  burnoutMeter: true,
  breakRecommendation: true,
  weeklyPlanner: true
};

export const GAME_OPTIONS = [
  { id: "snake", label: "Snake", emoji: "S" },
  { id: "chess", label: "Chess", emoji: "C" },
  { id: "tictactoe", label: "Tic Tac Toe", emoji: "T" },
  { id: "uno", label: "UNO", emoji: "U" }
];

export const SENIORITY_OPTIONS = [
  { value: 0, label: "Intern / Early Career" },
  { value: 1, label: "Junior" },
  { value: 2, label: "Mid-level" },
  { value: 3, label: "Senior" },
  { value: 4, label: "Lead / Staff" },
  { value: 5, label: "Director+" }
];

export const EXTENSION_PROMPT_INTERVAL_OPTIONS = [
  { value: 5, label: "Every 5 minutes" },
  { value: 10, label: "Every 10 minutes" },
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" }
];
