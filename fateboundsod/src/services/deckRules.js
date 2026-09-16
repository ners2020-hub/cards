/**
 * =====================================================
 * Deck Rules + Utilities (DB-master friendly)
 * =====================================================
 *
 * This file is intentionally "pure" (no Supabase imports).
 * It normalizes UI deck state <-> DB deck state and provides
 * helper rules used by DeckBuilder and deckService.
 */

const DEFAULTS = {
  MIN_CARDS: 30,
  MAX_CARDS: 30,
  MAX_COPIES: 3
};

function getCardId(card) {
  if (!card) return null;
  return card.card_id || card.id || card.code || null;
}

function toInt(n, fallback = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.trunc(x) : fallback;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Build a Map(card_id -> quantity owned)
 */
export function buildOwnedMap(ownedCards = []) {
  const map = new Map();
  if (!Array.isArray(ownedCards)) return map;

  for (const entry of ownedCards) {
    if (typeof entry === 'string') {
      map.set(entry, (map.get(entry) || 0) + 1);
      continue;
    }
    if (!entry) continue;

    const id = entry.card_id || entry.code || entry.id;
    if (!id) continue;

    const qty = toInt(entry.quantity, 1);
    map.set(id, (map.get(id) || 0) + (qty > 0 ? qty : 1));
  }

  return map;
}

/**
 * Core rule: can add one more copy?
 */
export function canAddCardToDeck(deckCards, card, rules = DEFAULTS) {
  if (!Array.isArray(deckCards)) return false;
  if (!card) return false;

  const id = getCardId(card);
  if (!id) return false;

  const total = deckCards.reduce((sum, c) => sum + toInt(c.quantity, 0), 0);
  if (total >= rules.MAX_CARDS) return false;

  const existing = deckCards.find(c => getCardId(c) === id);
  const currentQty = existing ? toInt(existing.quantity, 0) : 0;

  const maxCopies = card.is_unique ? 1 : rules.MAX_COPIES;
  if (currentQty >= maxCopies) return false;

  return true;
}

// Alias expected by DeckBuilder
export function canAddToDeck(deckCards, card) {
  return canAddCardToDeck(deckCards, card);
}

export function addCardToDeck(deckCards, card) {
  if (!Array.isArray(deckCards)) return [];
  if (!canAddCardToDeck(deckCards, card)) return deckCards;

  const id = getCardId(card);
  const next = deckCards.map(c => ({ ...c }));
  const existing = next.find(c => getCardId(c) === id);

  if (!existing) {
    next.push({ ...card, card_id: id, quantity: 1 });
    return next;
  }

  existing.quantity = toInt(existing.quantity, 0) + 1;
  return next;
}

export function removeCardFromDeck(deckCards, cardOrId) {
  if (!Array.isArray(deckCards)) return [];

  const id = typeof cardOrId === 'string' ? cardOrId : getCardId(cardOrId);
  if (!id) return deckCards;

  const next = [];
  let changed = false;

  for (const c of deckCards) {
    const cid = getCardId(c);
    if (cid !== id) {
      next.push(c);
      continue;
    }

    const qty = toInt(c.quantity, 0) - 1;
    if (qty > 0) next.push({ ...c, quantity: qty });
    changed = true;
  }

  return changed ? next : deckCards;
}

/**
 * Normalize UI deck list into DB deck list object
 * Returns: { cards: [{card_id,quantity}], total_cards, valid, errors }
 */
export function normalizeDeck(uiDeckCards = []) {
  const map = new Map();

  for (const c of uiDeckCards || []) {
    const id = getCardId(c);
    if (!id) continue;

    const qty = clamp(toInt(c.quantity, 1), 1, 99);
    map.set(id, (map.get(id) || 0) + qty);
  }

  const cards = Array.from(map.entries()).map(([card_id, quantity]) => ({
    card_id,
    quantity
  }));

  const total_cards = cards.reduce((sum, c) => sum + toInt(c.quantity, 0), 0);
  const validation = validateDeck(cards);

  return {
    cards,
    total_cards,
    valid: validation.ok,
    errors: validation.errors
  };
}

// Alias expected by DeckBuilder + deckService
export const serializeDeck = normalizeDeck;

/**
 * Validate DB deck list
 * Input: [{card_id, quantity}]
 */
export function validateDeck(dbDeckCards = [], rules = DEFAULTS) {
  const errors = [];

  if (!Array.isArray(dbDeckCards)) {
    errors.push('Deck cards must be an array');
    return { ok: false, valid: false, errors, reason: errors[0] };
  }

  const total = dbDeckCards.reduce((sum, c) => sum + toInt(c.quantity, 0), 0);

  if (total < rules.MIN_CARDS) errors.push(`Deck must have at least ${rules.MIN_CARDS} cards`);
  if (total > rules.MAX_CARDS) errors.push(`Deck cannot exceed ${rules.MAX_CARDS} cards`);

  for (const c of dbDeckCards) {
    const id = c?.card_id;
    const qty = toInt(c?.quantity, 0);

    if (!id) errors.push('Deck contains an entry missing card_id');
    if (qty <= 0) errors.push(`Deck contains invalid quantity for ${id || 'unknown'}`);

    if (qty > rules.MAX_COPIES) {
      errors.push(`Too many copies of ${id} (max ${rules.MAX_COPIES})`);
    }
  }

  const ok = errors.length === 0;
  return { ok, valid: ok, errors, reason: ok ? null : errors[0] };
}

/**
 * Hydrate DB deck list into UI deck list using cards reference
 * allCards may be Map(code->card) or Array
 */
export function hydrateDeck(dbDeckCards = [], allCards = []) {
  if (!Array.isArray(dbDeckCards)) return [];

  const getCard = (id) => {
    if (!id) return null;
    if (allCards && typeof allCards.get === 'function') return allCards.get(id) || null;
    if (Array.isArray(allCards)) return allCards.find(c => (c.code || c.id) === id) || null;
    return null;
  };

  return dbDeckCards
    .map(entry => {
      const card = getCard(entry.card_id);
      if (!card) return null;
      return { ...card, card_id: entry.card_id, quantity: toInt(entry.quantity, 1) };
    })
    .filter(Boolean);
}

// Backwards-compatible aliases used by deckService.js
export const validatePlayerDeck = validateDeck;
export const validatePresetDeck = validateDeck;
