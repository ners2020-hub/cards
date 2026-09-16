// Canonical multiplayer boundary. This module and the rules are bundled unchanged for Deno.
import { cards, elements, newMatch, performMove, resolveChoice, outcome, cardCost } from './rulesEngine.js';
import { BALANCE_VERSION } from './balancePatch.js';
export { BALANCE_VERSION };
export const SIDES = ['playerState', 'opponentState'];
export function validateDeck(value) {
  if (!value || !elements.includes(value.element) || !cards.some(c => c.card_type === 'controller' && c.element === value.element && c.name === value.controller)) throw new Error('Choose a valid element and controller.');
  return { element: value.element, controller: value.controller };
}
export function startMatch(first, second, seed) {
  const a = validateDeck(first), b = validateDeck(second);
  const g = newMatch(a.element, b.element, a.controller, b.controller, seed);
  g.gameMode = 'multiplayer'; g.balanceVersion = BALANCE_VERSION;
  return g;
}
export function applyAction(state, seat, action) {
  if (!SIDES.includes(seat) || !action || typeof action !== 'object') throw new Error('Invalid action.');
  if (state.balanceVersion !== BALANCE_VERSION) throw new Error('This match uses a different balance version.');
  if (state.finished || outcome(state)) throw new Error('The duel is over.');
  if (action.type === 'concede') return { ...state, finished: { winner: SIDES.find(s => s !== seat), reason: 'concession' } };
  if (state.pendingChoice) {
    if (state.pendingChoice.side !== seat || action.type !== 'choice') throw new Error('Waiting for the designated player to choose.');
    if (typeof action.id !== 'string' || !state.pendingChoice.options.some(o => o.id === action.id)) throw new Error('Invalid choice.');
    return resolveChoice(state, action.id);
  }
  if ((state.isMyTurn ? SIDES[0] : SIDES[1]) !== seat) throw new Error('It is not your turn.');
  const allowed = { advance: ['type'], play: ['type', 'index', 'slot', 'fromGraveyard'], attack: ['type', 'source', 'target'], ability: ['type', 'source', 'index'] };
  if (!allowed[action.type] || Object.keys(action).some(k => !allowed[action.type].includes(k))) throw new Error('Invalid action fields.');
  for (const key of ['index', 'slot']) if (action[key] !== undefined && (!Number.isInteger(action[key]) || action[key] < 0 || action[key] > 500)) throw new Error('Invalid selection.');
  for (const key of ['source', 'target']) if (action[key] !== undefined && (typeof action[key] !== 'string' || !/^u\d+$/.test(action[key]))) throw new Error('Invalid unit.');
  if (action.fromGraveyard !== undefined && typeof action.fromGraveyard !== 'boolean') throw new Error('Invalid source.');
  const next = performMove(state, action);
  const result = outcome(next);
  if (result) next.finished = { winner: result === 'Draw' ? null : result === 'Victory' ? SIDES[0] : SIDES[1], reason: 'controllers defeated' };
  return next;
}
const pick = (value, keys) => Object.fromEntries(keys.filter(k => value[k] !== undefined).map(k => [k, structuredClone(value[k])]));
// Explicit allowlists: no seed, deck order, server choices, or opaque rule state leaves the server.
function unitView(unit) {
  if (!unit) return null;
  const result = pick(unit, ['uid', 'side', 'owner', 'zone', 'card', 'currentAP', 'currentCH', 'maxCH', 'canAttack', 'attacksRemaining', 'statuses', 'used', 'target']);
  result.flags = { shield: !!unit.flags?.shield };
  return result;
}
export function playerView(state, seat) {
  if (!SIDES.includes(seat)) throw new Error('Not a participant.');
  const g = pick(state, ['turnNumber', 'phase', 'balanceVersion', 'lastEffect']);
  g.isMyTurn = (state.isMyTurn ? SIDES[0] : SIDES[1]) === seat;
  g.gameMode = 'multiplayer';
  g.log = []; // Public history is recorded separately, never copy arbitrary engine log text.
  g.result = state.finished ? state.finished.winner === null ? 'Draw' : state.finished.winner === seat ? 'Victory' : 'Defeat' : null;
  g.waitingForChoice = !!state.pendingChoice;
  for (const side of SIDES) {
    const s = state[side], mine = side === seat;
    const view = { shards: s.shards, handCount: s.hand.length, deckCount: s.deck.length, deck: [], graveyard: structuredClone(s.graveyard), void: structuredClone(s.void), hand: mine ? s.hand.map(c => ({ ...structuredClone(c), displayCost: cardCost(state, side, c) })) : [], reaction: s.reaction ? { name: s.reaction.name } : null };
    for (const zone of ['controllers', 'creatures', 'artifacts', 'spells']) view[zone] = s[zone].map(unitView);
    g[side === seat ? 'playerState' : 'opponentState'] = view;
  }
  if (state.pendingChoice?.side === seat) g.pendingChoice = pick(state.pendingChoice, ['prompt', 'options']);
  // Adapt seat labels for the existing arena; UIDs remain authoritative and unchanged.
  function translate(value) {
    if (Array.isArray(value)) return value.map(translate);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translate(v)]));
    return seat === SIDES[1] && SIDES.includes(value) ? SIDES[1 - SIDES.indexOf(value)] : value;
  }
  return translate(g);
}
