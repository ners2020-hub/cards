import { supabase } from '@/lib/supabaseClient';
import {
  normalizeDeck,
  validatePlayerDeck,
  validatePresetDeck
} from './deckRules';

/**
 * -----------------------------------------------------
 * Helpers
 * -----------------------------------------------------
 */

/**
 * Convert DB deck -> UI deck format
 * DB: { cards: [{ card_id, quantity }] }
 * UI: [{ ...cardData, quantity }]
 */
export function hydrateDeck(dbDeck, allCards) {
  if (!dbDeck?.cards || !Array.isArray(dbDeck.cards) || !Array.isArray(allCards)) return [];

  return dbDeck.cards
    .map(entry => {
      const card = allCards.find(
        c => c.id === entry.card_id || c.code === entry.card_id
      );
      return card ? { ...card, quantity: entry.quantity } : null;
    })
    .filter(Boolean);
}

/**
 * Convert UI deck -> DB deck format (object with {cards,total_cards,valid,errors})
 */
export function serializeDeck(uiDeck) {
  return normalizeDeck(uiDeck);
}

/**
 * -----------------------------------------------------
 * Player Decks (customdeck)
 * -----------------------------------------------------
 */

export async function fetchPlayerDecks(userEmail) {
  if (!userEmail) return [];

  const { data, error } = await supabase
    .from('customdeck')
    .select('*')
    .eq('user_email', userEmail)
    .order('updated_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function savePlayerDeck({
  deckId,
  name,
  element,
  uiDeck,
  userEmail
}) {
  if (!userEmail) throw new Error('Missing user email');

  const serialized = serializeDeck(uiDeck);
  const validation = validatePlayerDeck(serialized.cards);

  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }

  const payload = {
    name,
    element,
    user_email: userEmail,
    cards: serialized.cards,
    total_cards: serialized.total_cards,
    is_valid: true,
    updated_date: new Date().toISOString()
  };

  if (deckId) {
    const { error } = await supabase
      .from('customdeck')
      .update(payload)
      .eq('id', deckId);

    if (error) throw error;
    return { updated: true };
  }

  const { error } = await supabase
    .from('customdeck')
    .insert({
      ...payload,
      created_date: new Date().toISOString()
    });

  if (error) throw error;
  return { created: true };
}

export async function deletePlayerDeck(deckId) {
  if (!deckId) return;

  const { error } = await supabase
    .from('customdeck')
    .delete()
    .eq('id', deckId);

  if (error) throw error;
}

/**
 * -----------------------------------------------------
 * Preset Decks (presetdeck)
 * -----------------------------------------------------
 */

export async function fetchPresetDecks() {
  const { data, error } = await supabase
    .from('presetdeck')
    .select('*')
    .order('element_key');

  if (error) throw error;
  return data || [];
}

export async function savePresetDeck({
  deckId,
  name,
  element_key,
  element,
  uiDeck,
  icon_url = '',
  gradient = '',
  emoji = '🎴',
  is_active = true
}) {
  const serialized = serializeDeck(uiDeck);
  const validation = validatePresetDeck(serialized.cards);

  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }

  const payload = {
    name,
    element_key,
    element,
    cards: serialized.cards,
    total_cards: serialized.total_cards,
    is_valid: true,
    controllers: (uiDeck || [])
      .filter(c => c.card_type === 'controller')
      .map(c => c.code || c.id),
    icon_url,
    gradient,
    emoji,
    is_active,
    updated_date: new Date().toISOString()
  };

  if (deckId) {
    const { error } = await supabase
      .from('presetdeck')
      .update(payload)
      .eq('id', deckId);

    if (error) throw error;
    return { updated: true };
  }

  const { error } = await supabase
    .from('presetdeck')
    .insert({
      ...payload,
      created_date: new Date().toISOString()
    });

  if (error) throw error;
  return { created: true };
}

export async function deletePresetDeck(deckId) {
  if (!deckId) return;

  const { error } = await supabase
    .from('presetdeck')
    .delete()
    .eq('id', deckId);

  if (error) throw error;
}

/**
 * -----------------------------------------------------
 * Backwards-compatible service object
 * -----------------------------------------------------
 * DeckBuilder.jsx expects:
 *   import { deckService } from '@/services/deckService'
 */
export const deckService = {
  // Player decks
  listCustomDecks: fetchPlayerDecks,
  saveCustomDeck: async ({ id, name, element, cards, userEmail, user_email }) => {
    return savePlayerDeck({
      deckId: id,
      name,
      element,
      uiDeck: cards,
      userEmail: userEmail || user_email
    });
  },
  deleteCustomDeck: deletePlayerDeck,

  // Preset decks
  listPresetDecks: fetchPresetDecks,
  savePresetDeck: async ({ id, name, element_key, element, cards, icon_url, gradient, emoji, is_active }) => {
    return savePresetDeck({
      deckId: id,
      name,
      element_key,
      element,
      uiDeck: cards,
      icon_url,
      gradient,
      emoji,
      is_active
    });
  },
  deletePresetDeck,

  // Utilities
  hydrateDeck,
  serializeDeck
};
