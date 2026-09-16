// src/components/tcg/aiEngine.js
import * as GameEngine from '@/components/tcg/gameEngine';

// Small helper: sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * AI Engine
 * - Does not touch React state directly.
 * - Returns new state, plus optional log entries.
 *
 * Inputs:
 *   - gameState: the current full gameState object from TCG.jsx
 *   - opts: {
 *       delayMs?: number,
 *       difficulty?: 'easy'|'medium'|'hard',
 *       onStep?: (partialState, meta) => void   // optional hook for animations/step updates
 *     }
 *
 * Output:
 *   {
 *     nextState,
 *     aiActionLog: string[],
 *     battleLogAdds: Array<{player, action, cardDescription, turn}>
 *   }
 */
export async function runAITurn(gameState, opts = {}) {
  const delayMs = Number.isFinite(opts.delayMs) ? opts.delayMs : 700;
  const difficulty = opts.difficulty || gameState.aiDifficulty || 'medium';
  const onStep = typeof opts.onStep === 'function' ? opts.onStep : null;
  const engineContext = opts.engineContext || null;

  // Safety
  if (!gameState?.opponentState || !gameState?.playerState) {
    return { nextState: gameState, aiActionLog: ['AI: missing state'], battleLogAdds: [] };
  }

  // Clone (shallow) so we can mutate safely
  let gs = { ...gameState };
  let aiActionLog = [];
  const battleLogAdds = [];

  // Helpers
  const evalThreat = (creatureSlot) => {
    const card = creatureSlot?.card;
    if (!card) return 0;
    let threat = (creatureSlot.currentAP || card.ap || 0) * 2 + (creatureSlot.currentCH || card.ch || 0);
    if (card.keywords?.includes('stealth')) threat += 5;
    if (card.keywords?.includes('taunt')) threat += 3;
    if (card.keywords?.includes('haste')) threat += 4;
    if (Array.isArray(card.abilities) && card.abilities.length > 0) threat += 3;
    if (Array.isArray(creatureSlot.attachedCards) && creatureSlot.attachedCards.length > 0) threat += 4;
    return threat;
  };

  const evalCardValue = (card, boardState, enemyState) => {
    let value = 0;
    if (!card) return 0;

    if (card.card_type === 'creature') {
      value = (card.ap || 0) * 1.5 + (card.ch || 0);
      if (card.keywords?.includes('guardian')) value += 8;
      if (card.keywords?.includes('taunt')) value += 6;
      if (card.keywords?.includes('haste')) value += 5;
      if (card.keywords?.includes('stealth')) value += 4;
      if (card.abilities?.length > 0) value += 4;

      const enemyControllersCH = enemyState.controllers
        .filter(Boolean)
        .reduce((s, c) => s + (c.currentCH || c.card?.ch || 0), 0);
      const ourControllersCH = boardState.controllers
        .filter(Boolean)
        .reduce((s, c) => s + (c.currentCH || c.card?.ch || 0), 0);

      if (ourControllersCH < enemyControllersCH && (card.keywords?.includes('guardian') || card.keywords?.includes('taunt'))) {
        value += 10;
      }
    } else if (card.card_type === 'spell') {
      value = (card.cost || 0) * 2;
      const d = (card.description || '').toLowerCase();
      if (d.includes('destroy')) value += 10;
      if (d.includes('damage')) value += 8;
      if (d.includes('draw')) value += 6;
      if (d.includes('heal')) value += 5;
    } else if (card.card_type === 'artifact') {
      value = (card.cost || 0) * 2 + 5;
      if (card.is_attachment) value += 6;
    }
    return value;
  };

  const step = async (partialState, meta = {}) => {
    if (partialState) gs = partialState;
    if (onStep) onStep(gs, meta);
    await sleep(delayMs);
  };

  // --------------------------
  // DRAW
  // --------------------------
  await step(
    {
      ...gs,
      opponentState: GameEngine.drawCard(gs.opponentState),
      phase: 'energy'
    },
    { phase: 'draw' }
  );

  // --------------------------
  // ENERGY
  // --------------------------
  await step(
    {
      ...gs,
      opponentState: {
        ...gs.opponentState,
        shards: (gs.opponentState.shards || 0) + 1
      },
      phase: 'main'
    },
    { phase: 'energy' }
  );

  // --------------------------
  // MAIN
  // --------------------------
  const mainActions = [];

  // Priority: activate resting controllers
  // (your opponentState shape uses restingControllers per your current AI logic)
  while (Array.isArray(gs.opponentState.restingControllers) && gs.opponentState.restingControllers.length > 0) {
    const idx = 0;
    const ctrl = gs.opponentState.restingControllers[idx];
    if (!ctrl) break;
    if ((gs.opponentState.shards || 0) < (ctrl.cost || 0)) break;

    const nextOpp = GameEngine.activateRestingController(gs.opponentState, idx, null, gs.turnNumber ?? 1, engineContext);
    if (nextOpp === gs.opponentState) break;

    gs = { ...gs, opponentState: nextOpp };
    mainActions.push(`Activated ${ctrl.name || ctrl.card?.name || 'Controller'}`);
  }

  // Play cards if any active controller exists
  const hasActiveCtrl = gs.opponentState.controllers?.some((c) => c && c.isActive);
  if (hasActiveCtrl) {
    let cardsPlayed = 0;
    const maxCardsToPlay = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 5;

    while (cardsPlayed < maxCardsToPlay && (gs.opponentState.shards || 0) > 0) {
      const playable = (gs.opponentState.hand || []).filter((c) =>
        (c.cost || 0) <= (gs.opponentState.shards || 0) &&
        (c.card_type !== 'creature' || gs.opponentState.creatures.some(slot => slot === null))
      );
      if (!playable.length) break;

      let cardToPlay = null;

      if (difficulty === 'easy') {
        cardToPlay = playable[Math.floor(Math.random() * playable.length)];
      } else {
        // medium/hard: threat-aware
        const playerThreats = (gs.playerState.creatures || [])
          .filter(Boolean)
          .map((c) => ({ c, t: evalThreat(c) }));
        const highestThreat = Math.max(0, ...playerThreats.map((x) => x.t));

        if (highestThreat > (difficulty === 'hard' ? 12 : 8)) {
          const removal = playable.find(
            (c) =>
              c.card_type === 'spell' &&
              (String(c.description || '').toLowerCase().includes('destroy') ||
                String(c.description || '').toLowerCase().includes('damage'))
          );
          if (removal) cardToPlay = removal;
        }

        if (!cardToPlay) {
          const guardians = playable.filter((c) => c.card_type === 'creature' && c.keywords?.includes('guardian'));
          if (guardians.length) cardToPlay = guardians[0];
        }

        if (!cardToPlay) {
          cardToPlay = playable
            .slice()
            .sort((a, b) => evalCardValue(b, gs.opponentState, gs.playerState) - evalCardValue(a, gs.opponentState, gs.playerState))[0];
        }
      }

      if (!cardToPlay) break;

      const result = GameEngine.playCard(
        gs.opponentState,
        cardToPlay,
        'auto',
        null,
        gs.playerState,
        null,
        null,
        gs.turnNumber ?? 1,
        engineContext
      );
      gs = {
        ...gs,
        opponentState: result.playerState,
        playerState: result.opponentState || gs.playerState
      };

      mainActions.push(`Played ${cardToPlay.name}`);
      battleLogAdds.push({
        player: 'opponent',
        action: `Played ${cardToPlay.name}`,
        cardDescription: cardToPlay.description,
        turn: gs.turnNumber
      });

      cardsPlayed += 1;
    }
  }

  aiActionLog = mainActions.length ? mainActions : ['No cards played'];
  await step({ ...gs }, { phase: 'main', actions: aiActionLog });

  // Check win after main
  if (GameEngine.checkWinCondition(gs.playerState, gs.turnNumber ?? 1)) {
    return {
      nextState: { ...gs },
      aiActionLog: ['Opponent wins'],
      battleLogAdds
    };
  }

  // --------------------------
  // COMBAT
  // --------------------------
  gs = { ...gs, phase: 'combat' };
  await step({ ...gs }, { phase: 'combat' });

  const combatActions = [];
  const attackers = (gs.opponentState.creatures || [])
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c && c.canAttack && !c.hasAttacked);

  for (const { c: creature, i: attackerIndex } of attackers) {
    const playerCreatures = (gs.playerState.creatures || [])
      .map((c2, idx) => ({ c2, idx, t: evalThreat(c2) }))
      .filter(({ c2 }) => c2);

    let targetIndex = -1;
    let targetName = 'Controller';

    if (difficulty === 'easy') {
      if (playerCreatures.length && Math.random() > 0.3) {
        const r = playerCreatures[Math.floor(Math.random() * playerCreatures.length)];
        targetIndex = r.idx;
        targetName = r.c2.card?.name || 'Creature';
      }
    } else {
      const taunt = playerCreatures.find(({ c2 }) => c2.card?.keywords?.includes('taunt'));
      if (taunt) {
        targetIndex = taunt.idx;
        targetName = taunt.c2.card?.name || 'Taunt';
      } else {
        const killable = playerCreatures.find(({ c2 }) => (c2.currentCH || c2.card?.ch || 0) <= (creature.currentAP || creature.card?.ap || 0));
        if (killable) {
          targetIndex = killable.idx;
          targetName = killable.c2.card?.name || 'Creature';
        } else if (playerCreatures.length) {
          const high = playerCreatures.reduce((m, x) => (x.t > m.t ? x : m), playerCreatures[0]);
          targetIndex = high.idx;
          targetName = high.c2.card?.name || 'Creature';
        }
      }
    }

    const { attackerState, defenderState, blocked, message } = GameEngine.performAttack(
      gs.opponentState,
      gs.playerState,
      targetIndex,
      attackerIndex,
      'creature',
      gs.turnNumber ?? 1,
      engineContext
    );

    if (blocked) {
      combatActions.push(message || 'Attack blocked');
      continue;
    }

    gs = { ...gs, opponentState: attackerState, playerState: defenderState };

    combatActions.push(`${creature.card?.name || 'Creature'} → ${targetName}`);
    battleLogAdds.push({
      player: 'opponent',
      action: `${creature.card?.name || 'Creature'} attacks ${targetName}!`,
      cardDescription: creature.card?.description,
      turn: gs.turnNumber
    });

    if (GameEngine.checkWinCondition(gs.playerState, gs.turnNumber ?? 1)) break;
  }

  aiActionLog = combatActions.length ? combatActions : ['No attacks'];
  await step({ ...gs }, { phase: 'combat', actions: aiActionLog });

  if (GameEngine.checkWinCondition(gs.playerState, gs.turnNumber ?? 1)) {
    return {
      nextState: { ...gs },
      aiActionLog: ['Opponent wins'],
      battleLogAdds
    };
  }

  // --------------------------
  // END
  // --------------------------
  gs = { ...gs, phase: 'end' };
  await step({ ...gs }, { phase: 'end' });

  const nextTurnNumber = (gs.turnNumber || 0) + 1;

// IMPORTANT: pass the real global turn number into startNewTurn so canAttack + summoning sickness work.
const { playerState: newPlayerState, opponentState: newOpponentState } = GameEngine.startNewTurn(
  gs.playerState,
  gs.opponentState,
  nextTurnNumber,
  engineContext
);

const nextState = {
  ...gs,
  playerState: newPlayerState,
  opponentState: newOpponentState ?? gs.opponentState,
  turnNumber: nextTurnNumber,
  phase: 'draw',
  isMyTurn: true
};

  return {
    nextState,
    aiActionLog: [],
    battleLogAdds
  };
}
