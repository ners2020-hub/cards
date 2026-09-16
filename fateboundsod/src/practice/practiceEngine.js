import * as engine from '../components/tcg/gameEngine.jsx';
import { CARD_DATABASE } from './cardDatabase.js';

export const elements = ['fire', 'cryo', 'blood', 'wind', 'earth', 'water', 'shadow', 'light', 'electric'];
export const cards = Object.values(CARD_DATABASE);
export function makePlayer(element) {
  // The export has prose, not executable abilities. Practice intentionally uses base stats.
  const pool = cards.filter(c => c.element === element && c.card_type === 'creature')
    .map(c => ({ ...c, description: '', keywords: [], abilities: [] }));
  const controller = cards.find(c => c.element === element && c.card_type === 'controller');
  const deck = Array.from({ length: 30 }, (_, i) => ({ ...pool[i % pool.length] }));
  const initial = engine.createInitialPlayerState(deck, [{ ...controller, description: '', keywords: [], abilities: [] }]);
  return engine.activateRestingController(initial, 0);
}
export function newMatch(element, enemy) {
  return { playerState: makePlayer(element), opponentState: makePlayer(enemy), isMyTurn: true, phase: 'draw', turnNumber: 1, gameMode: 'ai' };
}
export function summon(gs, card, index) {
  if (!gs.isMyTurn || gs.phase !== 'main') throw new Error('Summon during your main phase.');
  if (!card || !gs.playerState.hand.includes(card)) throw new Error('Select a card from your hand.');
  if (gs.playerState.creatures[index] !== null) throw new Error('Choose an empty creature slot.');
  if (gs.playerState.shards < card.cost) throw new Error('You need more shards to summon this card.');
  const result = engine.playCard(gs.playerState, card, 'creature', index, gs.opponentState, null, null, gs.turnNumber);
  return { ...gs, playerState: result.playerState, opponentState: result.opponentState };
}
export function attack(gs, source, target) {
  if (!gs.isMyTurn || gs.phase !== 'combat') throw new Error('Attack during your combat phase.');
  const result = engine.performAttack(gs.playerState, gs.opponentState, target, source.index, source.type, gs.turnNumber);
  if (result.blocked) throw new Error(result.message);
  return { ...gs, playerState: result.attackerState, opponentState: result.defenderState };
}
export function outcome(gs) {
  const playerLost = engine.checkWinCondition(gs.playerState, gs.turnNumber);
  const enemyLost = engine.checkWinCondition(gs.opponentState, gs.turnNumber);
  return playerLost && enemyLost ? 'Draw' : playerLost ? 'Defeat' : enemyLost ? 'Victory' : null;
}
export { engine };
