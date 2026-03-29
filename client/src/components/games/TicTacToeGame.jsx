import { useContext, useMemo, useState } from "react";
import { ThemeContext } from "../../context/ThemeContext.jsx";

const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function getWinner(board) {
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every(Boolean) ? "draw" : null;
}

function minimax(board, isMaximizing) {
  const winner = getWinner(board);
  if (winner === "O") return { score: 1 };
  if (winner === "X") return { score: -1 };
  if (winner === "draw") return { score: 0 };

  const moves = [];
  board.forEach((cell, index) => {
    if (!cell) {
      const nextBoard = [...board];
      nextBoard[index] = isMaximizing ? "O" : "X";
      const result = minimax(nextBoard, !isMaximizing);
      moves.push({ index, score: result.score });
    }
  });

  return isMaximizing
    ? moves.reduce((best, move) => (move.score > best.score ? move : best), { score: -Infinity })
    : moves.reduce((best, move) => (move.score < best.score ? move : best), { score: Infinity });
}

export default function TicTacToeGame({ onExit }) {
  const { colors } = useContext(ThemeContext);
  const [mode, setMode] = useState("ai");
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const winner = useMemo(() => getWinner(board), [board]);

  function reset() {
    setBoard(Array(9).fill(null));
    setTurn("X");
  }

  function play(index) {
    if (board[index] || winner) {
      return;
    }
    const nextBoard = [...board];
    nextBoard[index] = turn;
    const nextWinner = getWinner(nextBoard);
    setBoard(nextBoard);

    if (nextWinner || mode === "local") {
      setTurn(turn === "X" ? "O" : "X");
      return;
    }

    const aiMove = minimax(nextBoard, true).index;
    if (aiMove !== undefined) {
      nextBoard[aiMove] = "O";
      setBoard([...nextBoard]);
      setTurn("X");
    }
  }

  return (
    <div className="rounded-[28px] p-6 md:p-7" style={{ background: colors.cardBg, color: colors.secondaryText, border: `1px solid ${colors.cardBorder}` }}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-2xl">Tic Tac Toe</h3>
          <p className="text-sm">Perfect-play AI or pass-and-play on the same screen.</p>
        </div>
        <button onClick={onExit} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
          End Break & Return to Work
        </button>
      </div>
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => {
            setMode("ai");
            reset();
          }}
          className="rounded-full px-4 py-2 text-sm font-bold"
          style={{ background: mode === "ai" ? colors.primary : colors.secondary, color: mode === "ai" ? colors.primaryText : colors.secondaryText }}
        >
          Single-player
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
      <div className="rounded-[28px] p-5" style={{ background: colors.secondary }}>
        <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-3">
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => play(index)}
              className="aspect-square rounded-[22px] text-4xl font-extrabold shadow-sm transition hover:scale-[1.02]"
              style={{ background: colors.cardBg, color: colors.secondaryText }}
            >
              {cell}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-bold">
          {winner ? (winner === "draw" ? "Draw! Nicely matched." : `${winner} wins!`) : `Turn: ${turn}`}
        </p>
        <button onClick={reset} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
          Play again
        </button>
      </div>
    </div>
  );
}
