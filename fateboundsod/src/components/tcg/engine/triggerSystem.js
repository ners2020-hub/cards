// src/components/tcg/engine/triggerSystem.js
// Trigger system skeleton (foundation)
//
// Goal:
// - Centralize trigger resolution and event dispatch.
// - Keep card behavior DB-driven (abilities jsonb).

/**
 * Returns abilities filtered by trigger.
 * Accepts both "trigger" and legacy "type".
 */
export function getAbilitiesForTrigger(card, trigger) {
  if (!Array.isArray(card?.abilities) || card.abilities.length === 0) return [];
  return card.abilities.filter(ab => {
    if (!ab) return false;
    const abTrigger = ab.trigger || ab.type;
    return abTrigger === trigger && (ab.action || ab.params);
  });
}

/**
 * Minimal event shape used by the engine.
 */
export function makeEvent({
  trigger,
  sourceCard,
  sourceType,
  sourceIndex,
  targetInfo = null
}) {
  return { trigger, sourceCard, sourceType, sourceIndex, targetInfo };
}

/**
 * Placeholder dispatcher; the engine currently resolves triggers inline.
 * This exists so we can migrate incrementally.
 */
export function dispatchTrigger(/* event, state, context */) {
  // Future: normalize event, look up abilities, route through abilityDispatcher.
  return null;
}
