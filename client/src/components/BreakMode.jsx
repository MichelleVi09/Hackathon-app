import { useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { GAME_OPTIONS } from "../lib/constants.js";
import { hexToRgba } from "../lib/color.js";
import { NATURE_BACKGROUNDS, OCEAN_BACKGROUNDS, pickRandomBackground } from "../lib/sceneBackgrounds.js";
import LeafIcon from "./LeafIcon.jsx";
import SnakeGame from "./games/SnakeGame.jsx";
import TicTacToeGame from "./games/TicTacToeGame.jsx";
import ChessGame from "./games/ChessGame.jsx";
import UnoGame from "./games/UnoGame.jsx";

const GAME_COMPONENTS = {
  snake: SnakeGame,
  tictactoe: TicTacToeGame,
  chess: ChessGame,
  uno: UnoGame
};

const LOUNGE_GLOWS = [
  { id: "glow-a", top: "10%", left: "8%", size: 220, color: "#f7f0c8", duration: 14 },
  { id: "glow-b", top: "22%", right: "10%", size: 260, color: "#cdeccb", duration: 18 },
  { id: "glow-c", bottom: "16%", left: "16%", size: 240, color: "#b8daf7", duration: 16 },
  { id: "glow-d", bottom: "8%", right: "14%", size: 210, color: "#f4d7b8", duration: 20 }
];

const LOUNGE_SPARKLES = Array.from({ length: 16 }, (_, index) => ({
  id: `spark-${index}`,
  left: 6 + ((index * 91) % 88),
  top: 8 + ((index * 53) % 76),
  delay: (index % 5) * 0.45,
  duration: 4 + (index % 4)
}));

function AmbientParticles({ mode, colors }) {
  const particles = useMemo(
    () =>
      Array.from({ length: mode === "ocean" ? 18 : 14 }, (_, index) => ({
        id: index,
        left: 4 + ((index * 97) % 88),
        size: mode === "ocean" ? 8 + (index % 5) * 5 : 18 + (index % 4) * 10,
        delay: (index % 6) * 0.6,
        duration: mode === "ocean" ? 10 + (index % 4) * 2.5 : 11 + (index % 5) * 2
      })),
    [mode]
  );

  return particles.map((particle) =>
    mode === "ocean" ? (
      <motion.span
        key={`bubble-${particle.id}`}
        className="absolute rounded-full border"
        initial={{ y: "105vh", opacity: 0, x: 0 }}
        animate={{ y: "-18vh", opacity: [0, 0.45, 0.18, 0], x: [0, -10, 8, -6, 0] }}
        transition={{
          duration: particle.duration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: particle.delay
        }}
        style={{
          left: `${particle.left}%`,
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          borderColor: hexToRgba("#e6fbff", 0.6),
          background: hexToRgba("#f2ffff", 0.1)
        }}
      />
    ) : (
      <motion.span
        key={`leaf-${particle.id}`}
        className="absolute block"
        initial={{ y: "-12vh", opacity: 0, rotate: -12, x: 0 }}
        animate={{
          y: "108vh",
          opacity: [0, 0.9, 0.82, 0],
          rotate: [-12, 14, -18, 10],
          x: [0, 18, -22, 14, 0]
        }}
        transition={{
          duration: particle.duration,
          repeat: Infinity,
          ease: "linear",
          delay: particle.delay
        }}
        style={{
          left: `${particle.left}%`,
          width: `${particle.size}px`,
          height: `${Math.round(particle.size * 0.72)}px`,
          background: `linear-gradient(140deg, ${hexToRgba("#dff3c2", 0.96)}, ${hexToRgba("#6aa760", 0.88)})`,
          borderRadius: "70% 0 70% 0",
          boxShadow: `0 6px 14px ${hexToRgba(colors.sidebarBg, 0.14)}`
        }}
      />
    )
  );
}

export default function BreakMode({ initialGame, onClose, noSnooze, reason, beforeBurnRate, afterBurnRate }) {
  const { colors } = useContext(ThemeContext);
  const [phase, setPhase] = useState("mindful");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [selectedGame, setSelectedGame] = useState(initialGame ?? "snake");
  const [mindfulBackgroundMode, setMindfulBackgroundMode] = useState("nature");
  const [natureBackground] = useState(() => pickRandomBackground(NATURE_BACKGROUNDS));
  const [oceanBackground] = useState(() => pickRandomBackground(OCEAN_BACKGROUNDS));
  const ActiveGame = useMemo(() => GAME_COMPONENTS[selectedGame], [selectedGame]);
  const isGames = phase === "games";

  useEffect(() => {
    if (phase !== "mindful") {
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setPhase("games");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const breathStage = useMemo(() => {
    const elapsed = 60 - secondsLeft;
    const cycle = elapsed % 19;
    if (cycle < 4) return { label: "Inhale for 4", scale: 1.08 };
    if (cycle < 11) return { label: "Hold for 7", scale: 1.18 };
    return { label: "Exhale for 8", scale: 0.9 };
  }, [secondsLeft]);

  const breakMessage =
    reason === "manual"
      ? "You chose to pause before things piled up. Let's use the time well."
      : noSnooze
        ? "Wellby is stepping in - your burn rate is high. Let's take a proper break."
        : "You've snoozed twice - Wellby thinks it's really time now. Let's recharge!";

  const mindfulBackgroundImage = mindfulBackgroundMode === "ocean" ? oceanBackground : natureBackground;
  const isMindful = phase === "mindful";

  return (
    <div
      className="wellby-page-shell relative min-h-screen overflow-x-hidden overflow-y-auto"
      style={{
        background: isMindful
          ? colors.dashBg
          : isGames
            ? `linear-gradient(180deg, ${hexToRgba(colors.dashBg, 0.98)}, ${hexToRgba(colors.secondary, 0.7)} 42%, ${colors.dashBg})`
            : `linear-gradient(180deg, ${hexToRgba(colors.dashBg, 0.94)}, ${colors.dashBg})`,
        color: colors.secondaryText
      }}
    >
      {isMindful ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${mindfulBackgroundImage}")` }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                mindfulBackgroundMode === "ocean"
                  ? `linear-gradient(180deg, ${hexToRgba("#05243d", 0.26)}, ${hexToRgba("#031523", 0.64)})`
                  : `linear-gradient(150deg, ${hexToRgba(colors.sidebarBg, 0.4)}, ${hexToRgba(colors.dashBg, 0.12)} 40%, ${hexToRgba(colors.sidebarBg, 0.38)})`
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                mindfulBackgroundMode === "ocean"
                  ? `radial-gradient(circle at top left, ${hexToRgba("#dffcff", 0.18)}, transparent 30%), radial-gradient(circle at bottom right, ${hexToRgba("#58c9ec", 0.16)}, transparent 26%)`
                  : `radial-gradient(circle at top left, ${hexToRgba(colors.cardBg, 0.22)}, transparent 28%), radial-gradient(circle at bottom right, ${hexToRgba(colors.primary, 0.18)}, transparent 24%)`
            }}
          />
          <AmbientParticles mode={mindfulBackgroundMode} colors={colors} />
        </>
      ) : null}

      {isGames ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at top, ${hexToRgba(colors.cardBg, 0.68)}, transparent 38%), linear-gradient(180deg, ${hexToRgba(colors.secondary, 0.66)}, ${hexToRgba(colors.dashBg, 0.92)} 52%, ${colors.dashBg})`
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(140deg, ${hexToRgba(colors.primary, 0.12)}, transparent 24%, ${hexToRgba(colors.burnWarn, 0.09)} 56%, transparent 80%)`
            }}
          />
          {LOUNGE_GLOWS.map((glow) => (
            <motion.span
              key={glow.id}
              className="absolute rounded-full blur-3xl"
              animate={{ y: [0, -18, 0], x: [0, 12, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: glow.duration, repeat: Infinity, ease: "easeInOut" }}
              style={{
                ...("top" in glow ? { top: glow.top } : { bottom: glow.bottom }),
                ...("left" in glow ? { left: glow.left } : { right: glow.right }),
                width: glow.size,
                height: glow.size,
                background: hexToRgba(glow.color, 0.34)
              }}
            />
          ))}
          {LOUNGE_SPARKLES.map((sparkle) => (
            <motion.span
              key={sparkle.id}
              className="absolute rounded-full"
              animate={{ opacity: [0.2, 0.75, 0.2], scale: [0.8, 1.25, 0.8] }}
              transition={{
                duration: sparkle.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: sparkle.delay
              }}
              style={{
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
                width: 6,
                height: 6,
                background: hexToRgba(colors.cardBg, 0.72),
                boxShadow: `0 0 14px ${hexToRgba(colors.cardBg, 0.58)}`
              }}
            />
          ))}
        </>
      ) : null}

      <div className={`relative z-10 px-4 pt-8 sm:px-8 ${isMindful ? "pb-24" : "pb-28"}`}>
        {phase === "mindful" ? (
          <div className="flex min-h-[calc(100vh-6rem)] flex-col justify-between">
            <div className="mx-auto flex w-full max-w-6xl justify-end">
              <div
                className="flex flex-wrap gap-2 rounded-full px-2 py-2"
                style={{ background: hexToRgba("#ffffff", 0.12), backdropFilter: "blur(16px)" }}
              >
                <button
                  onClick={() => setMindfulBackgroundMode("nature")}
                  className="wellby-button rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]"
                  style={{
                    background:
                      mindfulBackgroundMode === "nature"
                        ? hexToRgba(colors.cardBg, 0.92)
                        : hexToRgba(colors.cardBg, 0.18),
                    color: mindfulBackgroundMode === "nature" ? colors.secondaryText : "#f5fff1",
                    border: `1px solid ${hexToRgba(colors.cardBg, 0.36)}`
                  }}
                >
                  Green nature
                </button>
                <button
                  onClick={() => setMindfulBackgroundMode("ocean")}
                  className="wellby-button rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]"
                  style={{
                    background:
                      mindfulBackgroundMode === "ocean"
                        ? hexToRgba(colors.cardBg, 0.92)
                        : hexToRgba(colors.cardBg, 0.18),
                    color: mindfulBackgroundMode === "ocean" ? colors.secondaryText : "#f5fff1",
                    border: `1px solid ${hexToRgba(colors.cardBg, 0.36)}`
                  }}
                >
                  Under the ocean
                </button>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center py-8">
              <div
                className="w-full rounded-[40px] px-6 py-8 text-center sm:px-10 sm:py-12"
                style={{ background: hexToRgba("#071723", 0.2), backdropFilter: "blur(10px)" }}
              >
                <div className="flex items-center justify-center gap-3">
                  <LeafIcon className="h-8 w-8" primary={colors.primary} secondary={colors.secondary} />
                  <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: "#f7fff4" }}>
                    Mindful Moment
                  </p>
                </div>

                <h2 className="mt-8 font-display text-5xl text-white">Let's take a breath together</h2>
                <p className="mx-auto mt-4 max-w-2xl text-lg leading-8" style={{ color: hexToRgba("#ffffff", 0.9) }}>
                  {breakMessage}
                </p>

                <motion.div
                  animate={{ scale: breathStage.scale }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                  className="mx-auto mt-10 flex h-56 w-56 items-center justify-center rounded-full text-center"
                  style={{
                    background: `radial-gradient(circle, ${hexToRgba(colors.breakRing, 0.92)}, ${hexToRgba(colors.primary, 0.32)})`,
                    boxShadow: `0 0 80px ${hexToRgba(colors.primary, 0.16)}`
                  }}
                >
                  <div
                    className="flex h-40 w-40 items-center justify-center rounded-full"
                    style={{
                      background: `linear-gradient(160deg, ${hexToRgba(colors.breakInner, 0.92)}, ${hexToRgba(colors.cardBg, 0.78)})`,
                      border: `1px solid ${hexToRgba(colors.cardBorder, 0.42)}`
                    }}
                  >
                    <div>
                      <div className="text-2xl font-extrabold" style={{ color: colors.primary }}>
                        {secondsLeft}s
                      </div>
                      <div className="mt-2 font-bold">{breathStage.label}</div>
                    </div>
                  </div>
                </motion.div>

                <div
                  className="mx-auto mt-10 h-4 max-w-2xl overflow-hidden rounded-full"
                  style={{ background: hexToRgba(colors.cardBg, 0.38) }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${((60 - secondsLeft) / 60) * 100}%`,
                      background: `linear-gradient(90deg, ${colors.primary}, ${hexToRgba(colors.primary, 0.8)})`
                    }}
                  />
                </div>

                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPhase("games")}
                    className="wellby-button rounded-full px-6 py-3 font-bold"
                    style={{
                      background: colors.breakBtn,
                      color: colors.breakBtnText,
                      boxShadow: `0 16px 34px ${hexToRgba(colors.breakBtn, 0.18)}`
                    }}
                  >
                    Start break
                  </button>
                  <button
                    onClick={() => setPhase("games")}
                    className="wellby-button rounded-full border px-6 py-3 font-bold"
                    style={{
                      borderColor: hexToRgba(colors.cardBg, 0.48),
                      color: "#f8fff6",
                      background: hexToRgba(colors.cardBg, 0.14)
                    }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : phase === "games" ? (
          <div className="mx-auto max-w-6xl space-y-6">
            <div
              className="overflow-hidden rounded-[40px] p-6"
              style={{
                background: `linear-gradient(145deg, ${hexToRgba(colors.cardBg, 0.78)}, ${hexToRgba(colors.secondary, 0.58)})`,
                border: `1px solid ${hexToRgba(colors.cardBorder, 0.36)}`,
                backdropFilter: "blur(16px)",
                boxShadow: `0 24px 60px ${hexToRgba(colors.sidebarBg, 0.08)}`
              }}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.muted }}>
                    Wellby Game Lounge
                  </p>
                  <h2 className="mt-2 font-display text-4xl sm:text-5xl">A softer place to drift for a bit</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: colors.muted }}>
                    {breakMessage}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="rounded-full px-4 py-2 text-sm font-bold"
                    style={{
                      background: hexToRgba(colors.cardBg, 0.72),
                      color: colors.secondaryText,
                      border: `1px solid ${hexToRgba(colors.cardBorder, 0.42)}`
                    }}
                  >
                    4 games ready
                  </div>
                  <div
                    className="rounded-full px-4 py-2 text-sm font-bold"
                    style={{
                      background: hexToRgba(colors.primary, 0.12),
                      color: colors.primary,
                      border: `1px solid ${hexToRgba(colors.primary, 0.26)}`
                    }}
                  >
                    Gentle break mode
                  </div>
                  <button
                    onClick={() => setPhase("complete")}
                    className="wellby-button rounded-full px-5 py-3 font-bold"
                    style={{
                      background: colors.breakBtn,
                      color: colors.breakBtnText,
                      boxShadow: `0 14px 30px ${hexToRgba(colors.breakBtn, 0.18)}`
                    }}
                  >
                    Finish break
                  </button>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {GAME_OPTIONS.map((game, index) => (
                  <motion.button
                    key={game.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + index * 0.05 }}
                    whileHover={{ y: -5, scale: 1.015 }}
                    onClick={() => setSelectedGame(game.id)}
                    className="wellby-button rounded-[28px] border px-5 py-5 text-left"
                    style={{
                      background:
                        selectedGame === game.id
                          ? `linear-gradient(160deg, ${colors.primary}, ${hexToRgba(colors.primary, 0.78)})`
                          : `linear-gradient(160deg, ${hexToRgba(colors.gameCardBg, 0.9)}, ${hexToRgba(colors.cardBg, 0.7)})`,
                      color: selectedGame === game.id ? colors.primaryText : colors.secondaryText,
                      borderColor: selectedGame === game.id ? colors.primary : colors.gameCardBorder,
                      boxShadow:
                        selectedGame === game.id
                          ? `0 18px 38px ${hexToRgba(colors.primary, 0.22)}`
                          : `0 10px 24px ${hexToRgba(colors.sidebarBg, 0.05)}`
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-4xl">{game.emoji}</div>
                      <span
                        className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
                        style={{
                          background:
                            selectedGame === game.id
                              ? hexToRgba(colors.cardBg, 0.18)
                              : hexToRgba(colors.secondary, 0.72),
                          color: selectedGame === game.id ? colors.primaryText : colors.muted
                        }}
                      >
                        {selectedGame === game.id ? "Now playing" : "Open"}
                      </span>
                    </div>
                    <div className="mt-4 font-display text-2xl">{game.label}</div>
                    <p
                      className="mt-2 text-sm leading-6"
                      style={{ color: selectedGame === game.id ? hexToRgba(colors.primaryText, 0.82) : colors.muted }}
                    >
                      {game.id === "snake"
                        ? "A quick arcade loop for loosening your focus."
                        : game.id === "tictactoe"
                          ? "Short strategy rounds with zero pressure."
                          : game.id === "chess"
                            ? "A slower board game pace when you want to settle in."
                            : "Bright, playful turns against simple AI opponents."}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
            <div
              className="rounded-[36px] p-4 sm:p-5"
              style={{
                background: `linear-gradient(180deg, ${hexToRgba(colors.cardBg, 0.74)}, ${hexToRgba(colors.secondary, 0.52)})`,
                border: `1px solid ${hexToRgba(colors.cardBorder, 0.34)}`,
                backdropFilter: "blur(14px)",
                boxShadow: `0 20px 54px ${hexToRgba(colors.sidebarBg, 0.08)}`
              }}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-2">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                    Active game
                  </p>
                  <h3 className="font-display text-2xl">
                    {GAME_OPTIONS.find((game) => game.id === selectedGame)?.label}
                  </h3>
                </div>
                <div
                  className="rounded-full px-4 py-2 text-sm font-bold"
                  style={{
                    background: hexToRgba(colors.secondary, 0.72),
                    color: colors.secondaryText,
                    border: `1px solid ${hexToRgba(colors.cardBorder, 0.42)}`
                  }}
                >
                  Stay as long as you need
                </div>
              </div>
              <ActiveGame onExit={() => setPhase("complete")} />
            </div>
          </div>
        ) : (
          <div className="grid min-h-[calc(100vh-8rem)] place-items-center">
            <div className="wellby-glass wellby-accent-ring w-full max-w-2xl rounded-[40px] p-8 text-center">
              <div className="flex justify-center gap-2">
                {[colors.primary, colors.burnWarn, colors.burnGood, colors.muted, colors.primary].map((color, index) => (
                  <span
                    key={`${color}-${index}`}
                    className="h-3 w-3 rounded-full"
                    style={{ background: color, boxShadow: `0 0 14px ${hexToRgba(color, 0.35)}` }}
                  />
                ))}
              </div>
              <h2 className="mt-4 font-display text-5xl">Recharged!</h2>
              <p className="mt-3 text-lg" style={{ color: colors.muted }}>
                Your break is logged and Wellby is applying a lighter burn-rate estimate while the next refresh loads.
              </p>
              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="wellby-glass-soft rounded-[24px] p-5">
                  <div className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                    Before break
                  </div>
                  <div className="mt-2 text-4xl font-extrabold">{Math.round(beforeBurnRate * 100)}%</div>
                </div>
                <div className="wellby-glass-soft rounded-[24px] p-5">
                  <div className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>
                    After break
                  </div>
                  <div className="mt-2 text-4xl font-extrabold" style={{ color: colors.primary }}>
                    {Math.round(afterBurnRate * 100)}%
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="wellby-button mt-8 rounded-full px-6 py-3 font-bold"
                style={{
                  background: colors.breakBtn,
                  color: colors.breakBtnText,
                  boxShadow: `0 16px 34px ${hexToRgba(colors.breakBtn, 0.18)}`
                }}
              >
                Return to dashboard
              </button>
            </div>
          </div>
        )}
      </div>

      <footer
        className="fixed inset-x-0 bottom-0 z-[80] px-4 py-3 text-center text-xs font-semibold"
        style={{ background: colors.sidebarBg, color: colors.wordmark }}
      >
        Wellby is a wellness companion, not a substitute for professional mental health care.
      </footer>
    </div>
  );
}
