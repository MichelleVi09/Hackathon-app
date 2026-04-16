import React,{ useContext } from "react";
import { ThemeContext } from "../context/ThemeContext.jsx";
import LeafIcon from "./LeafIcon.jsx";
import { EXTENSION_PROMPT_INTERVAL_OPTIONS } from "../lib/constants.js";

const THEME_OPTIONS = [
  { id: "warm", label: "Warm", description: "Soft browns and caramels - cozy and grounding", color: "#B5967E" },
  { id: "cool", label: "Cool", description: "Misty blues and frosts - calm and focused", color: "#7AAED4" },
  { id: "dark", label: "Dark", description: "Deep slates and sage greens - easy on the eyes at night", color: "#7AB890" },
  { id: "pastel", label: "Pastel", description: "Muted lavenders and sage - gentle and soothing", color: "#9A8AC0" }
];

export default function SettingsPage({
  fatigueOptIn,
  onToggleFatigue,
  extensionPromptInterval,
  onSetExtensionPromptInterval,
  mode,
  onToggleMode,
  activeTheme,
  onSetTheme,
  onBack
}) {
  const { colors } = useContext(ThemeContext);

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8" style={{ background: colors.dashBg, color: colors.secondaryText }}>
      <div className="mx-auto max-w-5xl pb-20">
        <header
          className="mb-6 flex flex-col gap-4 rounded-[32px] p-6 shadow-glow lg:flex-row lg:items-center lg:justify-between"
          style={{ background: colors.sidebarBg, color: colors.wordmark, border: `1px solid ${colors.sidebarBorder}` }}
        >
          <div className="flex items-center gap-4">
            <LeafIcon className="h-12 w-12" primary={colors.primary} secondary={colors.secondary} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.navText }}>Settings</p>
              <h1 className="font-display text-4xl">Wellby preferences</h1>
            </div>
          </div>
          <button
            onClick={onBack}
            className="rounded-full px-5 py-3 text-sm font-bold"
            style={{ background: colors.primary, color: colors.primaryText }}
          >
            Back to dashboard
          </button>
        </header>

        <div className="grid gap-6">
          <section className="rounded-[32px] p-6 shadow-lg" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
            <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>Appearance</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {THEME_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSetTheme(item.id)}
                  className="rounded-[22px] border p-4 text-left"
                  style={{
                    background: activeTheme === item.id ? colors.navActiveBg : colors.cardBg,
                    borderColor: activeTheme === item.id ? colors.navActiveBorder : colors.cardBorder,
                    color: activeTheme === item.id ? colors.navActive : colors.secondaryText
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 rounded-full" style={{ background: item.color }} />
                      <span className="font-bold">{item.label}</span>
                    </div>
                    {activeTheme === item.id ? <span className="text-sm font-bold">Check</span> : null}
                  </div>
                  <div className="mt-2 text-sm" style={{ color: activeTheme === item.id ? colors.navText : colors.muted }}>
                    {item.description}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={onToggleMode}
              className="mt-5 rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: colors.breakBtn, color: colors.breakBtnText }}
            >
              Switch to {mode === "light" ? "dark" : "light"} mode
            </button>
          </section>

          <section className="rounded-[32px] p-6 shadow-lg" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
            <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>Wellbeing Sensors</p>
            <div className="mt-4 flex items-start justify-between gap-4 rounded-[24px] p-4" style={{ background: colors.secondary }}>
              <div>
                <h2 className="font-bold">Let Wellby watch for fatigue via webcam</h2>
                <p className="mt-2 text-sm leading-7" style={{ color: colors.muted }}>
                  Your camera never leaves your device. Wellby sees nothing - your computer does all the work locally.
                </p>
              </div>
              <button
                onClick={onToggleFatigue}
                className="rounded-full px-4 py-2 text-sm font-bold"
                style={{ background: fatigueOptIn ? colors.primary : colors.sidebarBg, color: fatigueOptIn ? colors.primaryText : colors.wordmark }}
              >
                {fatigueOptIn ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="mt-4 rounded-[24px] p-4" style={{ background: colors.secondary }}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-bold">Browser check-in timer</h2>
                  <p className="mt-2 text-sm leading-7" style={{ color: colors.muted }}>
                    Pick how often the tiny Wellby tab should expand on other websites and ask for a stress check-in.
                  </p>
                </div>
                <div
                  className="rounded-full px-4 py-2 text-sm font-bold"
                  style={{ background: colors.sidebarBg, color: colors.wordmark }}
                >
                  {extensionPromptInterval} min
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {EXTENSION_PROMPT_INTERVAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => onSetExtensionPromptInterval(option.value)}
                    className="rounded-[22px] border p-4 text-left"
                    style={{
                      background:
                        extensionPromptInterval === option.value ? colors.navActiveBg : colors.cardBg,
                      borderColor:
                        extensionPromptInterval === option.value ? colors.navActiveBorder : colors.cardBorder,
                      color:
                        extensionPromptInterval === option.value ? colors.navActive : colors.secondaryText
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold">{option.label}</span>
                      {extensionPromptInterval === option.value ? (
                        <span className="text-sm font-bold">Selected</span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      <footer
        className="fixed bottom-0 left-0 right-0 px-4 py-3 text-center text-xs font-semibold"
        style={{ background: colors.sidebarBg, color: colors.wordmark }}
      >
        Wellby is a wellness companion, not a substitute for professional mental health care.
      </footer>
    </div>
  );
}
