// src/services/promoCodeService.js
import { supabase } from '@/lib/supabaseClient';

/**
 * Promocode table expectations (per your schema/seed):
 * - primary key: code (text)
 * - timestamps: created_date, updated_date (NOT created_at/updated_at)
 * - created_by: email string
 * - card_ids: json/jsonb array of card CODES (strings)
 * - tokens: int nullable
 * - max_uses/current_uses: int
 * - expires_at: timestamptz nullable
 * - is_active: boolean
 * - is_sample: boolean
 */

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

function toIntOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toIntOrDefault(v, fallback) {
  const n = toIntOrNull(v);
  return n === null ? fallback : n;
}

function normalizeCardIds(cardIds) {
  // Accept: array, JSON string, null/undefined
  if (!cardIds) return [];

  if (Array.isArray(cardIds)) {
    return cardIds
      .map((x) => String(x || '').trim())
      .filter(Boolean);
  }

  if (typeof cardIds === 'string') {
    const trimmed = cardIds.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((x) => String(x || '').trim())
          .filter(Boolean);
      }
      return [];
    } catch {
      // If they passed a comma-separated string, support it
      return trimmed
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * List promo codes for admin UI
 * Uses created_date (your table) not created_at
 */
export async function listPromoCodes({ includeSamples = true } = {}) {
  let q = supabase.from('promocode').select('*');

  if (!includeSamples) q = q.eq('is_sample', false);

  const { data, error } = await q.order('created_date', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Create or update a promo code (upsert on code)
 * - Ensures code is normalized (uppercase)
 * - Ensures card_ids is an array of card CODES
 * - Ensures updated_date is set
 * - If creating new, sets created_date if missing
 */
export async function upsertPromoCode(payload, { createdByEmail } = {}) {
  const code = normalizeCode(payload?.code);
  if (!code) throw new Error('Promo code is required.');

  const card_ids = normalizeCardIds(payload?.card_ids);

  const tokens = toIntOrNull(payload?.tokens);
  const max_uses = toIntOrDefault(payload?.max_uses, 1);
  const current_uses = toIntOrDefault(payload?.current_uses, 0);

  const row = {
    ...payload,
    code,
    card_ids,
    tokens,
    max_uses,
    current_uses,
    is_active: payload?.is_active ?? true,
    is_sample: payload?.is_sample ?? false,
    description: payload?.description ?? null,
    expires_at: payload?.expires_at ?? null,

    // Your schema uses these names
    updated_date: nowIso(),

    // Create-time fields (only set if not already supplied)
    created_date: payload?.created_date ?? nowIso(),
    created_by: payload?.created_by ?? createdByEmail ?? payload?.created_by ?? null
  };

  // created_by is required per your intent; enforce it so you don't get half-baked rows
  if (!row.created_by) {
    throw new Error('created_by email is required for promo codes.');
  }

  const { data, error } = await supabase
    .from('promocode')
    .upsert(row, { onConflict: 'code' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deletePromoCodeByCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error('Promo code is required.');

  const { error } = await supabase.from('promocode').delete().eq('code', normalized);
  if (error) throw new Error(error.message);

  return true;
}

export async function setPromoCodeActive(code, isActive) {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error('Promo code is required.');

  const { data, error } = await supabase
    .from('promocode')
    .update({
      is_active: !!isActive,
      updated_date: nowIso()
    })
    .eq('code', normalized)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Optional helper for admin: reset uses
 */
export async function resetPromoCodeUses(code, { currentUses = 0 } = {}) {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error('Promo code is required.');

  const { data, error } = await supabase
    .from('promocode')
    .update({
      current_uses: toIntOrDefault(currentUses, 0),
      updated_date: nowIso()
    })
    .eq('code', normalized)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Optional read helper
 */
export async function getPromoCode(code) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('promocode')
    .select('*')
    .eq('code', normalized)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data || null;
}
