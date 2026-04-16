import { useContext, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext.jsx";
import LeafIcon from "./LeafIcon.jsx";
import { hexToRgba } from "../lib/color.js";
import { NATURE_BACKGROUNDS, pickRandomBackground } from "../lib/sceneBackgrounds.js";

export default function WelcomePage({
  profile,
  defaultName = "",
  errorMessage = "",
  onLogin,
  onCreateProfile
}) {
  const { colors } = useContext(ThemeContext);
  const [name, setName] = useState(defaultName);
  const [password, setPassword] = useState("0000");
  const backgroundImage = useMemo(() => pickRandomBackground(NATURE_BACKGROUNDS), []);

  function submit(event) {
    event.preventDefault();
    onLogin(name, password);
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden font-body"
      style={{ background: colors.dashBg, color: colors.secondaryText }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${backgroundImage}")` }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(colors.sidebarBg, 0.44)}, ${hexToRgba(colors.dashBg, 0.18)} 42%, ${hexToRgba(colors.sidebarBg, 0.52)})`
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at top left, ${hexToRgba(colors.cardBg, 0.24)}, transparent 32%), radial-gradient(circle at bottom right, ${hexToRgba(colors.primary, 0.2)}, transparent 28%)`
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-xl rounded-[36px] p-8 sm:p-10"
          style={{
            background: hexToRgba(colors.cardBg, 0.74),
            color: colors.secondaryText,
            border: `1px solid ${hexToRgba(colors.cardBorder, 0.44)}`,
            backdropFilter: "blur(18px)",
            boxShadow: `0 30px 80px ${hexToRgba(colors.sidebarBg, 0.2)}`
          }}
        >
          <div className="flex items-center gap-4">
            <LeafIcon className="h-12 w-12" primary={colors.primary} secondary={colors.secondary} />
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.muted }}>
                Wellby
              </p>
              <h1 className="font-display text-4xl leading-tight">
                {profile ? `Welcome back, ${profile.name}.` : "A calm start to your day."}
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-lg text-sm leading-7" style={{ color: colors.muted }}>
            {profile
              ? "Sign in to continue into your planner, burnout guide, and break flow."
              : "Create your Wellby workspace to start tracking task timing, fatigue, and recovery."}
          </p>

          {profile ? (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={profile.name}
                  className="w-full rounded-2xl border-0 px-4 py-3 text-base outline-none"
                  style={{
                    background: hexToRgba(colors.secondary, 0.82),
                    color: colors.secondaryText,
                    boxShadow: `inset 0 1px 0 ${hexToRgba(colors.cardBg, 0.58)}`
                  }}
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="0000"
                  className="w-full rounded-2xl border-0 px-4 py-3 text-base outline-none"
                  style={{
                    background: hexToRgba(colors.secondary, 0.82),
                    color: colors.secondaryText,
                    boxShadow: `inset 0 1px 0 ${hexToRgba(colors.cardBg, 0.58)}`
                  }}
                />
              </label>

              {errorMessage ? (
                <div
                  className="rounded-2xl px-4 py-3 text-sm font-semibold"
                  style={{
                    background: hexToRgba(colors.pillDangerBg, 0.74),
                    color: colors.pillDangerText,
                    border: `1px solid ${hexToRgba(colors.pillDangerBorder, 0.74)}`
                  }}
                >
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  className="wellby-button rounded-full px-6 py-3 text-sm font-bold"
                  style={{
                    background: colors.primary,
                    color: colors.primaryText,
                    boxShadow: `0 16px 34px ${hexToRgba(colors.primary, 0.22)}`
                  }}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(profile.name);
                    setPassword("0000");
                    onLogin(profile.name, "0000");
                  }}
                  className="wellby-button rounded-full px-6 py-3 text-sm font-bold"
                  style={{
                    background: hexToRgba(colors.secondary, 0.82),
                    color: colors.secondaryText,
                    border: `1px solid ${hexToRgba(colors.cardBorder, 0.6)}`
                  }}
                >
                  Use saved details
                </button>
              </div>

              <p className="pt-1 text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: colors.muted }}>
                Default password: 0000
              </p>
            </form>
          ) : (
            <div className="mt-8">
              <button
                type="button"
                onClick={onCreateProfile}
                className="wellby-button rounded-full px-6 py-3 text-sm font-bold"
                style={{
                  background: colors.primary,
                  color: colors.primaryText,
                  boxShadow: `0 16px 34px ${hexToRgba(colors.primary, 0.22)}`
                }}
              >
                Create your Wellby workspace
              </button>
            </div>
          )}

        </motion.section>
      </div>
      <footer
        className="fixed inset-x-0 bottom-0 top-auto z-[70] px-4 py-3 text-center text-xs font-semibold"
        style={{ background: hexToRgba(colors.sidebarBg, 0.92), color: colors.wordmark, backdropFilter: "blur(16px)" }}
      >
        Wellby is a wellness companion, not a substitute for professional mental health care.
      </footer>
    </div>
  );
}
