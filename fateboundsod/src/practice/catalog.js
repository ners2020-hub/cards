import { CARD_DATABASE } from './cardDatabase.js';
import { balancePatch } from './balancePatch.js';

export const cards = Object.entries(CARD_DATABASE).map(([id, card]) => {
  const patch = balancePatch[card.name];
  return { ...card, ...(patch?.cost !== undefined ? { cost: patch.cost } : {}), ...(patch?.description ? { description: patch.description } : {}), id };
});
export const byName = Object.fromEntries(cards.map(card => [card.name, card]));
export const cardElements = card => card.elements && card.element === card.elements[0] ? card.elements : [card.element];
export const hasElement = (card, element) => cardElements(card).includes(element);
export const elementLabel = card => cardElements(card).join('/');
export const elements = ['fire', 'cryo', 'blood', 'wind', 'earth', 'water', 'shadow', 'light', 'electric'];
export const DEFAULT_RULES = [
  'Gain 2 shards in each of your Energy Phases. Unspent shards carry over. After end-of-turn effects, choose cards to discard until your hand contains at most 7 cards.',
  'Attack shield creatures (Guardians) first, then other creatures, then Controllers. Any enemy creature on the field protects its Controllers. Only attacking creatures with Stealth can bypass this order; Stealth does not override other target immunities.',
  'Unpriced activated abilities cost 0 shards and are usable once per owner turn.',
  'Nature means Earth; Charge means Haste. Haste bypasses summoning sickness, but not the turn 1–2 attack lock.',
  'Fractional damage and health conversions round up.',
  'A duration of N turns means N turns of the affected card’s controller. Until End Phase effects expire at the current turn’s end.',
  'Unqualified creature entry effects trigger on summon; repeatable costed effects appear as activated abilities.',
  'Unspecified duration means while the source remains in play. Optional searches and extra summons can be skipped.',
  'Look/search effects let the acting player select a card. AI choices use the same legal options.',
  'All controllers are available in the controller selector; practice decks contain creatures, spells, artifacts, and universal spells.',
];
