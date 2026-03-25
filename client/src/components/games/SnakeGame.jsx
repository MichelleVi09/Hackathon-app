import { useContext, useEffect, useRef, useState } from "react";
import { ThemeContext } from "../../context/ThemeContext.jsx";
import { STORAGE_KEYS } from "../../lib/constants.js";
import { readStorage, writeStorage } from "../../lib/storage.js";

const GRID_SIZE = 16;
const TILE_COUNT = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 9, y: 10 }
];

function randomFood(snake) {
  let food = { x: 5, y: 5 };
  while (snake.some((segment) => segment.x === food.x && segment.y === food.y)) {
    food = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT)
    };
  }
  return food;
}

export default function SnakeGame({ onExit }) {
  const { colors } = useContext(ThemeContext);
  const canvasRef = useRef(null);
  const directionRef = useRef({ x: 1, y: 0 });
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(() => randomFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const highScores = readStorage(STORAGE_KEYS.gameScores, { snake: 0 });

  useEffect(() => {
    function handleKeyDown(event) {
      const keyMap = {
        ArrowUp: { x: 0, y: -1 },
        w: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        a: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        d: { x: 1, y: 0 }
      };
      const nextDirection = keyMap[event.key];
      if (nextDirection) {
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
        }
        directionRef.current = nextDirection;
      }
    }

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (gameOver) {
      return;
    }

    const interval = setInterval(() => {
      setSnake((current) => {
        const head = current[0];
        const nextHead = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y
        };

        const hitWall =
          nextHead.x < 0 ||
          nextHead.y < 0 ||
          nextHead.x >= TILE_COUNT ||
          nextHead.y >= TILE_COUNT;
        const hitSelf = current.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

        if (hitWall || hitSelf) {
          setGameOver(true);
          return current;
        }

        const ateFood = nextHead.x === food.x && nextHead.y === food.y;
        const nextSnake = [nextHead, ...current];
        if (!ateFood) {
          nextSnake.pop();
        } else {
          const nextScore = score + 1;
          setScore(nextScore);
          setFood(randomFood(nextSnake));
          if (nextScore > (highScores.snake ?? 0)) {
            writeStorage(STORAGE_KEYS.gameScores, { ...highScores, snake: nextScore });
          }
        }
        return nextSnake;
      });
    }, 140);

    return () => clearInterval(interval);
  }, [food, gameOver, highScores, score]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.cardBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = colors.primary;
    snake.forEach((segment) => {
      ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    });

    ctx.fillStyle = colors.burnWarn;
    ctx.fillRect(food.x * GRID_SIZE, food.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
  }, [snake, food, colors]);

  function restart() {
    directionRef.current = { x: 1, y: 0 };
    setSnake(INITIAL_SNAKE);
    setFood(randomFood(INITIAL_SNAKE));
    setScore(0);
    setGameOver(false);
  }

  return (
    <div className="rounded-[28px] p-6 md:p-7" style={{ background: colors.cardBg, color: colors.secondaryText, border: `1px solid ${colors.cardBorder}` }}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-2xl">Snake</h3>
          <p className="text-sm">High score: {readStorage(STORAGE_KEYS.gameScores, { snake: 0 }).snake ?? 0}</p>
        </div>
        <button onClick={onExit} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
          End Break & Return to Work
        </button>
      </div>
      <div className="flex justify-center rounded-[28px] px-4 py-6" style={{ background: colors.secondary }}>
        <canvas ref={canvasRef} width={320} height={320} className="rounded-[24px] shadow-inner" />
      </div>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-bold">Score: {score}</p>
        {gameOver ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold">Ready to get back to it?</span>
            <button onClick={restart} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.primary, color: colors.primaryText }}>
              Play again
            </button>
          </div>
        ) : (
          <span className="text-sm" style={{ color: colors.muted }}>Use arrow keys or WASD</span>
        )}
      </div>
    </div>
  );
}
