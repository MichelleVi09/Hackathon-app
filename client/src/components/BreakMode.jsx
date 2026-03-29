import { useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { GAME_OPTIONS } from "../lib/constants.js";
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

export default function BreakMode({ initialGame, onClose, noSnooze, reason, beforeBurnRate, afterBurnRate }) {
  const { colors } = useContext(ThemeContext);
  const [phase, setPhase] = useState("mindful");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [selectedGame, setSelectedGame] = useState(initialGame ?? "snake");
  const ActiveGame = useMemo(() => GAME_COMPONENTS[selectedGame], [selectedGame]);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col backdrop-blur-md" style={{ background: colors.dashBg, color: colors.secondaryText }}>
      <div className="flex-1 overflow-auto px-4 py-8 pb-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {phase === "mindful" ? (
            <div className="grid min-h-[80vh] place-items-center">
              <div className="w-full max-w-3xl rounded-[40px] p-8 text-center shadow-glow" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
                <div className="flex items-center justify-center gap-3">
                  <LeafIcon className="h-8 w-8" primary={colors.primary} secondary={colors.secondary} />
                  <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.muted }}>Mindful Moment</p>
                </div>
                <h2 className="mt-3 font-display text-5xl">Let's take a breath together</h2>
                <p className="mt-4 text-lg" style={{ color: colors.muted }}>{breakMessage}</p>
                <motion.div
                  animate={{ scale: breathStage.scale }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                  className="mx-auto mt-10 flex h-56 w-56 items-center justify-center rounded-full text-center shadow-glow"
                  style={{ background: colors.breakRing }}
                >
                  <div className="flex h-40 w-40 items-center justify-center rounded-full" style={{ background: colors.breakInner }}>
                    <div>
                      <div className="text-2xl font-extrabold" style={{ color: colors.primary }}>{secondsLeft}s</div>
                      <div className="mt-2 font-bold">{breathStage.label}</div>
                    </div>
                  </div>
                </motion.div>
                <div className="mt-10 h-4 overflow-hidden rounded-full" style={{ background: colors.secondary }}>
                  <div className="h-full" style={{ width: `${((60 - secondsLeft) / 60) * 100}%`, background: colors.primary }} />
                </div>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPhase("games")}
                    className="rounded-full px-6 py-3 font-bold"
                    style={{ background: colors.breakBtn, color: colors.breakBtnText }}
                  >
                    Start break
                  </button>
                  <button
                    onClick={() => setPhase("games")}
                    className="rounded-full border px-6 py-3 font-bold"
                    style={{ borderColor: colors.muted, color: colors.muted, background: "transparent" }}
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          ) : phase === "games" ? (
            <div className="space-y-8">
              <div className="rounded-[36px] p-6 shadow-glow md:p-8" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.22em]" style={{ color: colors.muted }}>Wellby Game Lounge</p>
                    <h2 className="font-display text-4xl">Recharge in a way that actually feels fun</h2>
                    <p className="mt-2 text-sm" style={{ color: colors.muted }}>{breakMessage}</p>
                  </div>
                  <button
                    onClick={() => setPhase("complete")}
                    className="rounded-full px-5 py-3 font-bold lg:self-start"
                    style={{ background: colors.breakBtn, color: colors.breakBtnText }}
                  >
                    Finish break
                  </button>
                </div>
                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {GAME_OPTIONS.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGame(game.id)}
                      className="min-h-28 rounded-[24px] border px-5 py-6 text-left transition-transform hover:-translate-y-0.5"
                      style={{
                        background: selectedGame === game.id ? colors.primary : colors.gameCardBg,
                        color: selectedGame === game.id ? colors.primaryText : colors.secondaryText,
                        borderColor: selectedGame === game.id ? colors.primary : colors.gameCardBorder
                      }}
                    >
                      <div className="text-3xl">{game.emoji}</div>
                      <div className="mt-2 font-bold">{game.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <ActiveGame onExit={() => setPhase("complete")} />
            </div>
          ) : (
            <div className="grid min-h-[80vh] place-items-center">
              <div className="w-full max-w-2xl rounded-[40px] p-8 text-center shadow-glow" style={{ background: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}>
                <div className="flex justify-center gap-2">
                  {[colors.primary, colors.burnWarn, colors.burnGood, colors.muted, colors.primary].map((color, index) => (
                    <span key={`${color}-${index}`} className="h-3 w-3 rounded-full" style={{ background: color }} />
                  ))}
                </div>
                <h2 className="mt-4 font-display text-5xl">Recharged!</h2>
                <p className="mt-3 text-lg" style={{ color: colors.muted }}>
                  Your break is logged and Wellby is applying a lighter burn-rate estimate while the next refresh loads.
                </p>
                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] p-5" style={{ background: colors.secondary }}>
                    <div className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>Before break</div>
                    <div className="mt-2 text-4xl font-extrabold">{Math.round(beforeBurnRate * 100)}%</div>
                  </div>
                  <div className="rounded-[24px] p-5" style={{ background: colors.secondary }}>
                    <div className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: colors.muted }}>After break</div>
                    <div className="mt-2 text-4xl font-extrabold" style={{ color: colors.primary }}>{Math.round(afterBurnRate * 100)}%</div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="mt-8 rounded-full px-6 py-3 font-bold"
                  style={{ background: colors.breakBtn, color: colors.breakBtnText }}
                >
                  Return to dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <footer
        className="shrink-0 px-4 py-3 text-center text-xs font-semibold"
        style={{ background: colors.sidebarBg, color: colors.wordmark }}
      >
        Wellby is a wellness companion, not a substitute for professional mental health care.
      </footer>
    </div>
  );
}
