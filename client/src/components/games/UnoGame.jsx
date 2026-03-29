import React, { useContext, useEffect, useMemo, useState } from "react";
import { ThemeContext } from "../../context/ThemeContext.jsx";

const UNO_COLORS = ["red", "yellow", "green", "blue"];
const ACTION_TYPES = ["skip", "reverse", "draw2"];
const AI_TURN_DELAY_MS = 5000;

function shuffle(deck) {
  const next = [...deck];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function createCard(type, color, value = null) {
  return {
    type,
    color,
    value,
    id: `${color}-${type}-${value ?? "x"}-${crypto.randomUUID()}`
  };
}

function buildDeck() {
  const deck = [];

  UNO_COLORS.forEach((color) => {
    deck.push(createCard("number", color, 0));

    for (let value = 1; value <= 9; value += 1) {
      deck.push(createCard("number", color, value));
      deck.push(createCard("number", color, value));
    }

    ACTION_TYPES.forEach((type) => {
      deck.push(createCard(type, color));
      deck.push(createCard(type, color));
    });
  });

  for (let index = 0; index < 4; index += 1) {
    deck.push(createCard("wild", "wild"));
    deck.push(createCard("wild4", "wild"));
  }

  return shuffle(deck);
}

function cardLabel(card) {
  if (card.type === "number") {
    return `${card.color} ${card.value}`;
  }
  if (card.type === "wild") {
    return "Wild";
  }
  if (card.type === "wild4") {
    return "Wild +4";
  }
  return `${card.color} ${card.type}`;
}

function cloneState(state) {
  return {
    ...state,
    deck: [...state.deck],
    players: state.players.map((hand) => [...hand]),
    discardPile: [...state.discardPile],
    turnFeed: [...state.turnFeed]
  };
}

function nextPlayer(currentPlayer, direction, step = 1, totalPlayers = 3) {
  return (currentPlayer + direction * step + totalPlayers * 10) % totalPlayers;
}

function getTopCard(state) {
  return state.discardPile[state.discardPile.length - 1];
}

function getActiveColor(state) {
  const topCard = getTopCard(state);
  return topCard.color === "wild" ? state.activeColor : topCard.color;
}

function canPlay(card, state) {
  const topCard = getTopCard(state);
  const activeColor = getActiveColor(state);

  if (card.color === "wild") {
    return true;
  }

  if (card.color === activeColor) {
    return true;
  }

  if (card.type === "number" && topCard.type === "number") {
    return card.value === topCard.value;
  }

  if (card.type !== "number" && topCard.type !== "number") {
    return card.type === topCard.type;
  }

  return false;
}

function chooseWildColor(hand) {
  const counts = UNO_COLORS.reduce((accumulator, color) => ({ ...accumulator, [color]: 0 }), {});
  hand.forEach((card) => {
    if (counts[card.color] !== undefined) {
      counts[card.color] += 1;
    }
  });

  return UNO_COLORS.reduce((bestColor, color) =>
    counts[color] > counts[bestColor] ? color : bestColor
  , "red");
}

function replenishDeck(next) {
  if (next.deck.length || next.discardPile.length <= 1) {
    return;
  }

  const topCard = next.discardPile.pop();
  next.deck = shuffle(next.discardPile);
  next.discardPile = [topCard];
}

function drawCards(next, playerIndex, count) {
  for (let index = 0; index < count; index += 1) {
    replenishDeck(next);
    if (!next.deck.length) {
      break;
    }
    next.players[playerIndex].push(next.deck.pop());
  }
}

function applyCard(next, playerIndex, card, actorLabel) {
  next.players[playerIndex] = next.players[playerIndex].filter((item) => item.id !== card.id);
  next.discardPile.push(card);
  next.hasDrawnThisTurn = false;

  if (card.color === "wild") {
    next.activeColor = chooseWildColor(next.players[playerIndex]);
  } else {
    next.activeColor = card.color;
  }

  if (next.players[playerIndex].length === 0) {
    next.currentPlayer = playerIndex;
    next.message = `${actorLabel} won the round!`;
    return;
  }

  if (next.players[playerIndex].length === 1) {
    next.message = `${actorLabel} called UNO!`;
  }

  const immediateNext = nextPlayer(playerIndex, next.direction);

  if (card.type === "skip") {
    next.currentPlayer = nextPlayer(playerIndex, next.direction, 2);
    next.message = `${actorLabel} played Skip.`;
    next.turnFeed = [`${actorLabel} played Skip.`, ...next.turnFeed].slice(0, 6);
    return;
  }

  if (card.type === "reverse") {
    next.direction *= -1;
    next.currentPlayer = nextPlayer(playerIndex, next.direction);
    next.message = `${actorLabel} reversed play.`;
    next.turnFeed = [`${actorLabel} reversed play.`, ...next.turnFeed].slice(0, 6);
    return;
  }

  if (card.type === "draw2") {
    drawCards(next, immediateNext, 2);
    next.currentPlayer = nextPlayer(playerIndex, next.direction, 2);
    next.message = `${actorLabel} played Draw Two.`;
    next.turnFeed = [`${actorLabel} played Draw Two.`, ...next.turnFeed].slice(0, 6);
    return;
  }

  if (card.type === "wild4") {
    drawCards(next, immediateNext, 4);
    next.currentPlayer = nextPlayer(playerIndex, next.direction, 2);
    next.message = `${actorLabel} played Wild Draw Four and chose ${next.activeColor}.`;
    next.turnFeed = [`${actorLabel} played Wild Draw Four and chose ${next.activeColor}.`, ...next.turnFeed].slice(0, 6);
    return;
  }

  if (card.type === "wild") {
    next.currentPlayer = immediateNext;
    next.message = `${actorLabel} chose ${next.activeColor}.`;
    next.turnFeed = [`${actorLabel} played Wild and chose ${next.activeColor}.`, ...next.turnFeed].slice(0, 6);
    return;
  }

  next.currentPlayer = immediateNext;
  next.message = `${actorLabel} played ${cardLabel(card)}.`;
  next.turnFeed = [`${actorLabel} played ${cardLabel(card)}.`, ...next.turnFeed].slice(0, 6);
}

function bestPlayableCard(hand, state) {
  const playable = hand.filter((card) => canPlay(card, state));
  const priority = {
    draw2: 0,
    skip: 1,
    reverse: 2,
    number: 3,
    wild: 4,
    wild4: 5
  };

  playable.sort((left, right) => priority[left.type] - priority[right.type]);
  return playable[0] ?? null;
}

function createInitialState() {
  const deck = buildDeck();
  const players = [[], [], []];

  for (let round = 0; round < 7; round += 1) {
    for (let player = 0; player < players.length; player += 1) {
      players[player].push(deck.pop());
    }
  }

  let topCard = deck.pop();
  while (topCard.type === "wild" || topCard.type === "wild4") {
    deck.unshift(topCard);
    topCard = deck.pop();
  }

  return {
    deck,
    players,
    discardPile: [topCard],
    currentPlayer: 0,
    direction: 1,
    activeColor: topCard.color,
    hasDrawnThisTurn: false,
    message: "Your turn.",
    turnFeed: [`Round started with ${cardLabel(topCard)}.`]
  };
}

export default function UnoGame({ onExit }) {
  const { colors } = useContext(ThemeContext);
  const [state, setState] = useState(createInitialState);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const winner = useMemo(() => state.players.findIndex((hand) => hand.length === 0), [state.players]);
  const selectedCard = state.players[0].find((card) => card.id === selectedCardId) ?? null;

  useEffect(() => {
    if (state.currentPlayer === 0 || winner !== -1) {
      setIsAiThinking(false);
      return;
    }

    setIsAiThinking(true);
    const timer = setTimeout(() => {
      setState((current) => {
        const next = cloneState(current);
        const playerIndex = next.currentPlayer;
        const card = bestPlayableCard(next.players[playerIndex], next);

        if (!card) {
          drawCards(next, playerIndex, 1);
          const drawnCard = next.players[playerIndex][next.players[playerIndex].length - 1];

          if (drawnCard && canPlay(drawnCard, next)) {
            applyCard(next, playerIndex, drawnCard, `Player ${playerIndex + 1}`);
          } else {
            next.currentPlayer = nextPlayer(playerIndex, next.direction);
            next.message = `Player ${playerIndex + 1} drew and passed.`;
            next.turnFeed = [`Player ${playerIndex + 1} drew and passed.`, ...next.turnFeed].slice(0, 6);
          }
        } else {
          applyCard(next, playerIndex, card, `Player ${playerIndex + 1}`);
        }

        if (next.currentPlayer === 0 && next.players.every((hand) => hand.length > 0)) {
          next.message = "Your turn.";
        }

        return next;
      });
      setIsAiThinking(false);
    }, AI_TURN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [state.currentPlayer, winner]);

  useEffect(() => {
    setSelectedCardId(null);
  }, [state.currentPlayer]);

  function restart() {
    setState(createInitialState());
    setSelectedCardId(null);
    setIsAiThinking(false);
  }

  function drawForPlayer() {
    if (state.currentPlayer !== 0 || winner !== -1 || state.hasDrawnThisTurn || isAiThinking) {
      return;
    }

    const next = cloneState(state);
    drawCards(next, 0, 1);
    next.hasDrawnThisTurn = true;

    const drawnCard = next.players[0][next.players[0].length - 1];
    if (drawnCard && canPlay(drawnCard, next)) {
      next.message = `You drew ${cardLabel(drawnCard)}. You can play it or pass.`;
      setSelectedCardId(drawnCard.id);
      next.turnFeed = [`You drew ${cardLabel(drawnCard)}.`, ...next.turnFeed].slice(0, 6);
    } else {
      next.currentPlayer = nextPlayer(0, next.direction);
      next.hasDrawnThisTurn = false;
      next.message = "You drew and passed.";
      setSelectedCardId(null);
      next.turnFeed = ["You drew and passed.", ...next.turnFeed].slice(0, 6);
    }

    setState(next);
  }

  function passTurn() {
    if (state.currentPlayer !== 0 || winner !== -1 || !state.hasDrawnThisTurn || isAiThinking) {
      return;
    }

    const next = cloneState(state);
    next.currentPlayer = nextPlayer(0, next.direction);
    next.hasDrawnThisTurn = false;
    next.message = "You passed.";
    setSelectedCardId(null);
    next.turnFeed = ["You passed.", ...next.turnFeed].slice(0, 6);
    setState(next);
  }

  function playSelectedCard() {
    if (!selectedCard || state.currentPlayer !== 0 || winner !== -1 || isAiThinking || !canPlay(selectedCard, state)) {
      return;
    }

    const next = cloneState(state);
    applyCard(next, 0, selectedCard, "You");
    setSelectedCardId(null);
    setState(next);
  }

  const topCard = getTopCard(state);
  const activeColor = getActiveColor(state);

  return (
    <div className="rounded-[28px] p-6 md:p-7" style={{ background: colors.cardBg, color: colors.secondaryText, border: `1px solid ${colors.cardBorder}` }}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-2xl">UNO</h3>
          <p className="text-sm">Single-player vs two AI opponents with slower turns and hidden opponent hands.</p>
        </div>
        <button onClick={onExit} className="rounded-full px-4 py-2 text-sm font-bold" style={{ background: colors.breakBtn, color: colors.breakBtnText }}>
          End Break & Return to Work
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-[24px] p-4" style={{ background: colors.secondary }}>
          <div className="text-sm font-bold">Discard pile</div>
          <div className="mt-3 rounded-[24px] p-5 text-center font-bold capitalize" style={{ background: colors.cardBg }}>
            {cardLabel(topCard)}
          </div>
          <p className="mt-3 text-sm font-semibold capitalize">Active color: {activeColor}</p>
          <p className="mt-4 text-sm">{state.message}</p>
          <p className="mt-2 text-sm">Current turn: Player {state.currentPlayer + 1}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={drawForPlayer}
              disabled={state.currentPlayer !== 0 || winner !== -1 || state.hasDrawnThisTurn || isAiThinking}
              className="rounded-full px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: colors.breakBtn, color: colors.breakBtnText }}
            >
              Draw card
            </button>
            <button
              onClick={passTurn}
              disabled={state.currentPlayer !== 0 || winner !== -1 || !state.hasDrawnThisTurn || isAiThinking}
              className="rounded-full px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: colors.primary, color: colors.primaryText }}
            >
              Pass
            </button>
            <button
              onClick={restart}
              className="rounded-full px-4 py-2 text-sm font-bold"
              style={{ background: colors.cardBg, color: colors.secondaryText }}
            >
              Restart
            </button>
          </div>
          <div className="mt-5">
            <div className="text-sm font-bold">Recent moves</div>
            <div className="mt-2 space-y-2 text-sm">
              {state.turnFeed.map((entry, index) => (
                <div
                  key={`${entry}-${index}`}
                  className="rounded-2xl px-3 py-2"
                  style={{ background: colors.cardBg }}
                >
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          {[1, 2].map((player) => (
            <div key={player} className="rounded-[24px] p-4" style={{ background: colors.secondary }}>
              <div className="flex items-center justify-between">
                <div className="font-bold">Player {player + 1}</div>
                <div className="text-sm" style={{ color: colors.muted }}>
                  {state.players[player].length} card{state.players[player].length === 1 ? "" : "s"}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {state.players[player].map((card) => (
                  <div
                    key={card.id}
                    className="flex h-14 w-10 items-center justify-center rounded-xl text-[10px] font-bold tracking-wide"
                    style={{ background: colors.primary, color: colors.primaryText }}
                  >
                    UNO
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
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
              <span style={{ color: colors.muted }}>
                {selectedCard ? `Selected: ${cardLabel(selectedCard)}` : "Select a card to play."}
              </span>
              <button
                onClick={playSelectedCard}
                disabled={!selectedCard || state.currentPlayer !== 0 || winner !== -1 || isAiThinking || !canPlay(selectedCard, state)}
                className="rounded-full px-4 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: colors.breakBtn, color: colors.breakBtnText }}
              >
                Play selected
              </button>
              <button
                onClick={() => setSelectedCardId(null)}
                disabled={!selectedCard}
                className="rounded-full px-4 py-2 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: colors.secondary, color: colors.secondaryText }}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {state.players[0].map((card) => {
                const selected = selectedCardId === card.id;
                const playable = canPlay(card, state) && state.currentPlayer === 0 && !isAiThinking;

                return (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCardId((current) => (current === card.id ? null : card.id))}
                    className="rounded-[22px] px-4 py-5 text-left text-sm font-bold shadow-sm transition"
                    style={{
                      background: colors.cardBg,
                      color: colors.secondaryText,
                      opacity: playable ? 1 : 0.6,
                      boxShadow: selected ? `0 0 0 3px ${colors.burnWarn}` : `inset 0 0 0 1px ${colors.cardBorder}`
                    }}
                  >
                    {cardLabel(card)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
