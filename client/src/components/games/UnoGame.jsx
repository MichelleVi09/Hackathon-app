import { useContext, useMemo, useState } from "react";
import { ThemeContext } from "../../context/ThemeContext.jsx";

const colors = ["red", "yellow", "green", "blue"];
const numbers = Array.from({ length: 10 }, (_, value) => ({ type: "number", value }));
const actions = [{ type: "skip" }, { type: "reverse" }, { type: "draw2" }];

function buildDeck() {
  const deck = [];
  colors.forEach((color) => {
    numbers.concat(actions).forEach((card) => {
      deck.push({ ...card, color, id: `${color}-${card.type}-${card.value ?? ""}-${Math.random()}` });
    });
  });
  for (let index = 0; index < 4; index += 1) {
    deck.push({ type: "wild", color: "wild", id: `wild-${index}-${Math.random()}` });
    deck.push({ type: "wild4", color: "wild", id: `wild4-${index}-${Math.random()}` });
  }
  return deck.sort(() => Math.random() - 0.5);
}

function cardLabel(card) {
  if (card.type === "number") return `${card.color} ${card.value}`;
  if (card.type === "wild") return "Wild";
  if (card.type === "wild4") return "Wild +4";
  return `${card.color} ${card.type}`;
}

function canPlay(card, topCard) {
  return (
    card.color === "wild" ||
    card.color === topCard.color ||
    (card.type === "number" && topCard.type === "number" && card.value === topCard.value) ||
    card.type === topCard.type
  );
}

function deepCopyState(state) {
  return {
    ...state,
    deck: [...state.deck],
    players: state.players.map((hand) => [...hand]),
    topCard: { ...state.topCard }
  };
}

function drawCard(state, playerIndex, count = 1) {
  const next = deepCopyState(state);
  for (let index = 0; index < count; index += 1) {
    if (!next.deck.length) break;
    next.players[playerIndex].push(next.deck.pop());
  }
  return next;
}

export default function UnoGame({ onExit }) {
  const { colors } = useContext(ThemeContext);
  const [state, setState] = useState(() => {
    const deck = buildDeck();
    const players = [[], [], []];
    for (let round = 0; round < 7; round += 1) {
      for (let player = 0; player < 3; player += 1) {
        players[player].push(deck.pop());
      }
    }
    return {
      deck,
      players,
      topCard: deck.pop(),
      currentPlayer: 0,
      message: "Your turn."
    };
  });

  const winner = useMemo(() => state.players.findIndex((hand) => hand.length === 0), [state.players]);

  function advanceTurn(next, offset = 1) {
    next.currentPlayer = (next.currentPlayer + offset) % 3;
  }

  function applyCardEffect(next, card) {
    if (card.type === "skip") {
      advanceTurn(next, 2);
      next.message = "Skip!";
      return;
    }
    if (card.type === "reverse") {
      advanceTurn(next, 2);
      next.message = "Reverse played. In three-player Wellby, that acts like a skip.";
      return;
    }
    if (card.type === "draw2") {
      const target = (next.currentPlayer + 1) % 3;
      const updated = drawCard(next, target, 2);
      next.players = updated.players;
      advanceTurn(next, 2);
      next.message = "Draw Two!";
      return;
    }
    if (card.type === "wild4") {
      const target = (next.currentPlayer + 1) % 3;
      const updated = drawCard(next, target, 4);
      next.players = updated.players;
      advanceTurn(next, 2);
      next.message = "Wild Draw Four!";
      return;
    }
    advanceTurn(next, 1);
    next.message = "Nice play.";
  }

  function takeAiTurns() {
    setState((current) => {
      let next = deepCopyState(current);
      while (next.currentPlayer !== 0 && next.players.every((hand) => hand.length > 0)) {
        const player = next.currentPlayer;
        const playable = next.players[player].find((card) => canPlay(card, next.topCard));
        if (!playable) {
          next = drawCard(next, player, 1);
          const drawn = next.players[player][next.players[player].length - 1];
          if (drawn && canPlay(drawn, next.topCard)) {
            next.players[player].pop();
            next.topCard = {
              ...drawn,
              color: drawn.color === "wild" ? colors[Math.floor(Math.random() * colors.length)] : drawn.color
            };
            applyCardEffect(next, next.topCard);
          } else {
            advanceTurn(next, 1);
            next.message = `Player ${player + 1} drew a card.`;
          }
        } else {
          next.players[player] = next.players[player].filter((card) => card.id !== playable.id);
          next.topCard = {
            ...playable,
            color: playable.color === "wild" ? colors[Math.floor(Math.random() * colors.length)] : playable.color
          };
          applyCardEffect(next, next.topCard);
          if (next.players[player].length === 1) {
            next.message = `Player ${player + 1} shouted UNO!`;
          }
        }
      }
      return next;
    });
  }

  function playCard(card) {
    if (winner !== -1 || !canPlay(card, state.topCard) || state.currentPlayer !== 0) {
      return;
    }
    const next = deepCopyState(state);
    next.players[0] = next.players[0].filter((item) => item.id !== card.id);
    next.topCard = {
      ...card,
      color: card.color === "wild" ? colors[Math.floor(Math.random() * colors.length)] : card.color
    };
    applyCardEffect(next, next.topCard);
    if (next.players[0].length === 1) {
      next.message = "You yelled UNO!";
    }
    setState(next);

    setTimeout(() => {
      takeAiTurns();
    }, 600);
  }

  function drawForPlayer() {
    if (state.currentPlayer !== 0 || winner !== -1) {
      return;
    }
    const next = drawCard(state, 0, 1);
    advanceTurn(next, 1);
    next.message = "You drew a card.";
    setState(next);
    setTimeout(() => {
      takeAiTurns();
    }, 600);
  }

  return (
    <div className="rounded-[28px] p-6 md:p-7" style={{ background: colors.cardBg, color: colors.secondaryText, border: `1px solid ${colors.cardBorder}` }}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-2xl">UNO</h3>
          <p className="text-sm">Single-player vs two simple AI opponents.</p>
        </div>
        <button onClick={onExit} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
          End Break & Return to Work
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-[24px] p-4" style={{ background: colors.secondary }}>
          <div className="text-sm font-bold">Discard pile</div>
          <div className="mt-3 rounded-[24px] p-5 text-center font-bold" style={{ background: colors.cardBg }}>{cardLabel(state.topCard)}</div>
          <p className="mt-4 text-sm">{state.message}</p>
          <p className="mt-2 text-sm">Current turn: Player {state.currentPlayer + 1}</p>
          <button onClick={drawForPlayer} className="mt-4 rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
            Draw card
          </button>
        </aside>
        <div className="space-y-4">
          {[1, 2].map((player) => (
            <div key={player} className="rounded-[24px] p-4" style={{ background: colors.secondary }}>
              <div className="font-bold">Player {player + 1}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {state.players[player].map((card) => (
                  <div key={card.id} className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: colors.cardBg }}>
                    {card.color === "wild" ? "Wild" : card.color}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="rounded-[24px] p-4" style={{ background: colors.cardBg }}>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-bold">Your hand</div>
              {winner !== -1 ? <div className="text-sm font-bold">{winner === 0 ? "You win!" : `Player ${winner + 1} wins!`}</div> : null}
            </div>
            <div className="flex flex-wrap gap-3">
              {state.players[0].map((card) => (
                <button
                  key={card.id}
                  onClick={() => playCard(card)}
                  className="rounded-[22px] px-4 py-5 text-left text-sm font-bold shadow-sm"
                  style={{
                    background: canPlay(card, state.topCard) ? colors.primary : colors.secondary,
                    color: canPlay(card, state.topCard) ? colors.primaryText : colors.secondaryText,
                    opacity: canPlay(card, state.topCard) ? 1 : 0.7
                  }}
                >
                  {cardLabel(card)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
