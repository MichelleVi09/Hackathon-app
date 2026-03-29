import { useContext, useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import { ThemeContext } from "../../context/ThemeContext.jsx";

const pieceMap = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  P: "♙",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔"
};

function evaluateBoard(game) {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  return game.board().flat().reduce((score, piece) => {
    if (!piece) {
      return score;
    }
    const value = values[piece.type] ?? 0;
    return piece.color === "w" ? score + value : score - value;
  }, 0);
}

function minimax(game, depth, alpha, beta, maximizingPlayer) {
  if (depth === 0 || game.isGameOver()) {
    return { score: evaluateBoard(game) };
  }

  const moves = game.moves({ verbose: true });
  let bestMove = null;

  if (maximizingPlayer) {
    let bestScore = -Infinity;
    for (const move of moves) {
      const next = new Chess(game.fen());
      next.move(move);
      const result = minimax(next, depth - 1, alpha, beta, false);
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    return { score: bestScore, move: bestMove };
  }

  let bestScore = Infinity;
  for (const move of moves) {
    const next = new Chess(game.fen());
    next.move(move);
    const result = minimax(next, depth - 1, alpha, beta, true);
    if (result.score < bestScore) {
      bestScore = result.score;
      bestMove = move;
    }
    beta = Math.min(beta, bestScore);
    if (beta <= alpha) break;
  }
  return { score: bestScore, move: bestMove };
}

function algebraic(squareIndex) {
  const file = String.fromCharCode(97 + (squareIndex % 8));
  const rank = 8 - Math.floor(squareIndex / 8);
  return `${file}${rank}`;
}

export default function ChessGame({ onExit }) {
  const { colors } = useContext(ThemeContext);
  const [mode, setMode] = useState("ai");
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [captured, setCaptured] = useState({ white: [], black: [] });

  const board = useMemo(() => game.board().flat(), [game]);

  useEffect(() => {
    if (mode !== "ai" || game.turn() !== "b" || game.isGameOver()) {
      return;
    }

    const timer = setTimeout(() => {
      const result = minimax(new Chess(game.fen()), 3, -Infinity, Infinity, false);
      if (result.move) {
        const next = new Chess(game.fen());
        next.move(result.move);
        if (result.move.captured) {
          setCaptured((current) => ({
            ...current,
            black: [...current.black, pieceMap[result.move.captured.toUpperCase()]]
          }));
        }
        setGame(next);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [game, mode]);

  function reset() {
    setGame(new Chess());
    setSelectedSquare(null);
    setCaptured({ white: [], black: [] });
  }

  function handleSquareClick(index) {
    if (game.isGameOver()) {
      return;
    }
    const square = algebraic(index);

    if (!selectedSquare) {
      setSelectedSquare(square);
      return;
    }

    const next = new Chess(game.fen());
    const move = next.move({ from: selectedSquare, to: square, promotion: "q" });

    if (!move) {
      setSelectedSquare(square);
      return;
    }

    if (move.captured) {
      setCaptured((current) => ({
        ...current,
        [move.color === "w" ? "black" : "white"]: [
          ...current[move.color === "w" ? "black" : "white"],
          pieceMap[move.color === "w" ? move.captured : move.captured.toUpperCase()]
        ]
      }));
    }

    setGame(next);
    setSelectedSquare(null);
  }

  return (
    <div className="rounded-[28px] p-5" style={{ background: colors.cardBg, color: colors.secondaryText, border: `1px solid ${colors.cardBorder}` }}>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-2xl">Chess</h3>
          <p className="text-sm">Pass-and-play or a simple depth-3 AI opponent.</p>
        </div>
        <button onClick={onExit} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
          End Break & Return to Work
        </button>
      </div>
      <div className="mb-4 flex gap-3">
        <button
          onClick={() => {
            setMode("ai");
            reset();
          }}
          className="rounded-full px-4 py-2 text-sm font-bold"
          style={{ background: mode === "ai" ? colors.primary : colors.secondary, color: mode === "ai" ? colors.primaryText : colors.secondaryText }}
        >
          vs AI
        </button>
        <button
          onClick={() => {
            setMode("local");
            reset();
          }}
          className="rounded-full px-4 py-2 text-sm font-bold"
          style={{ background: mode === "local" ? colors.primary : colors.secondary, color: mode === "local" ? colors.primaryText : colors.secondaryText }}
        >
          Two-player
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[auto_220px]">
        <div className="grid w-full max-w-[520px] grid-cols-8 overflow-hidden rounded-[24px] shadow-lg">
          {board.map((piece, index) => {
            const isLight = (Math.floor(index / 8) + index) % 2 === 0;
            const square = algebraic(index);
            const isSelected = selectedSquare === square;
            const symbol = piece
              ? pieceMap[piece.color === "w" ? piece.type.toUpperCase() : piece.type]
              : "";
            return (
              <button
                key={square}
                onClick={() => handleSquareClick(index)}
                className="aspect-square text-3xl transition"
                style={{
                  background: isLight ? colors.secondary : colors.primary,
                  color: isLight ? colors.secondaryText : colors.primaryText,
                  boxShadow: isSelected ? `inset 0 0 0 3px ${colors.burnWarn}` : "none"
                }}
              >
                {symbol}
              </button>
            );
          })}
        </div>
        <aside className="rounded-[24px] p-4" style={{ background: colors.secondary }}>
          <h4 className="font-bold">Move history</h4>
          <div className="mt-3 max-h-56 overflow-auto text-sm">
            {game.history().map((move, index) => (
              <div key={`${move}-${index}`} className="py-1" style={{ borderBottom: `1px solid ${colors.cardBorder}` }}>
                {index + 1}. {move}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h4 className="font-bold">Captured pieces</h4>
            <p className="mt-2 text-sm">White took: {captured.black.join(" ") || "None yet"}</p>
            <p className="mt-2 text-sm">Black took: {captured.white.join(" ") || "None yet"}</p>
          </div>
          <div className="mt-4 rounded-2xl p-3 text-sm" style={{ background: colors.cardBg }}>
            {game.isGameOver() ? "Game over." : `Turn: ${game.turn() === "w" ? "White" : "Black"}`}
          </div>
          <button onClick={reset} className="mt-4 rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
            Reset board
          </button>
        </aside>
      </div>
    </div>
  );
}
