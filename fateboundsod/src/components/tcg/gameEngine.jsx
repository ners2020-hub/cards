// src/components/tcg/gameEngine.js
// TCG Game Engine - Core Logic (Generic Effect Pipeline)
//
// Goals:
// - No card-id hardcoding for gameplay logic
// - Use card.abilities[] (DB) to resolve effects
// - Keep UI fallbacks OUT of engine (no cardUtils here)
// ----------------------------
// Global rules config
// ----------------------------

// No one can attack on turn 1 or 2, no matter what.
const ATTACKS_LOCKED_UNTIL_TURN = 3;

// Summoning sickness: units must wait 1 full turn after being summoned.
// (So if summoned on turn N, they can attack starting turn N+1, but also never before ATTACKS_LOCKED_UNTIL_TURN.)
function canAttackBySummonTurn(summonedTurn, currentTurn) {
  if (!summonedTurn) return false;
  return summonedTurn < currentTurn;
}

// ----------------------------
// State helpers
// ----------------------------

export function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function deepClone(obj) {
  return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}


function removeOneCardFromHand(hand, card) {
  const key = card?.code || card?.id;
  if (!Array.isArray(hand) || !key) return hand || [];
  const copy = [...hand];
  const idx = copy.findIndex(c => (c?.code || c?.id) === key);
  if (idx !== -1) copy.splice(idx, 1);
  return copy;
}

function getActiveController(state) {
  return (state.controllers || []).find(c => c && c.isActive) || null;
}

function setNextActiveController(state) {
  const next = (state.controllers || []).find(c => c !== null);
  if (!next) return state;
  const idx = (state.controllers || []).indexOf(next);
  (state.controllers || [])[idx] = { ...next, isActive: true };
  return state;
}

function removeCardFromZone(zone, card) {
  const idx = zone.findIndex(c => c === card);
  if (idx === -1) return zone;
  const copy = [...zone];
  copy.splice(idx, 1);
  return copy;
}

function findCardInZones(state, cardId, zones = ['deck', 'hand', 'graveyard']) {
  for (const z of zones) {
    const zone = state[z];
    if (!Array.isArray(zone)) continue;
    const found = zone.find(c => c && c.id === cardId);
    if (found) return { zone: z, card: found };
  }
  return null;
}

// ----------------------------
// Card instance constructors
// ----------------------------

function createCreatureInstance(card, currentTurnNumber = 1) {
  // Check for battle/spell immunity in passive abilities
  const immunities = [];
  if (Array.isArray(card.abilities)) {
    for (const ab of card.abilities) {
      if (ab.trigger === 'passive' && ab.action === 'battleImmunity') {
        immunities.push('Indestructible');
      }
      if (ab.trigger === 'passive' && ab.action === 'spellImmunity') {
        immunities.push('ImmuneToSpells');
      }
    }
  }

  // Note: even if a card has Haste/Charge, we still hard-lock all attacks until turn 3.
  const hasHasteLike = !!(card.keywords?.includes('Charge') || card.keywords?.includes('Haste'));

  return {
    card,
    currentAP: card.ap,
    currentCH: card.ch,
    maxCH: card.ch,
    statusEffects: immunities,
    // Engine uses summonedTurn + turn gating to determine attack legality.
    summonedTurn: currentTurnNumber,
    canAttack: hasHasteLike, // will be corrected by startNewTurn() and global lock checks
    hasAttacked: false,
    isZombified: false,
    attacksRemaining: 1,
    equippedArtifacts: []
  };
}

function createArtifactInstance(card, equippedTo = null) {
  return {
    card,
    turnsActive: 0,
    turnsRemaining: null,
    equippedTo
  };
}

// ----------------------------
// Abilities: DB-only (no effect registry)
// ----------------------------

/**
 * Returns a list of ability objects from card.abilities[] filtered by trigger.
 * Source of truth: DB (card.abilities[]). If missing, silently returns [].
 */
function getAbilitiesForTrigger(card, trigger) {
  if (Array.isArray(card?.abilities) && card.abilities.length > 0) {
    return card.abilities.filter(ab => {
      if (!ab) return false;
      const abTrigger = ab.trigger || ab.type;
      return abTrigger === trigger && (ab.action || ab.params);
    });
  }
  return [];
}

/**
 * Resolve a single DB ability object by dispatching on ability.action.
 * Unified pipeline for all DB-driven abilities.
 */
function resolveDbAbility({
  playerState,
  opponentState,
  ability,
  sourceCard,
  sourceType,
  sourceIndex,
  targetInfo,
  engineContext
}) {
  const action = ability.action || 'none';
  const params = ability.params || {};
  const cost = ability.cost || {};
const target = (typeof ability.target === 'string'
  ? ability.target
  : (ability.target && typeof ability.target === 'object' ? ability.target.type : null)
) || 'none';

  let ps = playerState;
  let os = opponentState;

  // Cost validation: check shards before executing
  if (cost.shards && ps.shards < cost.shards) {
    return { playerState, opponentState };
  }
  if (cost.ch && sourceType === 'controller') {
    const activeCtrl = getActiveController(ps);
    if (activeCtrl && activeCtrl.currentCH < cost.ch) {
      return { playerState, opponentState };
    }
    // Validate controllers array exists
    if (!ps.controllers) ps.controllers = [null, null, null];
  }

  // Deduct costs
  if (cost.shards) {
    ps = { ...ps, shards: Math.max(0, ps.shards - cost.shards) };
  }
  if (cost.ch && sourceType === 'controller') {
    const activeIdx = ps.controllers.findIndex(c => c && c.isActive);
    if (activeIdx >= 0) {
      const newControllers = [...(ps.controllers || [])];
      newControllers[activeIdx] = {
        ...newControllers[activeIdx],
        currentCH: newControllers[activeIdx].currentCH - cost.ch
      };
      ps = { ...ps, controllers: newControllers };
    }
  }

  // Dispatch by action
  switch (action) {
    case 'draw': {
      const count = params.count ?? 1;
      for (let i = 0; i < count; i++) {
        if (!ps.deck || ps.deck.length === 0) break;
        const [drawnCard, ...remainingDeck] = ps.deck;
        ps = {
          ...ps,
          hand: [...(ps.hand || []), drawnCard],
          deck: remainingDeck,
          deckSize: remainingDeck.length
        };
      }
      return { playerState: ps, opponentState: os };
    }

    case 'damage': {
      const amount = params.amount ?? 1;
      const isSpellDamage = sourceType === 'spell' || sourceType === 'artifact';

      if (target === 'self' && sourceType === 'creature' && sourceIndex !== null) {
        const c = ps.creatures[sourceIndex];
        if (c) {
          const newCreatures = [...ps.creatures];
          newCreatures[sourceIndex] = { ...c, currentCH: c.currentCH - amount };
          if (newCreatures[sourceIndex].currentCH <= 0) {
            newCreatures[sourceIndex] = null;
            ps.graveyard = [...(ps.graveyard || []), c.card];
          }
          ps = { ...ps, creatures: newCreatures };
        }
        return { playerState: ps, opponentState: os };
      } else if (target === 'self' && sourceType === 'controller' && sourceIndex !== null) {
        const c = ps.controllers[sourceIndex];
        if (c) {
          const newControllers = [...ps.controllers];
          newControllers[sourceIndex] = { ...c, currentCH: c.currentCH - amount };
          if (newControllers[sourceIndex].currentCH <= 0) {
            newControllers[sourceIndex] = null;
            ps = setNextActiveController(ps);
          }
          ps = { ...ps, controllers: newControllers };
        }
        return { playerState: ps, opponentState: os };
      } else if (target === 'enemy_controller') {
        const idx = (os?.controllers || []).findIndex(c => c && c.isActive);
        if (idx >= 0 && os) {
          const ctrl = (os.controllers || [])[idx];
          const immuneToSpells = isSpellDamage && ctrl.statusEffects?.includes('ImmuneToSpells');
          if (immuneToSpells) {
            return { playerState: ps, opponentState: os };
          }
          const newControllers = [...(os.controllers || [])];
          newControllers[idx] = { ...ctrl, currentCH: Math.max(0, ctrl.currentCH - amount) };
          if (newControllers[idx].currentCH <= 0) {
            newControllers[idx] = null;
            const next = newControllers.find(c => c !== null);
            if (next) {
              const nextIdx = newControllers.indexOf(next);
              newControllers[nextIdx] = { ...next, isActive: true };
            }
          }
          os = { ...os, controllers: newControllers };
        }
      } else if (target === 'all_enemies' || (target === 'all_enemy_creatures' && os)) {
        const elementFilter = params.elementFilter;
        const cardIdFilter = params.cardIdFilter;
        const killedCards = [];
        const newCreatures = (os.creatures || []).map(c => {
          if (!c) return null;
          if (elementFilter && c.card.element !== elementFilter) return c;
          if (cardIdFilter && c.card.id !== cardIdFilter) return c;
          const immuneToSpells = isSpellDamage && c.statusEffects?.includes('ImmuneToSpells');
          if (immuneToSpells) return c;
          const newCH = c.currentCH - amount;
          if (newCH <= 0) {
            killedCards.push(c.card);
            return null;
          }
          return { ...c, currentCH: newCH };
        });
        os = { ...os, creatures: newCreatures, graveyard: [...(os.graveyard || []), ...killedCards] };
      } else if (target === 'all_enemy_controllers' && os) {
        const newControllers = (os.controllers || []).map(c => {
          if (!c) return null;
          const immuneToSpells = isSpellDamage && c.statusEffects?.includes('ImmuneToSpells');
          if (immuneToSpells) return c;
          const newCH = c.currentCH - amount;
          if (newCH <= 0) return null;
          return { ...c, currentCH: newCH };
        });
        os = { ...os, controllers: newControllers };
        os = setNextActiveController(os);
      } else if (target === 'all_ally_creatures') {
        const killedCards = [];
        const newCreatures = (ps.creatures || []).map(c => {
          if (!c) return null;
          const newCH = c.currentCH - amount;
          if (newCH <= 0) {
            killedCards.push(c.card);
            return null;
          }
          return { ...c, currentCH: newCH };
        });
        ps = { ...ps, creatures: newCreatures, graveyard: [...(ps.graveyard || []), ...killedCards] };
      } else if (target === 'all_ally_controllers') {
        const newControllers = (ps.controllers || []).map(c => {
          if (!c) return null;
          const newCH = c.currentCH - amount;
          if (newCH <= 0) return null;
          return { ...c, currentCH: newCH };
        });
        ps = { ...ps, controllers: newControllers };
        ps = setNextActiveController(ps);
      } else if (targetInfo?.type === 'creature' && os) {
        const tc = os.creatures[targetInfo.index];
        if (tc) {
          const immuneToSpells = isSpellDamage && tc.statusEffects?.includes('ImmuneToSpells');
          if (immuneToSpells) {
            return { playerState: ps, opponentState: os };
          }
          const newOppCreatures = [...os.creatures];
          const newCH = tc.currentCH - amount;
          if (newCH <= 0) {
            newOppCreatures[targetInfo.index] = null;
            if (tc.originalOwner === 'player') {
              ps = { ...ps, graveyard: [...(ps.graveyard || []), tc.card] };
            } else {
              os = { ...os, graveyard: [...(os.graveyard || []), tc.card] };
            }
            os = { ...os, creatures: newOppCreatures };
          } else {
            newOppCreatures[targetInfo.index] = { ...tc, currentCH: newCH };
            os = { ...os, creatures: newOppCreatures };
          }
        }
      }
      return { playerState: ps, opponentState: os };
    }

    case 'heal': {
      const amount = params.amount ?? 1;
      if (target === 'self' && sourceType === 'creature' && sourceIndex !== null) {
        const c = ps.creatures[sourceIndex];
        if (c) {
          const newCreatures = [...ps.creatures];
          newCreatures[sourceIndex] = { ...c, currentCH: Math.min(c.maxCH, c.currentCH + amount) };
          ps = { ...ps, creatures: newCreatures };
        }
      } else if (target === 'self' && sourceType === 'controller' && sourceIndex !== null) {
        const c = ps.controllers[sourceIndex];
        if (c) {
          const newControllers = [...ps.controllers];
          newControllers[sourceIndex] = { ...c, currentCH: Math.min(c.maxCH, c.currentCH + amount) };
          ps = { ...ps, controllers: newControllers };
        }
      } else if (target === 'ally_controller') {
        const idx = ps.controllers.findIndex(c => c && c.isActive);
        if (idx >= 0) {
          const ctrl = ps.controllers[idx];
          const newControllers = [...ps.controllers];
          newControllers[idx] = { ...ctrl, currentCH: Math.min(ctrl.maxCH, ctrl.currentCH + amount) };
          ps = { ...ps, controllers: newControllers };
        }
      } else if (target === 'all_ally_creatures') {
        const newCreatures = (ps.creatures || []).map(c => {
          if (!c) return null;
          return { ...c, currentCH: Math.min(c.maxCH, c.currentCH + amount) };
        });
        ps = { ...ps, creatures: newCreatures };
      } else if (target === 'all_ally_controllers') {
        const newControllers = (ps.controllers || []).map(c => {
          if (!c) return null;
          return { ...c, currentCH: Math.min(c.maxCH, c.currentCH + amount) };
        });
        ps = { ...ps, controllers: newControllers };
      } else if (targetInfo?.type === 'creature' && ps) {
        const tc = ps.creatures[targetInfo.index];
        if (tc) {
          const newCreatures = [...ps.creatures];
          newCreatures[targetInfo.index] = { ...tc, currentCH: Math.min(tc.maxCH, tc.currentCH + amount) };
          ps = { ...ps, creatures: newCreatures };
        }
      }
      return { playerState: ps, opponentState: os };
    }

    case 'gainShards': {
      // IMPORTANT: shards are NOT capped. maxShards is just the UI "baseline" (starts at 10).
      const amount = params.amount ?? 1;
      ps = { ...ps, shards: (Number(ps.shards ?? 0) + amount) };
      return { playerState: ps, opponentState: os };
    }

    case 'summon': {
      const cardId = params.cardId;
      if (!cardId) return { playerState: ps, opponentState: os };

      const found = findCardInZones(ps, cardId, ['deck', 'hand']);
      if (!found) return { playerState: ps, opponentState: os };

      let nextState = { ...ps };
      nextState[found.zone] = removeCardFromZone(nextState[found.zone], found.card);
      if (found.zone === 'deck') nextState.deckSize = nextState.deck.length;

      const slot = nextState.creatures.findIndex(c => c === null);
      if (slot === -1) return { playerState: ps, opponentState: os };

      const inst = createCreatureInstance(found.card, params.currentTurnNumber ?? 1);
      const newCreatures = [...nextState.creatures];
      newCreatures[slot] = inst;
      nextState.creatures = newCreatures;

      ps = nextState;
      return { playerState: ps, opponentState: os };
    }

    // (rest unchanged)
    case 'summonTokens': {
      const cardCode = params.card_code || params.cardCode;
      const count = params.amount ?? params.count ?? 1;

      let nextState = { ...ps };
      let added = 0;

      if (cardCode) {
        // Tokens must resolve by card.code from DB. We rely on a caller-provided resolver
        // so the engine stays DB-driven but remains pure.
        const resolveCardByCode = engineContext?.resolveCardByCode;
        const tokenTemplate = typeof resolveCardByCode === 'function' ? resolveCardByCode(cardCode) : null;

        for (let tokenIdx = 0; tokenIdx < count; tokenIdx++) {
          const emptySlot = nextState.creatures.findIndex(c => c === null);
          if (emptySlot === -1) break;

          const tokenCard = tokenTemplate
            ? { ...tokenTemplate, id: tokenTemplate.code || tokenTemplate.id || cardCode, code: tokenTemplate.code || cardCode, is_token: true }
            : {
                // Fallback only (dev safety). Proper token cards should exist in DB.
                id: cardCode,
                code: cardCode,
                name: params.name || 'Token',
                card_type: 'creature',
                element: params.element || 'neutral',
                cost: 0,
                ap: params.ap ?? 1,
                ch: params.ch ?? 1,
                description: params.description || 'A summoned token.',
                keywords: params.keywords || (params.guardian ? ['guardian'] : []),
                abilities: params.abilities || null,
                art_url: params.art_url || '',
                is_token: true,
                __placeholder_token: true
              };

          const inst = createCreatureInstance(tokenCard, params.currentTurnNumber ?? 1);
          inst.canAttack = params.canAttack ?? false;
          inst.isToken = true;

          const newCreatures = [...nextState.creatures];
          newCreatures[emptySlot] = inst;
          nextState.creatures = newCreatures;
          added++;
        }
      } else {
        const ap = params.ap ?? 1;
        const ch = params.ch ?? 1;
        const name = params.name || 'Token';
        const element = params.element || 'neutral';
        const canAttack = params.canAttack ?? false;

        for (let i = 0; i < nextState.creatures.length && added < count; i++) {
          if (nextState.creatures[i] !== null) continue;

          const tokenCard = {
            id: `token_${element}_${Date.now()}_${added}`,
            name,
            card_type: 'creature',
            element,
            cost: 0,
            ap,
            ch,
            description: 'A summoned token.',
            keywords: params.guardian ? ['guardian'] : [],
            art_url: '',
            is_token: true
          };

          const inst = createCreatureInstance(tokenCard, params.currentTurnNumber ?? 1);
          inst.canAttack = canAttack;
          inst.isToken = true;

          const newCreatures = [...nextState.creatures];
          newCreatures[i] = inst;
          nextState.creatures = newCreatures;
          added++;
        }
      }

      ps = nextState;
      return { playerState: ps, opponentState: os };
    }

    // unchanged cases...
    case 'destroy':
    case 'search':
    case 'applyStatus':
    case 'modifyStats':
    case 'preventPlay':
    case 'setFlag':
    case 'clearFlag':
    case 'takeControl':
    case 'battleImmunity':
    case 'spellImmunity':
    case 'aura':
    case 'passive':
    case 'none':
    default:
      return { playerState: ps, opponentState: os };
  }
}

// Helper reused in resolveAbility
function applyStatusToCreature_fn(state, idx, status, options = {}) {
  const c = state.creatures[idx];
  if (!c) return state;
  const statuses = new Set([...(c.statusEffects || [])]);
  statuses.add(status);
  const updated = { ...c, statusEffects: [...statuses] };

  if (status === 'Freeze' || status === 'Bind') updated.canAttack = false;
  if (status === 'Paralyze') updated.skipNextAction = true;

  if (options.duration) updated[`${status.toLowerCase()}Duration`] = options.duration;

  const newCreatures = [...state.creatures];
  newCreatures[idx] = updated;
  return { ...state, creatures: newCreatures };
}

// ----------------------------
// Public API: initial state
// ----------------------------

export function createInitialPlayerState(deck, controllers) {
  const filteredDeck = (deck || []).filter(c => c.card_type !== 'controller');
  const controllersFromDeck = (deck || []).filter(c => c.card_type === 'controller');
  const allControllers = [...(controllers || []), ...controllersFromDeck];

  // Deduplicate controllers by card ID to prevent duplicate resting controllers
  const uniqueControllers = [];
  const seenIds = new Set();
  for (const ctrl of allControllers) {
    const id = ctrl?.id || ctrl?.code;
    if (id && !seenIds.has(id)) {
      seenIds.add(id);
      uniqueControllers.push(ctrl);
    }
  }

  const shuffledDeck = shuffleArray([...filteredDeck]);

  const hand = shuffledDeck.slice(0, 5);
  const remainingDeck = shuffledDeck.slice(5);

  return {
    // Start baseline at 10 (UI shows /10), but gains are uncapped.
    shards: 10,
    maxShards: 10,
    controllers: [null, null, null],
    restingControllers: Array.isArray(uniqueControllers) ? uniqueControllers : [],
    creatures: [null, null, null, null, null],
    artifacts: [null, null, null],
    hand,
    deckSize: remainingDeck.length,
    deck: remainingDeck,
    graveyard: [],
    void: []
  };
}

export function drawCard(playerState) {
  if (!playerState.deck || playerState.deck.length === 0) return playerState;

  const [drawnCard, ...remainingDeck] = playerState.deck;

  return {
    ...playerState,
    hand: [...playerState.hand, drawnCard],
    deck: remainingDeck,
    deckSize: remainingDeck.length
  };
}

// ----------------------------
// Generic resolution pipeline
// ----------------------------

function resolveTriggeredEffects({
  sourceState,
  targetState,
  trigger,
  sourceCard,
  sourceType,
  sourceIndex,
  targetInfo = null,
  engineContext = null
}) {
  let ps = sourceState;
  let os = targetState;

  const abilities = getAbilitiesForTrigger(sourceCard, trigger);
  for (const ab of abilities) {
    // Check condition
    if (ab.condition?.type === 'ifOnField') {
      let isOnField = false;
      if (sourceType === 'creature' && sourceIndex !== null && ps.creatures[sourceIndex]) {
        isOnField = ps.creatures[sourceIndex].card.id === sourceCard.id;
      } else if (sourceType === 'controller' && sourceIndex !== null && ps.controllers[sourceIndex]) {
        isOnField = ps.controllers[sourceIndex].card.id === sourceCard.id;
      } else if (sourceType === 'artifact' && sourceIndex !== null && ps.artifacts[sourceIndex]) {
        isOnField = ps.artifacts[sourceIndex].card.id === sourceCard.id;
      }
      if (!isOnField) continue;
    }

    if (ab.action && ab.action !== 'unknown') {
      const out = resolveDbAbility({
        playerState: ps,
        opponentState: os,
        ability: ab,
        sourceCard,
        sourceType,
        sourceIndex,
        targetInfo,
        engineContext
      });
      ps = out.playerState;
      os = out.opponentState;
    } else if (ab.params && ab.params.type) {
      const out = resolveEffect({
        playerState: ps,
        opponentState: os,
        effect: ab.params,
        effectKey: ab.id,
        sourceCard,
        sourceType,
        sourceIndex,
        targetInfo,
        engineContext
      });
      ps = out.playerState;
      os = out.opponentState;
    }
  }

  return { playerState: ps, opponentState: os };
}

/**
 * Core effect resolver.
 * Add new effect "type" handlers here over time.
 */
function resolveEffect({
  playerState,
  opponentState,
  effect,
  effectKey,
  sourceCard,
  sourceType,
  sourceIndex,
  targetInfo,
  engineContext
}) {
  let ps = playerState;
  let os = opponentState;

  const activeCtrl = getActiveController(ps);

  // ----------------------------
  // Utility closures
  // ----------------------------

  const addToHand = (state, card) => ({ ...state, hand: [...(state.hand || []), card] });

  const spendShards = (state, amount) => ({ ...state, shards: Math.max(0, state.shards - amount) });

  // IMPORTANT: shards are NOT capped
  const gainShards = (state, amount) => ({ ...state, shards: Number(state.shards ?? 0) + amount });

  const healController = (state, amount, which = 'active') => {
    const idx = which === 'active'
      ? (state.controllers || []).findIndex(c => c && c.isActive)
      : 0;

    if (idx < 0 || !(state.controllers || [])[idx]) return state;
    const ctrl = (state.controllers || [])[idx];
    const newControllers = [...(state.controllers || [])];
    newControllers[idx] = { ...ctrl, currentCH: ctrl.currentCH + amount };
    return { ...state, controllers: newControllers };
  };

  const damageActiveController = (state, amount) => {
    const idx = (state.controllers || []).findIndex(c => c && c.isActive);
    if (idx < 0) return state;
    const ctrl = (state.controllers || [])[idx];
    const newControllers = [...(state.controllers || [])];
    newControllers[idx] = { ...ctrl, currentCH: ctrl.currentCH - amount };
    if (newControllers[idx].currentCH <= 0) {
      newControllers[idx] = null;
      const next = newControllers.find(c => c !== null);
      if (next) {
        const nextIdx = newControllers.indexOf(next);
        newControllers[nextIdx] = { ...next, isActive: true };
      }
    }
    return { ...state, controllers: newControllers };
  };

  const findEmptyCreatureSlot = state => (state.creatures || []).findIndex(c => c === null);

  const summonCardIdToField = (state, cardId, options = {}) => {
    const found = findCardInZones(state, cardId, options.searchZones || ['deck', 'hand', 'graveyard']);
    if (!found) return state;

    let nextState = { ...state };

    nextState[found.zone] = removeCardFromZone(nextState[found.zone], found.card);
    if (found.zone === 'deck') nextState.deckSize = nextState.deck.length;

    const slot = findEmptyCreatureSlot(nextState);
    if (slot === -1) return nextState;

    const inst = createCreatureInstance(found.card, options.currentTurnNumber ?? 1);
    inst.canAttack = !!options.canAttack;
    inst.attacksRemaining = options.attacksRemaining ?? inst.attacksRemaining;
    inst.temporary = !!options.temporary;

    const newCreatures = [...nextState.creatures];
    newCreatures[slot] = inst;
    nextState.creatures = newCreatures;

    return nextState;
  };

  const summonTokens = (state, tokenSpec) => {
    const { count, ap, ch, element, name, keywords, image_url } = tokenSpec;
    let nextState = { ...state };
    let added = 0;

    const resolveCardByCode = engineContext?.resolveCardByCode;
    const template = tokenSpec?.card_code && typeof resolveCardByCode === 'function'
      ? resolveCardByCode(tokenSpec.card_code)
      : null;

    for (let i = 0; i < nextState.creatures.length && added < count; i++) {
      if (nextState.creatures[i] !== null) continue;

      const tokenCard = template
        ? { ...template, id: template.code || template.id || tokenSpec.card_code, code: template.code || tokenSpec.card_code, is_token: true }
        : {
            id: tokenSpec.id || `token_${element || 'generic'}_${Math.random().toString(16).slice(2)}`,
            name: name || 'Token',
            card_type: 'creature',
            element: element || 'neutral',
            cost: 0,
            ap,
            ch,
            description: tokenSpec.description || 'A summoned token.',
            keywords: keywords || [],
            art_url: image_url || '',
            is_token: true,
            __placeholder_token: true
          };

      const inst = createCreatureInstance(tokenCard, tokenSpec.currentTurnNumber ?? 1);
      inst.canAttack = !!tokenSpec.canAttack;
      inst.attacksRemaining = tokenSpec.attacksRemaining ?? 1;
      inst.isToken = true;

      const newCreatures = [...nextState.creatures];
      newCreatures[i] = inst;
      nextState.creatures = newCreatures;

      added++;
    }

    return nextState;
  };

  const applyStatusToCreature = (state, idx, status, options = {}) => {
    return applyStatusToCreature_fn(state, idx, status, options);
  };

  // ----------------------------
  // Effect "type" handlers
  // ----------------------------

  switch (effect.type) {
    case 'passive':
      return { playerState: ps, opponentState: os };

    case 'onPlay': {
      if (effect.search) {
        const zones = effect.search.location === 'graveyard' ? ['graveyard']
          : effect.search.location === 'hand' ? ['hand']
            : effect.search.location === 'deck' ? ['deck']
              : ['deck', 'hand', 'graveyard'];

        let found = null;
        for (const z of zones) {
          const zone = ps[z] || [];
          found = zone.find(c => {
            if (!c) return false;
            if (effect.search.id && c.id !== effect.search.id) return false;
            if (effect.search.cardType && c.card_type !== effect.search.cardType) return false;
            if (effect.search.element && c.element !== effect.search.element) return false;
            return true;
          });
          if (found) {
            const newZone = removeCardFromZone(zone, found);
            ps = { ...ps, [z]: newZone };
            if (z === 'deck') ps.deckSize = ps.deck.length;
            ps = addToHand(ps, found);
            break;
          }
        }
      }

      if (effect.summonTokens) {
        ps = summonTokens(ps, effect.summonTokens);
      }

      if (effect.summon) {
        ps = summonCardIdToField(ps, effect.summon, { searchZones: ['deck', 'hand'] });
      }

      if (effect.freeze && effect.targetType && targetInfo?.type === 'creature') {
        os = applyStatusToCreature(os, targetInfo.index, 'Freeze', { duration: effect.freeze });
      }

      return { playerState: ps, opponentState: os };
    }

    case 'onDeath': {
      if (effect.heal && effect.target === 'controller') {
        ps = healController(ps, effect.heal, 'active');
      }
      if (effect.onDeath?.freeze && os && targetInfo?.type === 'creature') {
        os = applyStatusToCreature(os, targetInfo.index, 'Freeze', { duration: effect.onDeath.freeze });
      }
      return { playerState: ps, opponentState: os };
    }

    case 'onKill': {
      if (effect.heal && effect.target === 'controller') {
        ps = healController(ps, effect.heal, 'active');
      }
      if (effect.effect === 'no_exhaust' && sourceType === 'creature' && sourceIndex !== null) {
        const c = ps.creatures[sourceIndex];
        if (c) {
          const newCreatures = [...ps.creatures];
          newCreatures[sourceIndex] = { ...c, hasAttacked: false, canAttack: true };
          ps = { ...ps, creatures: newCreatures };
        }
      }
      return { playerState: ps, opponentState: os };
    }

    case 'activated': {
      if (effect.cost?.ch && activeCtrl) {
        const ctrlIdx = ps.controllers.indexOf(activeCtrl);
        const newControllers = [...ps.controllers];
        const newCH = activeCtrl.currentCH - effect.cost.ch;
        if (newCH < 0) return { playerState: ps, opponentState: os };
        newControllers[ctrlIdx] = { ...activeCtrl, currentCH: newCH };
        ps = { ...ps, controllers: newControllers };
      }

      if (effect.draw) {
        for (let i = 0; i < effect.draw; i++) ps = drawCard(ps);
      }

      if (effect.gainShards) {
        ps = gainShards(ps, effect.gainShards);
      }

      return { playerState: ps, opponentState: os };
    }

    case 'targeted': {
      if (!os) return { playerState: ps, opponentState: os };

      if (effect.cost?.shards) {
        if (ps.shards < effect.cost.shards) return { playerState: ps, opponentState: os };
        ps = spendShards(ps, effect.cost.shards);
      }

      if (effect.damage) {
        if (effect.targetType === 'enemy_controller' || targetInfo?.type === 'controller') {
          os = damageActiveController(os, effect.damage);
        } else if (targetInfo?.type === 'creature') {
          const tc = os.creatures[targetInfo.index];
          if (tc) {
            const newOppCreatures = [...os.creatures];
            const newCH = tc.currentCH - effect.damage;
            if (newCH <= 0) {
              os = { ...os, graveyard: [...(os.graveyard || []), tc.card] };
              newOppCreatures[targetInfo.index] = null;
            } else {
              newOppCreatures[targetInfo.index] = { ...tc, currentCH: newCH };
            }
            os = { ...os, creatures: newOppCreatures };
          }
        }
      }

      if (effect.heal) {
        if (targetInfo?.type === 'controller') {
          os = healController(os, effect.heal, 'active');
        }
        if (targetInfo?.type === 'ally_controller') {
          ps = healController(ps, effect.heal, 'active');
        }
        if (targetInfo?.type === 'creature') {
          const tc = ps.creatures[targetInfo.index];
          if (tc) {
            const newCreatures = [...ps.creatures];
            newCreatures[targetInfo.index] = { ...tc, currentCH: tc.currentCH + effect.heal };
            ps = { ...ps, creatures: newCreatures };
          }
        }
      }

      if (effect.paralyze && targetInfo?.type === 'creature') {
        os = applyStatusToCreature(os, targetInfo.index, 'Paralyze', { duration: effect.paralyze });
      }

      if (effect.bind && targetInfo?.type === 'creature') {
        os = applyStatusToCreature(os, targetInfo.index, 'Bind', { duration: effect.bind });
      }

      if (effect.apBonus && targetInfo?.type === 'creature') {
        const tc = ps.creatures[targetInfo.index];
        if (tc) {
          const newCreatures = [...ps.creatures];
          newCreatures[targetInfo.index] = {
            ...tc,
            currentAP: tc.currentAP + effect.apBonus,
            temporaryAP: (tc.temporaryAP || 0) + effect.apBonus
          };
          ps = { ...ps, creatures: newCreatures };
        }
      }

      if (effect.haste && targetInfo?.type === 'creature') {
        const tc = ps.creatures[targetInfo.index];
        if (tc) {
          const newCreatures = [...ps.creatures];
          newCreatures[targetInfo.index] = { ...tc, canAttack: true };
          ps = { ...ps, creatures: newCreatures };
        }
      }

      return { playerState: ps, opponentState: os };
    }

    case 'aoe': {
      if (!os) return { playerState: ps, opponentState: os };
      const out = dealDamageToAllCreatures({
        attackerState: ps,
        defenderState: os,
        damage: effect.damage || 0,
        protectElement: effect.protectElement || null,
        sourceCard,
        sourceType
      });
      return { playerState: out.attackerState, opponentState: out.defenderState };
    }

    case 'spell': {
      return { playerState: ps, opponentState: os };
    }

    default:
      return { playerState: ps, opponentState: os };
  }
}

// ----------------------------
// Generic AOE with protectElement + onDeath triggers
// ----------------------------

function dealDamageToAllCreatures({ attackerState, defenderState, damage, protectElement = null, sourceCard, sourceType }) {
  let as = attackerState;
  let ds = defenderState;

  const killedDefenders = [];

  const newDefCreatures = (ds.creatures || []).map((c, idx) => {
    if (!c) return null;

    if (protectElement && c.card?.element === protectElement) return c;

    const newCH = c.currentCH - damage;
    if (newCH <= 0) {
      killedDefenders.push({ creature: c, index: idx });
      if (c.originalOwner === 'attacker') {
        as.graveyard = [...(as.graveyard || []), c.card];
      } else {
        ds.graveyard = [...(ds.graveyard || []), c.card];
      }
      return null;
    }
    return { ...c, currentCH: newCH };
  });

  ds = { ...ds, creatures: newDefCreatures };

  for (const kd of killedDefenders) {
    const out = resolveTriggeredEffects({
      sourceState: ds,
      targetState: as,
      trigger: 'onDeath',
      sourceCard: kd.creature.card,
      sourceType: 'creature',
      sourceIndex: kd.index,
      targetInfo: null
    });
    ds = out.playerState;
    as = out.opponentState;
  }

  return { attackerState: as, defenderState: ds };
}

// ----------------------------
// Main actions: play cards, activate controllers, combat
// ----------------------------

export function activateRestingController(
  playerState,
  controllerIndex,
  targetSlot = null,
  currentTurnNumber = 1,
  engineContext = null
) {
  const ps = deepClone(playerState);
  const controller = ps.restingControllers[controllerIndex];
  if (!controller || ps.shards < controller.cost) return playerState;

  let slot = targetSlot;
  if (slot === null) slot = ps.controllers.findIndex(c => c === null);
  if (slot === -1 || ps.controllers[slot] !== null) return playerState;

  const newControllers = [...ps.controllers];
  newControllers[slot] = {
    card: controller,
    currentCH: controller.ch,
    maxCH: controller.ch,
    currentAP: controller.ap || 0,
    isActive: slot === 0 || !ps.controllers.some(c => c !== null),
    // Summoning sickness tracking
    summonedTurn: currentTurnNumber,
    canAttack: false,
    hasAttacked: false,
    attacksRemaining: 1,
    equippedArtifacts: []
  };

  ps.controllers = newControllers;
  ps.restingControllers = (ps.restingControllers || []).filter((_, i) => i !== controllerIndex);
  ps.shards -= controller.cost;

  const out = resolveTriggeredEffects({
    sourceState: ps,
    targetState: null,
    trigger: 'onPlay',
    sourceCard: controller,
    sourceType: 'controller',
    sourceIndex: slot,
    engineContext
  });

  const final = applyPassiveEffects(out.playerState);
  return final;
}


function getOnPlayTargetRequirement(card) {
  const abs = getAbilitiesForTrigger(card, 'onPlay');
  for (const ab of abs) {
    const t = (typeof ab?.target === 'string'
      ? ab.target
      : (ab?.target && typeof ab.target === 'object' ? ab.target.type : null)
    );

    if (!t) continue;
    const tl = String(t).toLowerCase();

    // Auto-targets / no selection needed
    if (tl === 'none' || tl === 'self' || tl === 'enemy_controller' || tl === 'ally_controller') continue;
    if (tl.startsWith('all_') || tl === 'all_enemies') continue;

    // Anything that mentions a creature requires a chosen target
    if (tl.includes('creature')) return true;

    // Some controller-targeted effects may need a selection (future-proof)
    if (tl.includes('controller') && tl.includes('target')) return true;
  }
  return false;
}

export function playCard(
  playerState,
  card,
  slotType,
  slotIndex,
  opponentState = null,
  attachTargetIndex = null,
  targetInfo = null,
  currentTurnNumber = 1,
  engineContext = null
) {
  if (playerState.shards < card.cost) return { playerState, opponentState, needsTarget: false };

  let ps = deepClone(playerState);
  let os = opponentState ? deepClone(opponentState) : null;

  ps.shards -= card.cost;
  ps.hand = removeOneCardFromHand(ps.hand || [], card);

  const onPlayNeedsTarget = getOnPlayTargetRequirement(card);

  if (card.card_type === 'creature') {
    const emptySlot = slotIndex ?? (ps.creatures || []).findIndex(c => c === null);
    if (emptySlot === -1) return { playerState: ps, opponentState: os, needsTarget: false };

    const inst = createCreatureInstance(card, currentTurnNumber);
    inst.canAttack = false;

    const newCreatures = [...ps.creatures];
    newCreatures[emptySlot] = inst;
    ps.creatures = newCreatures;

    if (onPlayNeedsTarget && !targetInfo) {
      return {
        playerState: ps,
        opponentState: os,
        needsTarget: true,
        pendingPlay: { sourceType: 'creature', sourceIndex: emptySlot, card, currentTurnNumber }
      };
    }

    const out = resolveTriggeredEffects({
      sourceState: ps,
      targetState: os,
      trigger: 'onPlay',
      sourceCard: card,
      sourceType: 'creature',
      sourceIndex: emptySlot,
      targetInfo,
      engineContext
    });
    ps = out.playerState;
    os = out.opponentState;

    ps = applyPassiveEffects(ps);
    if (os) os = applyPassiveEffects(os);

    return { playerState: ps, opponentState: os, needsTarget: false };
  }

  if (card.card_type === 'artifact') {
    const needsAttachment = !!card.is_attachment ||
      card.description?.toLowerCase().includes('attach') ||
      card.description?.toLowerCase().includes('equip');
    if (needsAttachment && attachTargetIndex === null) {
      return { playerState, opponentState, needsTarget: true, cardToAttach: card };
    }

    const emptySlot = slotIndex ?? ps.artifacts.findIndex(a => a === null);
    if (emptySlot === -1) return { playerState: ps, opponentState: os, needsTarget: false };

    const artifactInstance = createArtifactInstance(card, attachTargetIndex);
    const newArtifacts = [...ps.artifacts];
    newArtifacts[emptySlot] = artifactInstance;
    ps.artifacts = newArtifacts;

    attachInstance(ps, artifactInstance, attachTargetIndex);

    if (onPlayNeedsTarget && !targetInfo) {
      return {
        playerState: ps,
        opponentState: os,
        needsTarget: true,
        pendingPlay: { sourceType: 'artifact', sourceIndex: emptySlot, card, currentTurnNumber }
      };
    }

    const out = resolveTriggeredEffects({
      sourceState: ps,
      targetState: os,
      trigger: 'onPlay',
      sourceCard: card,
      sourceType: 'artifact',
      sourceIndex: emptySlot,
      targetInfo,
      engineContext
    });
    ps = out.playerState;
    os = out.opponentState;

    ps = applyPassiveEffects(ps);
    if (os) os = applyPassiveEffects(os);

    return { playerState: ps, opponentState: os, needsTarget: false };
  }

  if (card.card_type === 'spell') {
    const needsAttachment = !!card.is_attachment ||
      card.description?.toLowerCase().includes('attach') ||
      card.description?.toLowerCase().includes('equip');
    if (needsAttachment && attachTargetIndex === null) {
      return { playerState, opponentState, needsTarget: true, cardToAttach: card };
    }

    const emptySlot = slotIndex ?? ps.artifacts.findIndex(a => a === null);
    if (emptySlot === -1) return { playerState: ps, opponentState: os, needsTarget: false };

    const spellInstance = createArtifactInstance(card, attachTargetIndex);
    const newArtifacts = [...ps.artifacts];
    newArtifacts[emptySlot] = spellInstance;
    ps.artifacts = newArtifacts;

    attachInstance(ps, spellInstance, attachTargetIndex);

    if (onPlayNeedsTarget && !targetInfo) {
      return {
        playerState: ps,
        opponentState: os,
        needsTarget: true,
        pendingPlay: {
          sourceType: 'spell',
          sourceIndex: emptySlot,
          card,
          artifactSlotIndex: emptySlot,
          currentTurnNumber
        }
      };
    }

    const out = resolveTriggeredEffects({
      sourceState: ps,
      targetState: os,
      trigger: 'onPlay',
      sourceCard: card,
      sourceType: 'spell',
      sourceIndex: emptySlot,
      targetInfo,
      engineContext
    });
    ps = out.playerState;
    os = out.opponentState;

    let postResolve = null;
    if (!card.is_persistent) {
      postResolve = {
        type: 'discardFromArtifacts',
        artifactSlotIndex: emptySlot,
        cardKey: card.code || card.id,
        toGraveyard: true
      };
    }

    ps = applyPassiveEffects(ps);
    if (os) os = applyPassiveEffects(os);

    return { playerState: ps, opponentState: os, needsTarget: false, postResolve };
  }

  return { playerState: ps, opponentState: os, needsTarget: false };
}

export function resolvePendingPlay(playerState, opponentState, pendingPlay, targetInfo = null, engineContext = null) {
  if (!pendingPlay?.card) return { playerState, opponentState, postResolve: null };

  let ps = deepClone(playerState);
  let os = opponentState ? deepClone(opponentState) : null;

  const out = resolveTriggeredEffects({
    sourceState: ps,
    targetState: os,
    trigger: 'onPlay',
    sourceCard: pendingPlay.card,
    sourceType: pendingPlay.sourceType,
    sourceIndex: pendingPlay.sourceIndex ?? null,
    targetInfo,
    engineContext
  });

  ps = applyPassiveEffects(out.playerState);
  os = out.opponentState ? applyPassiveEffects(out.opponentState) : out.opponentState;

  let postResolve = null;
  if (pendingPlay.sourceType === 'spell' && !pendingPlay.card.is_persistent) {
    const slot = pendingPlay.artifactSlotIndex ?? pendingPlay.sourceIndex;
    postResolve = {
      type: 'discardFromArtifacts',
      artifactSlotIndex: slot,
      cardKey: pendingPlay.card.code || pendingPlay.card.id,
      toGraveyard: true
    };
  }

  return { playerState: ps, opponentState: os, postResolve };
}

export function applyPostResolve(playerState, postResolve) {
  if (!postResolve || postResolve.type !== 'discardFromArtifacts') return playerState;
  const ps = deepClone(playerState);
  const idx = postResolve.artifactSlotIndex;
  if (idx === null || idx === undefined || idx < 0) return ps;

  const inst = (ps.artifacts || [])[idx];
  if (!inst) return ps;

  const newArtifacts = [...(ps.artifacts || [])];
  newArtifacts[idx] = null;
  ps.artifacts = newArtifacts;

  if (postResolve.toGraveyard) {
    ps.graveyard = [...(ps.graveyard || []), inst.card];
  }
  return ps;
}

function attachInstance(ps, instance, attachTargetIndex) {
  if (attachTargetIndex === null || attachTargetIndex === undefined) return;

  if (attachTargetIndex >= 0) {
    const target = ps.creatures[attachTargetIndex];
    if (!target) return;
    const newCreatures = [...ps.creatures];
    newCreatures[attachTargetIndex] = {
      ...target,
      equippedArtifacts: [...(target.equippedArtifacts || []), instance]
    };
    ps.creatures = newCreatures;
    return;
  }

  if (attachTargetIndex === -1) {
    const activeIdx = ps.controllers.findIndex(c => c && c.isActive);
    if (activeIdx === -1) return;
    const newControllers = [...ps.controllers];
    const ctrl = newControllers[activeIdx];
    newControllers[activeIdx] = {
      ...ctrl,
      equippedArtifacts: [...(ctrl.equippedArtifacts || []), instance]
    };
    ps.controllers = newControllers;
  }
}

// ----------------------------
// Combat
// ----------------------------

export function performAttack(
  attackerState,
  defenderState,
  targetIndex,
  attackerIndex,
  attackerType = 'creature',
  currentTurnNumber = 1,
  engineContext = null
) {
  const earlyOut = (message) => ({ attackerState, defenderState, blocked: true, message });

  // Hard lock: no attacks on turn 1 or 2, no matter what.
  if (Number(currentTurnNumber ?? 1) < ATTACKS_LOCKED_UNTIL_TURN) {
    return earlyOut('Attacks are locked until turn 3.');
  }

  let as = deepClone(attackerState);
  let ds = deepClone(defenderState);

  let attacker;
  let attackerAP;
  let isControllerAttack = false;

  if (attackerType === 'controller') {
    attacker = as.controllers[attackerIndex];
    if (!attacker) return earlyOut('No attacker.');

    // Summoning sickness for controllers
    if (!canAttackBySummonTurn(attacker.summonedTurn, currentTurnNumber)) {
      return earlyOut('Summoning sickness.');
    }

    const remaining = Number(attacker.attacksRemaining ?? 1);
    if (!attacker.canAttack || remaining <= 0) return earlyOut('No attacks remaining.');

    attackerAP = attacker.currentAP ?? attacker.card.ap ?? 0;
    isControllerAttack = true;
  } else {
    attacker = as.creatures[attackerIndex];
    if (!attacker) return earlyOut('No attacker.');

    // Summoning sickness for creatures
    if (!canAttackBySummonTurn(attacker.summonedTurn, currentTurnNumber)) {
      return earlyOut('Summoning sickness.');
    }

    const remaining = Number(attacker.attacksRemaining ?? 1);
    if (!attacker.canAttack || remaining <= 0) return earlyOut('No attacks remaining.');

    attackerAP = attacker.currentAP ?? 0;
  }

  const guardianCreature = (ds.creatures || []).find(c => c && c.card.keywords?.includes('Guardian'));
  let defenderIndex = targetIndex;
  let targetDefender = null;

  if (guardianCreature) {
    defenderIndex = ds.creatures.indexOf(guardianCreature);
    targetDefender = guardianCreature;
  } else if (targetIndex >= 0 && (ds.creatures || [])[targetIndex]) {
    targetDefender = ds.creatures[targetIndex];
  }

  // Helper to consume one attack on the attacker after combat resolution
  const consumeAttack = () => {
    if (isControllerAttack) {
      const newControllers = [...as.controllers];
      const aCtrl = newControllers[attackerIndex];
      if (!aCtrl) return;
      const nextRemaining = Math.max(0, Number(aCtrl.attacksRemaining ?? 1) - 1);
      newControllers[attackerIndex] = {
        ...aCtrl,
        attacksRemaining: nextRemaining,
        hasAttacked: nextRemaining <= 0,
        canAttack: nextRemaining > 0
      };
      as.controllers = newControllers;
    } else {
      const newCreatures = [...as.creatures];
      const a = newCreatures[attackerIndex];
      if (!a) return;
      const nextRemaining = Math.max(0, Number(a.attacksRemaining ?? 1) - 1);
      newCreatures[attackerIndex] = {
        ...a,
        attacksRemaining: nextRemaining,
        hasAttacked: nextRemaining <= 0,
        canAttack: nextRemaining > 0
      };
      as.creatures = newCreatures;
    }
  };

  // If targeting controller (-1) OR no creatures exist, hit active controller
  if (!targetDefender && (targetIndex === -1 || !(ds.creatures || []).some(c => c !== null))) {
    ds = {
      ...ds,
      controllers: (ds.controllers || []).map(c => {
        if (!c || !c.isActive) return c;
        const nextCH = c.currentCH - attackerAP;
        if (nextCH <= 0) return null;
        return { ...c, currentCH: nextCH };
      })
    };
    ds = setNextActiveController(ds);

    // Recoil is based on defender controller AP
    const defenderCtrl = defenderState.controllers.find(c => c && c.isActive);
    const recoil = defenderCtrl?.card?.ap || 0;

    if (isControllerAttack) {
      const newControllers = [...as.controllers];
      const aCtrl = newControllers[attackerIndex];
      if (aCtrl) {
        const immuneToRecoil = aCtrl.statusEffects?.includes('Indestructible') ||
          aCtrl.statusEffects?.includes('ImmuneToRecoil');
        const nextCH = immuneToRecoil ? aCtrl.currentCH : aCtrl.currentCH - recoil;

        if (!immuneToRecoil && nextCH <= 0) {
          newControllers[attackerIndex] = null;
          as.controllers = newControllers;
          as = setNextActiveController(as);
        } else {
          newControllers[attackerIndex] = { ...aCtrl, currentCH: nextCH };
          as.controllers = newControllers;
        }
      }
    } else {
      const newCreatures = [...as.creatures];
      const a = newCreatures[attackerIndex];
      if (a) {
        const immuneToRecoil = a.statusEffects?.includes('Indestructible') ||
          a.statusEffects?.includes('ImmuneToRecoil');
        const nextCH = immuneToRecoil ? a.currentCH : a.currentCH - recoil;

        if (!immuneToRecoil && nextCH <= 0) {
          as.graveyard = [...(as.graveyard || []), a.card];
          newCreatures[attackerIndex] = null;
          as.creatures = newCreatures;

          const out = resolveTriggeredEffects({
            sourceState: as,
            targetState: ds,
            trigger: 'onDeath',
            sourceCard: a.card,
            sourceType: 'creature',
            sourceIndex: attackerIndex,
            engineContext
          });
          as = out.playerState;
          ds = out.opponentState;
        } else {
          newCreatures[attackerIndex] = { ...a, currentCH: nextCH };
          as.creatures = newCreatures;
        }
      }
    }

    consumeAttack();

    as = applyPassiveEffects(as);
    ds = applyPassiveEffects(ds);
    return { attackerState: as, defenderState: ds, blocked: false, message: null };
  }

  if (!targetDefender) return earlyOut('Invalid target.');

  const defenderAP = targetDefender.currentAP ?? 0;
  targetDefender.currentCH -= attackerAP;

  // Recoil / retaliation
  if (isControllerAttack) {
    const newControllers = [...as.controllers];
    const aCtrl = newControllers[attackerIndex];
    if (aCtrl) {
      const immuneToRecoil = aCtrl.statusEffects?.includes('Indestructible') ||
        aCtrl.statusEffects?.includes('ImmuneToRecoil');
      const nextCH = immuneToRecoil ? aCtrl.currentCH : aCtrl.currentCH - defenderAP;

      if (!immuneToRecoil && nextCH <= 0) {
        newControllers[attackerIndex] = null;
        as.controllers = newControllers;
        as = setNextActiveController(as);
      } else {
        newControllers[attackerIndex] = { ...aCtrl, currentCH: nextCH };
        as.controllers = newControllers;
      }
    }
  } else {
    const immuneToRecoil = attacker.statusEffects?.includes('Indestructible') ||
      attacker.statusEffects?.includes('ImmuneToRecoil');
    if (!immuneToRecoil) attacker.currentCH -= defenderAP;
  }

  // Defender dies
  if (targetDefender.currentCH <= 0) {
    if (targetDefender.originalOwner === 'attacker') {
      as.graveyard = [...(as.graveyard || []), targetDefender.card];
    } else {
      ds.graveyard = [...(ds.graveyard || []), targetDefender.card];
    }

    const newDefCreatures = [...ds.creatures];
    newDefCreatures[defenderIndex] = null;
    ds.creatures = newDefCreatures;

    // Defender onDeath
    {
      const out = resolveTriggeredEffects({
        sourceState: ds,
        targetState: as,
        trigger: 'onDeath',
        sourceCard: targetDefender.card,
        sourceType: 'creature',
        sourceIndex: defenderIndex,
        engineContext
      });
      ds = out.playerState;
      as = out.opponentState;
    }

    // Attacker onKill (creatures only)
    if (!isControllerAttack) {
      const out = resolveTriggeredEffects({
        sourceState: as,
        targetState: ds,
        trigger: 'onKill',
        sourceCard: attacker.card,
        sourceType: 'creature',
        sourceIndex: attackerIndex,
        targetInfo: { type: 'creature', index: defenderIndex },
        engineContext
      });
      as = out.playerState;
      ds = out.opponentState;
    }
  } else {
    const newDefCreatures = [...ds.creatures];
    newDefCreatures[defenderIndex] = { ...targetDefender };
    ds.creatures = newDefCreatures;
  }

  // Attacker dies (creatures only)
  if (!isControllerAttack) {
    const immuneToRecoil = attacker.statusEffects?.includes('Indestructible') ||
      attacker.statusEffects?.includes('ImmuneToRecoil');

    if (!immuneToRecoil && attacker.currentCH <= 0) {
      if (attacker.originalOwner === 'opponent') {
        ds.graveyard = [...(ds.graveyard || []), attacker.card];
      } else {
        as.graveyard = [...(as.graveyard || []), attacker.card];
      }

      const newAtkCreatures = [...as.creatures];
      newAtkCreatures[attackerIndex] = null;
      as.creatures = newAtkCreatures;

      const out = resolveTriggeredEffects({
        sourceState: as,
        targetState: ds,
        trigger: 'onDeath',
        sourceCard: attacker.card,
        sourceType: 'creature',
        sourceIndex: attackerIndex,
        engineContext
      });
      as = out.playerState;
      ds = out.opponentState;
    } else {
      const newAtkCreatures = [...as.creatures];
      newAtkCreatures[attackerIndex] = { ...attacker };
      as.creatures = newAtkCreatures;
    }
  }

  consumeAttack();

  as = applyPassiveEffects(as);
  ds = applyPassiveEffects(ds);
  return { attackerState: as, defenderState: ds, blocked: false, message: null };
}


// ----------------------------
// Passives
// ----------------------------

export function applyPassiveEffects(playerState) {
  if (!playerState) return playerState;

  const ps = deepClone(playerState);
  const activeController = getActiveController(ps);
  if (!activeController) return ps;

  // ----------------------------
  // Recompute stats from a clean baseline WITHOUT healing or refreshing attacks.
  // We preserve:
  // - damage taken (maxCH - currentCH)
  // - remaining attacks for this turn (attacksRemaining)
  // ----------------------------

  let creatures = (ps.creatures || []).map(c => {
    if (!c) return null;

    const prevMax = Number(c.maxCH ?? c.card.ch ?? 0);
    const prevCur = Number(c.currentCH ?? c.card.ch ?? 0);
    const damageTaken = Math.max(0, prevMax - prevCur);

    const baseMax = Number(c.card.ch ?? 0);
    const baseAP = Number(c.card.ap ?? 0);

    const nextMax = baseMax;
    const nextCur = Math.max(0, nextMax - damageTaken);

    return {
      ...c,
      currentAP: baseAP,
      maxCH: nextMax,
      currentCH: nextCur
      // attacksRemaining preserved for now
    };
  });

  const auraAbilities = [];

  // Controller passives
  const ctrlPassives = getAbilitiesForTrigger(activeController.card, 'passive');
  for (const ab of ctrlPassives) {
    if (ab.action === 'aura' || ab.action === 'modifyStats') {
      auraAbilities.push({
        ...ab,
        sourceType: 'controller',
        params: ab.params ? { ...ab.params, element: ab.params.element?.toLowerCase() } : {}
      });
    }
  }

  // Creature passives (auras / modifyStats)
  (creatures || []).forEach((c, idx) => {
    if (!c) return;
    const passives = getAbilitiesForTrigger(c.card, 'passive');
    for (const ab of passives) {
      if (ab.action === 'aura' || ab.action === 'modifyStats') {
        auraAbilities.push({ ...ab, sourceType: 'creature', sourceIndex: idx });
      }
    }
  });

  // Equipped artifact passives (auras / modifyStats)
  (creatures || []).forEach((c, idx) => {
    if (!c || !(c.equippedArtifacts || []).length) return;
    c.equippedArtifacts.forEach(inst => {
      const passives = getAbilitiesForTrigger(inst.card, 'passive');
      for (const ab of passives) {
        if (ab.action === 'aura' || ab.action === 'modifyStats') {
          auraAbilities.push({ ...ab, sourceType: 'artifact', sourceIndex: idx });
        }
      }
    });
  });

  // Apply auras / modifyStats
  creatures = (creatures || []).map(c => {
    if (!c) return null;
    let updated = { ...c };

    for (const aura of auraAbilities) {
      const params = aura.params || {};
      const target = aura.target || {};

      if (params.element && updated.card.element !== params.element) continue;
      if (target.type === 'ally_creature' && updated.card.card_type !== 'creature') continue;

      if (aura.action === 'modifyStats') {
        if (params.stat === 'ap' && params.amount) updated.currentAP += params.amount;
        if (params.stat === 'ch' && params.amount) {
          updated.maxCH += params.amount;
          updated.currentCH += params.amount;
        }
      }

      if (params.apBonus) updated.currentAP += params.apBonus;
      if (params.chBonus) {
        updated.maxCH += params.chBonus;
        updated.currentCH += params.chBonus;
      }

      // Haste-like auras should not "unlock" turn 1/2 attacks.
      // They only loosen per-unit restrictions. Global lock is enforced in performAttack/startNewTurn.
      if (params.haste) updated.canAttack = true;
    }

    // Clamp after buffs
    updated.currentCH = Math.max(0, Math.min(updated.currentCH, updated.maxCH));
    return updated;
  });

  // Controllers: baseline recompute without healing
  ps.controllers = (ps.controllers || []).map(ctrl => {
    if (!ctrl) return null;

    const prevMax = Number(ctrl.maxCH ?? ctrl.card.ch ?? 0);
    const prevCur = Number(ctrl.currentCH ?? ctrl.card.ch ?? 0);
    const damageTaken = Math.max(0, prevMax - prevCur);

    const baseMax = Number(ctrl.card.ch ?? 0);
    const baseAP = Number(ctrl.card.ap ?? 0);

    let updated = {
      ...ctrl,
      currentAP: baseAP,
      maxCH: baseMax,
      currentCH: Math.max(0, baseMax - damageTaken)
      // attacksRemaining preserved for now
    };

    for (const aura of auraAbilities) {
      const params = aura.params || {};
      const target = aura.target || {};

      if (target.type === 'ally_creature') continue;

      if (aura.action === 'modifyStats') {
        if (params.stat === 'ap' && params.amount) updated.currentAP += params.amount;
        if (params.stat === 'ch' && params.amount) {
          updated.maxCH += params.amount;
          updated.currentCH += params.amount;
        }
      }

      if (params.apBonus) updated.currentAP += params.apBonus;
      if (params.chBonus) {
        updated.maxCH += params.chBonus;
        updated.currentCH += params.chBonus;
      }
    }

    updated.currentCH = Math.max(0, Math.min(updated.currentCH, updated.maxCH));
    return updated;
  });

  // Apply non-aura passives (double strike etc) and clamp remaining attacks.
  creatures = (creatures || []).map(c => {
    if (!c) return null;

    let allowedAttacks = 1;

    const passives = getAbilitiesForTrigger(c.card, 'passive');
    for (const ab of passives) {
      if (ab.action === 'aura') continue;
      const params = ab.params || {};

      if (params.doubleStrike || params.attacksRemaining === 2) {
        allowedAttacks = Math.max(allowedAttacks, 2);
      }
      if (params.cannotAttack) {
        c.canAttack = false;
      }
    }

    const remaining = c.attacksRemaining;
    return {
      ...c,
      attacksRemaining: remaining === undefined || remaining === null
        ? allowedAttacks
        : Math.min(Number(remaining), allowedAttacks)
    };
  });

  ps.creatures = creatures;

  // Apply equipped artifact bonuses (non-aura)
  ps.creatures = (ps.creatures || []).map(c => {
    if (!c) return null;

    const equipped = c.equippedArtifacts || [];
    let apBonus = 0;
    let chBonus = 0;

    for (const inst of equipped) {
      const passives = getAbilitiesForTrigger(inst.card, 'passive');
      for (const ab of passives) {
        const params = ab.params || {};

        if (params.apBonus) apBonus += params.apBonus;
        if (params.bloodBonus && c.card.element === 'blood') apBonus += params.bloodBonus;
        if (params.chBonus) chBonus += params.chBonus;

        if (ab.action === 'modifyStats') {
          if (params.stat === 'ap' && params.amount) apBonus += params.amount;
          if (params.stat === 'ch' && params.amount) chBonus += params.amount;
        }
      }
    }

    const nextMax = c.maxCH + chBonus;
    const nextCur = Math.max(0, Math.min(c.currentCH + chBonus, nextMax));

    return { ...c, currentAP: c.currentAP + apBonus, maxCH: nextMax, currentCH: nextCur };
  });

  ps.controllers = (ps.controllers || []).map(ctrl => {
    if (!ctrl) return null;

    let apBonus = 0;
    let chBonus = 0;
    const equipped = ctrl.equippedArtifacts || [];

    for (const inst of equipped) {
      const passives = getAbilitiesForTrigger(inst.card, 'passive');
      for (const ab of passives) {
        const params = ab.params || {};

        if (params.apBonus) apBonus += params.apBonus;
        if (params.chBonus) chBonus += params.chBonus;

        if (ab.action === 'modifyStats') {
          if (params.stat === 'ap' && params.amount) apBonus += params.amount;
          if (params.stat === 'ch' && params.amount) chBonus += params.amount;
        }
      }
    }

    const nextMax = Number(ctrl.maxCH ?? ctrl.card.ch ?? 0) + chBonus;
    const nextCur = Math.max(0, Math.min(Number(ctrl.currentCH ?? 0) + chBonus, nextMax));

    return {
      ...ctrl,
      currentAP: (ctrl.card.ap || 0) + apBonus,
      maxCH: nextMax,
      currentCH: nextCur
    };
  });

  return ps;
}


// ----------------------------
// Turn progression
// ----------------------------

export function startNewTurn(playerState, opponentState = null, currentTurnNumber = 1, engineContext = null) {
  let ps = deepClone(playerState);
  let os = opponentState ? deepClone(opponentState) : null;

  // Tick artifacts/spells
  ps.artifacts = (ps.artifacts || []).map(a => {
    if (!a) return null;
    return { ...a, turnsActive: (a.turnsActive || 0) + 1 };
  });

  // Trigger startOfTurn on controller + creatures
  const activeCtrl = getActiveController(ps);
  if (activeCtrl) {
    const out = resolveTriggeredEffects({
      sourceState: ps,
      targetState: os,
      trigger: 'startOfTurn',
      sourceCard: activeCtrl.card,
      sourceType: 'controller',
      sourceIndex: ps.controllers.indexOf(activeCtrl),
      engineContext
    });
    ps = out.playerState;
    os = out.opponentState;
  }

  (ps.creatures || []).forEach((c, idx) => {
    if (!c) return;
    const out = resolveTriggeredEffects({
      sourceState: ps,
      targetState: os,
      trigger: 'startOfTurn',
      sourceCard: c.card,
      sourceType: 'creature',
      sourceIndex: idx,
      engineContext
    });
    ps = out.playerState;
    os = out.opponentState;
  });

  // Reset attack state + re-evaluate "canAttack" based on (1) global lock and (2) summoning sickness.
  ps.controllers = (ps.controllers || []).map(c => {
    if (!c) return null;

    const canAttackNow =
      Number(currentTurnNumber ?? 1) >= ATTACKS_LOCKED_UNTIL_TURN &&
      canAttackBySummonTurn(c.summonedTurn, currentTurnNumber);

    return {
      ...c,
      hasAttacked: false,
      attacksRemaining: undefined,
      canAttack: canAttackNow
    };
  });

  ps.creatures = (ps.creatures || []).map(c => {
    if (!c) return null;

    let currentAP = c.currentAP;
    if (c.temporaryAP) currentAP -= c.temporaryAP;
    if (c.temporaryAPReduction) currentAP += c.temporaryAPReduction;

    const statusEffects = (c.statusEffects || []).filter(e => e !== 'Freeze');

    const canAttackNow =
      Number(currentTurnNumber ?? 1) >= ATTACKS_LOCKED_UNTIL_TURN &&
      canAttackBySummonTurn(c.summonedTurn, currentTurnNumber) &&
      !statusEffects.includes('Freeze') &&
      !statusEffects.includes('Bind');

    return {
      ...c,
      currentAP,
      canAttack: canAttackNow,
      hasAttacked: false,
      attacksRemaining: undefined,
      statusEffects,
      temporaryAP: undefined,
      temporaryAPReduction: undefined
    };
  });

  // IMPORTANT:
  // Do NOT shard-tick here. Your phase flow already handles Energy -> gain shard.
  // This prevents double shard gains when turn changes.

  ps = applyPassiveEffects(ps);
  if (os) os = applyPassiveEffects(os);

  return { playerState: ps, opponentState: os };
}

// ----------------------------
// Win condition
// ----------------------------

// Loss is when you have zero controllers remaining on the field.
// Also: nobody can win on turn 1 or 2 (prevents early-effect edge cases).
export function checkWinCondition(playerState, currentTurnNumber = 1) {
  if (Number(currentTurnNumber ?? 1) < ATTACKS_LOCKED_UNTIL_TURN) return false;
  return (playerState.controllers || []).every(c => c === null);
}

// ----------------------------
// Activated ability entrypoint (generic)
// ----------------------------

export function activateControllerAbility(playerState, opponentState, abilityType, targetInfo = null) {
  const ps = deepClone(playerState);
  const os = opponentState ? deepClone(opponentState) : null;

  const active = getActiveController(ps);
  if (!active) return { playerState, opponentState };

  const trigger = abilityType === 'active' ? 'active' : 'passive';
  const activeIndex = ps.controllers.indexOf(active);

  const abilities = getAbilitiesForTrigger(active.card, trigger);

  for (const ab of abilities) {
    const cost = ab.cost || {};

    if (cost.shards && ps.shards < cost.shards) {
      return { playerState, opponentState };
    }

    if (cost.ch && active.currentCH < cost.ch) {
      return { playerState, opponentState };
    }
  }

  const out = resolveTriggeredEffects({
    sourceState: ps,
    targetState: os,
    trigger,
    sourceCard: active.card,
    sourceType: 'controller',
    sourceIndex: activeIndex,
    targetInfo
  });

  const finalPS = applyPassiveEffects(out.playerState);
  const finalOS = out.opponentState ? applyPassiveEffects(out.opponentState) : out.opponentState;

  return { playerState: finalPS, opponentState: finalOS };
}

export function activateCreatureAbility(playerState, opponentState, creatureIndex, abilityType, targetInfo = null) {
  const ps = deepClone(playerState);
  const os = opponentState ? deepClone(opponentState) : null;

  const creature = ps.creatures[creatureIndex];
  if (!creature) return { playerState, opponentState };

  const trigger = abilityType === 'active' ? 'active' : 'passive';

  const abilities = getAbilitiesForTrigger(creature.card, trigger);

  for (const ab of abilities) {
    const cost = ab.cost || {};

    if (cost.shards && ps.shards < cost.shards) {
      return { playerState, opponentState };
    }

    if (cost.ch && creature.currentCH < cost.ch) {
      return { playerState, opponentState };
    }
  }

  const out = resolveTriggeredEffects({
    sourceState: ps,
    targetState: os,
    trigger,
    sourceCard: creature.card,
    sourceType: 'creature',
    sourceIndex: creatureIndex,
    targetInfo
  });

  const finalPS = applyPassiveEffects(out.playerState);
  const finalOS = out.opponentState ? applyPassiveEffects(out.opponentState) : out.opponentState;

  return { playerState: finalPS, opponentState: finalOS };
}

export function activateArtifactAbility(playerState, opponentState, artifactIndex, abilityType, targetInfo = null) {
  const ps = deepClone(playerState);
  const os = opponentState ? deepClone(opponentState) : null;

  const artifact = ps.artifacts[artifactIndex];
  if (!artifact) return { playerState, opponentState };

  const trigger = abilityType === 'active' ? 'active' : 'passive';

  const abilities = getAbilitiesForTrigger(artifact.card, trigger);

  for (const ab of abilities) {
    const cost = ab.cost || {};

    if (cost.shards && ps.shards < cost.shards) {
      return { playerState, opponentState };
    }
  }

  const out = resolveTriggeredEffects({
    sourceState: ps,
    targetState: os,
    trigger,
    sourceCard: artifact.card,
    sourceType: 'artifact',
    sourceIndex: artifactIndex,
    targetInfo
  });

  const finalPS = applyPassiveEffects(out.playerState);
  const finalOS = out.opponentState ? applyPassiveEffects(out.opponentState) : out.opponentState;

  return { playerState: finalPS, opponentState: finalOS };
}

// ----------------------------
// Phase progression (used by TCG.jsx)
// ----------------------------
// Phases expected by UI: draw -> energy -> main -> combat -> end turn
//
// IMPORTANT DESIGN:
// - UI owns gameState, including isMyTurn and the fixed slots:
//     gameState.playerState   (human player)
//     gameState.opponentState (CPU / opponent)
// - Engine must NEVER swap those slots.
// - endPhase uses gameState.isMyTurn to decide which sub-state is currently active.

export function endPhase(gameState) {
  if (!gameState) return gameState;

  const phase = gameState.phase || "draw";
  const isPlayerTurn = !!gameState.isMyTurn;

  const playerState = gameState.playerState;
  const opponentState = gameState.opponentState;

  const activeState = isPlayerTurn ? playerState : opponentState;

  // Helper to write back only the active side
  const writeActive = (nextActive) => {
    return {
      playerState: isPlayerTurn ? nextActive : playerState,
      opponentState: isPlayerTurn ? opponentState : nextActive
    };
  };

  // DRAW -> draw 1 card (active side)
  if (phase === "draw") {
    const nextActive = drawCard(activeState);
    const out = writeActive(nextActive);
    return {
      ...gameState,
      phase: "energy",
      ...out
    };
  }

  // ENERGY -> gain 1 shard (active side) - NOT CAPPED
  if (phase === "energy") {
    const shards = Number(activeState?.shards ?? 0);
    const nextActive = {
      ...activeState,
      shards: shards + 1
    };
    const out = writeActive(nextActive);
    return {
      ...gameState,
      phase: "main",
      ...out
    };
  }

  // MAIN -> COMBAT
  if (phase === "main") {
    return {
      ...gameState,
      phase: "combat",
    };
  }

  // COMBAT -> end turn:
  // Flip isMyTurn, startNewTurn for the NEW active side, without swapping slots.
  const nextTurnNumber = Number(gameState.turnNumber ?? 1) + 1;

  if (isPlayerTurn) {
    // Opponent will start their turn now
    const out = startNewTurn(opponentState, playerState, nextTurnNumber);
    return {
      ...gameState,
      isMyTurn: false,
      phase: "draw",
      turnNumber: nextTurnNumber,
      playerState: out.opponentState ?? playerState,
      opponentState: out.playerState,
    };
  }

  // Player will start their turn now
  const out = startNewTurn(playerState, opponentState, nextTurnNumber);
  return {
    ...gameState,
    isMyTurn: true,
    phase: "draw",
    turnNumber: nextTurnNumber,
    playerState: out.playerState,
    opponentState: out.opponentState ?? opponentState,
  };
}