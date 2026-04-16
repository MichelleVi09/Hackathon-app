import { useContext, useState } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext.jsx";
import LeafIcon from "./LeafIcon.jsx";
import { GAME_OPTIONS, SENIORITY_OPTIONS } from "../lib/constants.js";
import { hexToRgba } from "../lib/color.js";

export default function OnboardingFlow({ onComplete }) {
  const { colors } = useContext(ThemeContext);
  const [form, setForm] = useState({
    name: "",
    workHours: 8,
    setup: "hybrid",
    seniority: 2,
    favoriteGame: "snake"
  });

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      return;
    }
    onComplete({ ...form, name: form.name.trim() });
  }

  function redirectTo(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const landingButtons = [
    { label: "Start setup", target: "wellby-onboarding-form" },
    { label: "Pick a break game", target: "favorite-game-field" },
    { label: "Privacy details", target: "privacy-note" }
  ];

  const featureLinks = [
    { text: "Adaptive sessions that learn your natural pace", target: "work-hours-field" },
    { text: "Warm burnout alerts with human-feeling snoozes", target: "name-field" },
    { text: "Mindful break mode with breathing and games", target: "favorite-game-field" },
    { text: "Private fatigue detection that stays on your device", target: "privacy-note" }
  ];

  return (
    <div
      className="wellby-page-shell min-h-screen px-6 py-10 font-body"
      style={{ background: colors.dashBg, color: colors.secondaryText }}
    >
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="wellby-glass wellby-accent-ring rounded-[36px] p-8 backdrop-blur"
          style={{ boxShadow: `0 24px 60px ${hexToRgba(colors.sidebarBg, 0.1)}` }}
        >
          <div className="mb-8 flex items-center gap-4">
            <LeafIcon className="h-14 w-14" primary={colors.primary} secondary={colors.secondary} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.muted }}>
                Wellby
              </p>
              <h1 className="font-display text-5xl leading-tight">Work well. Rest well. Be well.</h1>
            </div>
          </div>
          <p className="max-w-xl text-lg leading-8" style={{ color: colors.muted }}>
            A friendly AI wellbeing companion for tech workers. Wellby learns your flow, watches for
            burnout risk, and makes breaks feel restorative instead of guilty.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {landingButtons.map((button) => (
              <button
                key={button.label}
                type="button"
                onClick={() => redirectTo(button.target)}
                className="wellby-button rounded-full px-5 py-3 text-sm font-bold"
                style={{
                  background:
                    button.target === "wellby-onboarding-form" ? colors.primary : colors.secondary,
                  color:
                    button.target === "wellby-onboarding-form"
                      ? colors.primaryText
                      : colors.secondaryText,
                  border: `1px solid ${
                    button.target === "wellby-onboarding-form" ? colors.primary : colors.cardBorder
                  }`,
                  boxShadow:
                    button.target === "wellby-onboarding-form"
                      ? `0 16px 36px ${hexToRgba(colors.primary, 0.2)}`
                      : "none"
                }}
              >
                {button.label}
              </button>
            ))}
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {featureLinks.map((item) => (
              <motion.button
                key={item.text}
                type="button"
                onClick={() => redirectTo(item.target)}
                whileHover={{ y: -4 }}
                className="wellby-glass-soft rounded-[24px] p-4 text-left text-sm font-semibold"
                style={{
                  color: colors.secondaryText,
                  boxShadow: `0 14px 32px ${hexToRgba(colors.sidebarBg, 0.06)}`
                }}
              >
                {item.text}
              </motion.button>
            ))}
          </div>
        </motion.section>

        <motion.form
          id="wellby-onboarding-form"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onSubmit={submit}
          className="wellby-glass wellby-accent-ring rounded-[36px] p-8"
          style={{ boxShadow: `0 24px 60px ${hexToRgba(colors.sidebarBg, 0.1)}` }}
        >
          <h2 className="font-display text-3xl">Let's make Wellby yours</h2>
          <div className="mt-6 space-y-5">
            <label className="block" id="name-field">
              <span className="mb-2 block text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Name
              </span>
              <input
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Alex"
                className="w-full rounded-2xl border-0 px-4 py-3 text-lg outline-none"
                style={{
                  background: hexToRgba(colors.secondary, 0.72),
                  color: colors.secondaryText,
                  boxShadow: `inset 0 1px 0 ${hexToRgba(colors.cardBg, 0.4)}`
                }}
              />
            </label>

            <label className="block" id="work-hours-field">
              <span className="mb-2 block text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Typical Daily Work Hours
              </span>
              <input
                type="range"
                min="4"
                max="12"
                value={form.workHours}
                onChange={(event) => updateField("workHours", Number(event.target.value))}
                className="w-full"
                style={{ accentColor: colors.primary }}
              />
              <p className="mt-2 text-sm font-semibold" style={{ color: colors.muted }}>
                {form.workHours} hours
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Work Setup
              </span>
              <select
                value={form.setup}
                onChange={(event) => updateField("setup", event.target.value)}
                className="w-full rounded-2xl border-0 px-4 py-3 outline-none"
                style={{
                  background: hexToRgba(colors.secondary, 0.72),
                  color: colors.secondaryText
                }}
              >
                <option value="wfh">WFH</option>
                <option value="office">Office</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Job Seniority
              </span>
              <select
                value={form.seniority}
                onChange={(event) => updateField("seniority", Number(event.target.value))}
                className="w-full rounded-2xl border-0 px-4 py-3 outline-none"
                style={{
                  background: hexToRgba(colors.secondary, 0.72),
                  color: colors.secondaryText
                }}
              >
                {SENIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <fieldset id="favorite-game-field">
              <legend className="mb-2 block text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                Favorite Break Game
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {GAME_OPTIONS.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => updateField("favoriteGame", game.id)}
                    className="wellby-button rounded-2xl px-4 py-4 text-left"
                    style={{
                      background: form.favoriteGame === game.id ? colors.primary : colors.secondary,
                      color:
                        form.favoriteGame === game.id ? colors.primaryText : colors.secondaryText,
                      border: `1px solid ${
                        form.favoriteGame === game.id ? colors.primary : colors.cardBorder
                      }`,
                      boxShadow:
                        form.favoriteGame === game.id
                          ? `0 16px 34px ${hexToRgba(colors.primary, 0.18)}`
                          : "none"
                    }}
                  >
                    <div className="text-2xl">{game.emoji}</div>
                    <div className="mt-2 font-bold">{game.label}</div>
                  </button>
                ))}
              </div>
            </fieldset>

            <div
              id="privacy-note"
              className="wellby-glass-soft rounded-[24px] p-4 text-sm leading-6"
              style={{
                color: colors.secondaryText
              }}
            >
              If you enable webcam fatigue detection later, processing stays on your device. Nothing
              leaves your machine.
            </div>
          </div>

          <button
            type="submit"
            className="wellby-button mt-8 w-full rounded-full px-6 py-4 font-bold"
            style={{
              background: colors.primary,
              color: colors.primaryText,
              boxShadow: `0 18px 38px ${hexToRgba(colors.primary, 0.22)}`
            }}
          >
            Start my first Wellby session
          </button>
        </motion.form>
      </div>
    </div>
  );
}
