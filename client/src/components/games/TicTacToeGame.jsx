import React,{ useContext, useMemo, useState } from "react";
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

function findLineMove(board, marker) {
  for (const [a, b, c] of lines) {
    const values = [board[a], board[b], board[c]];
    const markerCount = values.filter((value) => value === marker).length;
    const emptyIndex = [a, b, c].find((index) => !board[index]);
    if (markerCount === 2 && emptyIndex !== undefined) {
      return emptyIndex;
    }
  }
  return null;
}

function chooseAiMove(board) {
  const winningMove = findLineMove(board, "O");
  if (winningMove !== null) {
    return winningMove;
  }

  const shouldBlock = Math.random() > 0.35;
  if (shouldBlock) {
    const blockingMove = findLineMove(board, "X");
    if (blockingMove !== null) {
      return blockingMove;
    }
  }

  const preferredMoves = [4, 0, 2, 6, 8, 1, 3, 5, 7];
  const availableMoves = preferredMoves.filter((index) => !board[index]);
  if (!availableMoves.length) {
    return undefined;
  }

  if (Math.random() > 0.55) {
    return availableMoves[0];
  }

  return availableMoves[Math.floor(Math.random() * availableMoves.length)];
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

    const aiMove = chooseAiMove(nextBoard);
    if (aiMove !== undefined) {
      nextBoard[aiMove] = "O";
      setBoard([...nextBoard]);
      setTurn("X");
    }
  }

  const resultMessage = winner
    ? winner === "draw"
      ? "Draw! That round was close."
      : mode === "ai"
        ? winner === "X"
          ? "You win!"
          : "The computer wins."
        : `${winner} wins!`
    : null;

  return (
    <div className="rounded-[28px] p-6 md:p-7" style={{ background: colors.cardBg, color: colors.secondaryText, border: `1px solid ${colors.cardBorder}` }}>
      <div className="mb-6 flex flex-col gap-4">
        <button onClick={onExit} className="self-end rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
          End Break & Return to Work
        </button>
        <div className="rounded-[24px] px-6 py-5 text-center" style={{ background: colors.cardBg, border: `2px solid ${colors.primary}` }}>
          <h3 className="font-display text-4xl">Tic Tac Toe</h3>
          <p className="mt-2 text-sm" style={{ color: colors.muted }}>
            Take on the AI or pass and play on the same screen.
          </p>
        </div>
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
      <div
        className="mt-5 rounded-[24px] px-5 py-4 text-center"
        style={{
          background: resultMessage
            ? winner === "draw"
              ? colors.secondary
              : winner === "X"
                ? colors.pillGoodBg
                : colors.pillWarnBg
            : colors.secondary,
          color: resultMessage
            ? winner === "draw"
              ? colors.secondaryText
              : winner === "X"
                ? colors.pillGoodText
                : colors.pillWarnText
            : colors.secondaryText,
          border: `1px solid ${
            resultMessage
              ? winner === "draw"
                ? colors.cardBorder
                : winner === "X"
                  ? colors.pillGoodBorder
                  : colors.pillWarnBorder
              : colors.cardBorder
          }`
        }}
      >
        <div className="text-lg font-extrabold">
          {resultMessage ?? (mode === "ai" ? "Beat the AI or force a draw." : `Turn: ${turn}`)}
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={reset} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
          Play again
        </button>
      </div>
    </div>
  );
}
