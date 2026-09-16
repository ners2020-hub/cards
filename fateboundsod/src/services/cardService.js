import { supabase } from '@/lib/supabaseClient';

/* =====================================================
   Helpers
===================================================== */

function safeParseJSON(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeAbilities(raw) {
  const abilities = safeParseJSON(raw, []);
  return abilities.map(a => ({
    trigger: a.trigger,
    action: a.action,
    cost: a.cost || {},
    params: a.params || {},
    target: a.target || null,
    condition: a.condition || null
  }));
}

export function normalizeCard(card) {
  return {
    id: card.code,
    code: card.code,
    name: card.name,
    card_type: card.card_type,
    element: card.element,
    rarity: card.rarity,
    cost: card.cost ?? 0,
    ap: card.ap ?? 0,
    ch: card.ch ?? 0,
    description: card.description || '',
    flavor_text: card.flavor_text || '',
    image_url: card.image_url || null,
    is_unique: !!card.is_unique,
    is_persistent: !!card.is_persistent,
    is_attachment: !!card.is_attachment,
    is_token: !!card.is_token,
    abilities: normalizeAbilities(card.abilities),
    keywords: safeParseJSON(card.keywords, []),
    created_date: card.created_date,
    updated_date: card.updated_date
  };
}

/* =====================================================
   Fetching
===================================================== */

export async function fetchAllCards() {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .order('name');

  if (error) throw error;
  return (data || []).map(normalizeCard);
}

export async function fetchCardByCode(code) {
  const { data, error } = await supabase
    .from('card')
    .select('*')
    .eq('code', code)
    .single();

  if (error) throw error;
  return normalizeCard(data);
}

/* =====================================================
   Admin mutations
===================================================== */

export async function upsertCard(cardData) {
  const payload = {
    ...cardData,
    abilities: JSON.stringify(cardData.abilities || []),
    keywords: JSON.stringify(cardData.keywords || [])
  };

  const { data, error } = await supabase
    .from('card')
    .upsert(payload, { onConflict: 'code' })
    .select()
    .single();

  if (error) throw error;
  return normalizeCard(data);
}

export async function deleteCard(code) {
  const { error } = await supabase
    .from('card')
    .delete()
    .eq('code', code);

  if (error) throw error;
}

/* =====================================================
   REQUIRED export for pages
===================================================== */

export const cardService = {
  getAllCards: fetchAllCards,
  getCardByCode: fetchCardByCode,
  upsertCard,
  deleteCard,
  normalizeCard
};
