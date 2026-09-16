// src/components/tcg/engine/abilityDispatcher.js
// Ability dispatcher (DB-driven)
//
// Purpose:
// - Replace in-file switch(action) blocks with a registry-style dispatcher.
// - Keep engine pure: all card behavior comes from DB abilities.
//
// NOTE: Handlers are intentionally minimal and operate on plain state.

function asTargetType(target) {
  if (typeof target === 'string') return target;
  if (target && typeof target === 'object') return target.type || null;
  return null;
}

/**
 * Dispatches a DB ability action.
 *
 * Required args:
 * - playerState, opponentState
 * - ability (DB ability object)
 * - sourceType/sourceIndex
 * - targetInfo
 * - engineContext (token resolution)
 * - helpers: a bag of engine helpers to avoid tight coupling
 */
export function dispatchAbilityAction({
  playerState,
  opponentState,
  ability,
  sourceType,
  sourceIndex,
  targetInfo,
  engineContext,
  helpers
}) {
  const action = ability?.action || 'none';
  const params = ability?.params || {};
  const cost = ability?.cost || {};
  const target = asTargetType(ability?.target) || 'none';

  let ps = playerState;
  let os = opponentState;

  // Cost validation
  if (cost.shards && Number(ps?.shards ?? 0) < cost.shards) {
    return { playerState, opponentState };
  }

  if (cost.ch && sourceType === 'controller') {
    const activeCtrl = helpers.getActiveController(ps);
    if (activeCtrl && Number(activeCtrl.currentCH ?? 0) < cost.ch) {
      return { playerState, opponentState };
    }
    if (!ps.controllers) ps.controllers = [null, null, null];
  }

  // Deduct costs
  if (cost.shards) {
    ps = { ...ps, shards: Math.max(0, Number(ps.shards ?? 0) - cost.shards) };
  }

  if (cost.ch && sourceType === 'controller') {
    const activeIdx = (ps.controllers || []).findIndex(c => c && c.isActive);
    if (activeIdx >= 0) {
      const newControllers = [...(ps.controllers || [])];
      newControllers[activeIdx] = {
        ...newControllers[activeIdx],
        currentCH: Number(newControllers[activeIdx].currentCH ?? 0) - cost.ch
      };
      ps = { ...ps, controllers: newControllers };
    }
  }

  const handlers = {
    draw: () => {
      const count = params.count ?? 1;
      let next = ps;
      for (let i = 0; i < count; i++) {
        if (!next.deck || next.deck.length === 0) break;
        const [drawnCard, ...remainingDeck] = next.deck;
        next = {
          ...next,
          hand: [...(next.hand || []), drawnCard],
          deck: remainingDeck,
          deckSize: remainingDeck.length
        };
      }
      ps = next;
    },

    gainShards: () => {
      const amount = params.amount ?? 1;
      ps = { ...ps, shards: Number(ps.shards ?? 0) + amount };
    },

    heal: () => {
      const amount = params.amount ?? 1;

      if (target === 'self' && sourceType === 'creature' && sourceIndex !== null) {
        const c = ps.creatures?.[sourceIndex];
        if (c) {
          const next = [...ps.creatures];
          next[sourceIndex] = { ...c, currentCH: Math.min(c.maxCH, c.currentCH + amount) };
          ps = { ...ps, creatures: next };
        }
        return;
      }

      if (target === 'self' && sourceType === 'controller' && sourceIndex !== null) {
        const c = ps.controllers?.[sourceIndex];
        if (c) {
          const next = [...ps.controllers];
          next[sourceIndex] = { ...c, currentCH: Math.min(c.maxCH, c.currentCH + amount) };
          ps = { ...ps, controllers: next };
        }
        return;
      }

      if (target === 'ally_controller') {
        const idx = (ps.controllers || []).findIndex(c => c && c.isActive);
        if (idx >= 0) {
          const ctrl = ps.controllers[idx];
          const next = [...ps.controllers];
          next[idx] = { ...ctrl, currentCH: Math.min(ctrl.maxCH, ctrl.currentCH + amount) };
          ps = { ...ps, controllers: next };
        }
        return;
      }

      if (target === 'all_ally_creatures') {
        ps = {
          ...ps,
          creatures: (ps.creatures || []).map(c => (c ? { ...c, currentCH: Math.min(c.maxCH, c.currentCH + amount) } : null))
        };
        return;
      }

      if (target === 'all_ally_controllers') {
        ps = {
          ...ps,
          controllers: (ps.controllers || []).map(c => (c ? { ...c, currentCH: Math.min(c.maxCH, c.currentCH + amount) } : null))
        };
        return;
      }

      if (targetInfo?.type === 'creature') {
        const tc = ps.creatures?.[targetInfo.index];
        if (tc) {
          const next = [...ps.creatures];
          next[targetInfo.index] = { ...tc, currentCH: Math.min(tc.maxCH, tc.currentCH + amount) };
          ps = { ...ps, creatures: next };
        }
      }
    },

    damage: () => {
      const amount = params.amount ?? 1;
      const isSpellDamage = sourceType === 'spell' || sourceType === 'artifact';

      // self damage
      if (target === 'self' && sourceType === 'creature' && sourceIndex !== null) {
        const c = ps.creatures?.[sourceIndex];
        if (!c) return;
        const next = [...ps.creatures];
        next[sourceIndex] = { ...c, currentCH: c.currentCH - amount };
        if (next[sourceIndex].currentCH <= 0) {
          next[sourceIndex] = null;
          ps = { ...ps, creatures: next, graveyard: [...(ps.graveyard || []), c.card] };
          return;
        }
        ps = { ...ps, creatures: next };
        return;
      }

      if (target === 'self' && sourceType === 'controller' && sourceIndex !== null) {
        const c = ps.controllers?.[sourceIndex];
        if (!c) return;
        const next = [...ps.controllers];
        next[sourceIndex] = { ...c, currentCH: c.currentCH - amount };
        if (next[sourceIndex].currentCH <= 0) {
          next[sourceIndex] = null;
          ps = helpers.setNextActiveController({ ...ps, controllers: next });
          return;
        }
        ps = { ...ps, controllers: next };
        return;
      }

      if (target === 'enemy_controller' && os) {
        const idx = (os.controllers || []).findIndex(c => c && c.isActive);
        if (idx >= 0) {
          const ctrl = os.controllers[idx];
          const immune = isSpellDamage && ctrl.statusEffects?.includes('ImmuneToSpells');
          if (immune) return;
          const next = [...os.controllers];
          next[idx] = { ...ctrl, currentCH: Math.max(0, ctrl.currentCH - amount) };
          os = { ...os, controllers: next };
          os = helpers.setNextActiveController(os);
        }
        return;
      }

      if ((target === 'all_enemies' || target === 'all_enemy_creatures') && os) {
        const elementFilter = params.elementFilter;
        const cardIdFilter = params.cardIdFilter;
        const killed = [];
        const nextCreatures = (os.creatures || []).map(c => {
          if (!c) return null;
          if (elementFilter && c.card.element !== elementFilter) return c;
          if (cardIdFilter && c.card.id !== cardIdFilter) return c;
          const immune = isSpellDamage && c.statusEffects?.includes('ImmuneToSpells');
          if (immune) return c;
          const nextCH = c.currentCH - amount;
          if (nextCH <= 0) {
            killed.push(c.card);
            return null;
          }
          return { ...c, currentCH: nextCH };
        });
        os = { ...os, creatures: nextCreatures, graveyard: [...(os.graveyard || []), ...killed] };
        return;
      }

      if (target === 'all_enemy_controllers' && os) {
        const nextControllers = (os.controllers || []).map(c => {
          if (!c) return null;
          const immune = isSpellDamage && c.statusEffects?.includes('ImmuneToSpells');
          if (immune) return c;
          const nextCH = c.currentCH - amount;
          if (nextCH <= 0) return null;
          return { ...c, currentCH: nextCH };
        });
        os = helpers.setNextActiveController({ ...os, controllers: nextControllers });
        return;
      }

      if (target === 'all_ally_creatures') {
        const killed = [];
        const nextCreatures = (ps.creatures || []).map(c => {
          if (!c) return null;
          const nextCH = c.currentCH - amount;
          if (nextCH <= 0) {
            killed.push(c.card);
            return null;
          }
          return { ...c, currentCH: nextCH };
        });
        ps = { ...ps, creatures: nextCreatures, graveyard: [...(ps.graveyard || []), ...killed] };
        return;
      }

      if (target === 'all_ally_controllers') {
        const nextControllers = (ps.controllers || []).map(c => {
          if (!c) return null;
          const nextCH = c.currentCH - amount;
          if (nextCH <= 0) return null;
          return { ...c, currentCH: nextCH };
        });
        ps = helpers.setNextActiveController({ ...ps, controllers: nextControllers });
        return;
      }

      if (targetInfo?.type === 'creature' && os) {
        const tc = os.creatures?.[targetInfo.index];
        if (!tc) return;
        const immune = isSpellDamage && tc.statusEffects?.includes('ImmuneToSpells');
        if (immune) return;

        const nextOpp = [...os.creatures];
        const nextCH = tc.currentCH - amount;
        if (nextCH <= 0) {
          nextOpp[targetInfo.index] = null;
          // keep existing engine behavior for ownership routing
          if (tc.originalOwner === 'player') {
            ps = { ...ps, graveyard: [...(ps.graveyard || []), tc.card] };
          } else {
            os = { ...os, graveyard: [...(os.graveyard || []), tc.card] };
          }
          os = { ...os, creatures: nextOpp };
        } else {
          nextOpp[targetInfo.index] = { ...tc, currentCH: nextCH };
          os = { ...os, creatures: nextOpp };
        }
      }
    },

    summon: () => {
      const cardId = params.cardId;
      if (!cardId) return;

      const found = helpers.findCardInZones(ps, cardId, ['deck', 'hand']);
      if (!found) return;

      let nextState = { ...ps };
      nextState[found.zone] = helpers.removeCardFromZone(nextState[found.zone], found.card);
      if (found.zone === 'deck') nextState.deckSize = nextState.deck.length;

      const slot = nextState.creatures.findIndex(c => c === null);
      if (slot === -1) return;

      const inst = helpers.createCreatureInstance(found.card, params.currentTurnNumber ?? 1);
      const nextCreatures = [...nextState.creatures];
      nextCreatures[slot] = inst;
      nextState.creatures = nextCreatures;

      ps = nextState;
    },

    summonTokens: () => {
      const cardCode = params.card_code || params.cardCode;
      const count = params.amount ?? params.count ?? 1;

      let nextState = { ...ps };
      let added = 0;

      if (cardCode) {
        const resolveCardByCode = engineContext?.resolveCardByCode;
        const tokenTemplate = typeof resolveCardByCode === 'function' ? resolveCardByCode(cardCode) : null;

        for (let tokenIdx = 0; tokenIdx < count; tokenIdx++) {
          const emptySlot = nextState.creatures.findIndex(c => c === null);
          if (emptySlot === -1) break;

          const tokenCard = tokenTemplate
            ? { ...tokenTemplate, id: tokenTemplate.code || tokenTemplate.id || cardCode, code: tokenTemplate.code || cardCode, is_token: true }
            : {
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
                art_url: params.art_url || params.image_url || '',
                image_url: params.art_url || params.image_url || '',
                is_token: true,
                __placeholder_token: true
              };

          const inst = helpers.createCreatureInstance(tokenCard, params.currentTurnNumber ?? 1);
          inst.canAttack = params.canAttack ?? false;
          inst.isToken = true;

          const newCreatures = [...nextState.creatures];
          newCreatures[emptySlot] = inst;
          nextState.creatures = newCreatures;
          added++;
        }
      }

      ps = nextState;
    }
  };

  const handler = handlers[action];
  if (typeof handler === 'function') handler();

  return { playerState: ps, opponentState: os };
}
