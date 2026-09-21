// Replay player decisions against the server-issued seed; never accept a reported winner.
import { newMatch, performMove, resolveChoice, cancelChoice, runAITurn, outcome } from './rulesEngine.js';
import { validateDeck } from './multiplayer.js';
export function validateSolo(config) {
  const mine = validateDeck(config.mine), enemy = validateDeck(config.enemy);
  if (!['easy', 'medium', 'hard'].includes(config.difficulty)) throw new Error('Invalid difficulty.');
  return { mine, enemy, difficulty: config.difficulty };
}
export function startSolo(config, seed) {
  return newMatch(config.mine.element, config.enemy.element, config.mine.controller, config.enemy.controller, seed);
}
export async function replaySolo(config, seed, actions) {
  if (!Array.isArray(actions) || !actions.length || actions.length > 2000) throw new Error('Invalid match replay.');
  let g = startSolo(validateSolo(config), seed);
  for (const action of actions) {
    if (outcome(g)) throw new Error('Actions after the match ended.');
    if (!action || typeof action.type !== 'string') throw new Error('Invalid action.');
    const fields = { advance: ['type'], play: ['type','index','slot','fromGraveyard'], attack: ['type','source','target'], ability: ['type','source','index'], choice: ['type','id'], cancel: ['type'] };
    if (!fields[action.type] || Object.keys(action).some(k => !fields[action.type].includes(k))) throw new Error('Invalid action fields.');
    for (const key of ['index','slot']) if (action[key] !== undefined && (!Number.isInteger(action[key]) || action[key] < 0 || action[key] > 500)) throw new Error('Invalid selection.');
    for (const key of ['source','target']) if (action[key] !== undefined && (typeof action[key] !== 'string' || !/^u\d+$/.test(action[key]))) throw new Error('Invalid unit.');
    if (action.fromGraveyard !== undefined && typeof action.fromGraveyard !== 'boolean') throw new Error('Invalid source.');
    if (action.type === 'cancel') {
      if (!g.pendingChoice || g.pendingChoice.auto || g.pendingChoice.kind === 'handLimit') throw new Error('Cannot cancel.');
      g = cancelChoice(g);
      continue;
    }
    if (g.pendingChoice) {
      if (action.type !== 'choice' || !g.pendingChoice.options.some(o => o.id === action.id)) throw new Error('Invalid choice.');
      g = resolveChoice(g, action.id);
    } else {
      if (!g.isMyTurn || !['advance', 'play', 'attack', 'ability'].includes(action.type)) throw new Error('Invalid turn.');
      g = performMove(g, action);
    }
    if (!g.isMyTurn && !g.pendingChoice && !outcome(g)) g = (await runAITurn(g, { delayMs: 0, difficulty: config.difficulty })).nextState;
  }
  const result = outcome(g);
  if (!result) throw new Error('The match has not finished.');
  return { result, perfect: result === 'Victory' && !g.playerState.controllersLost, turn: g.turnNumber };
}
