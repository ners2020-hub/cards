// src/components/tcg/engine/effectRegistry.js
// Effect registry (foundation)
//
// Goal:
// - Central place to register effect-type handlers (future work).
// - Avoid sprawling switch(effect.type) in the engine over time.

const registry = new Map();

/**
 * Register an effect handler.
 * handler signature: (ctx) => ({ playerState, opponentState })
 */
export function registerEffect(type, handler) {
  if (!type || typeof handler !== 'function') return;
  registry.set(type, handler);
}

export function getEffectHandler(type) {
  return registry.get(type) || null;
}

export function hasEffectHandler(type) {
  return registry.has(type);
}

// Placeholder for future bootstrapping.
export function registerDefaultEffects() {
  // Intentionally empty for now.
  // Future: registerEffect('damage', ...)
}
