import { createClient } from 'npm:@supabase/supabase-js@2.94.0';
import { applyAction, playerView, startMatch, validateDeck, BALANCE_VERSION } from '../_shared/rules/multiplayer.js';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))), b => b.toString(16).padStart(2, '0')).join('');
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
function check(result: any) { if (result.error) throw new Error('Database operation failed'); return result.data; }
async function load(id: string, actor: string) {
  const row = check(await db.from('mp_matches').select('*').eq('id', id).maybeSingle());
  if (!row || (row.host_id !== actor && row.guest_id !== actor)) throw new Error('Match unavailable');
  return row;
}
function view(row: any, actor: string) {
  const seat = row.host_id === actor ? 'playerState' : 'opponentState';
  return { id: row.id, version: row.version, status: row.status, balanceVersion: row.balance_version,
    seat, hostDeck: row.host_deck, guestDeck: row.guest_deck,
    game: row.state ? playerView(row.state, seat) : null, history: row.history.slice(-200) };
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'POST required' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return reply({ error: 'Sign in to play.' }, 401);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous) return reply({ error: 'Sign in to play.' }, 401);
  const actor = data.user.id;
  try {
    const raw = await req.text();
    if (raw.length > 12000) return reply({ error: 'Request too large.' }, 413);
    const b = JSON.parse(raw);
    if (b.op === 'list') {
      const rows = check(await db.from('mp_matches').select('id,status,version,balance_version,host_deck,guest_deck,updated_at').or(`host_id.eq.${actor},guest_id.eq.${actor}`).order('updated_at', { ascending: false }).limit(20));
      return reply({ matches: rows });
    }
    if (b.op === 'create') {
      if (!uuid(b.id) || typeof b.invite !== 'string' || !/^[0-9a-f]{32}$/.test(b.invite)) return reply({ error: 'Invalid room request.' }, 400);
      const deck = validateDeck(b.deck);
      check(await db.rpc('mp_create', { p_id: b.id, p_actor: actor, p_hash: await hash(b.invite), p_deck: deck, p_balance: BALANCE_VERSION }));
      return reply(view(await load(b.id, actor), actor));
    }
    if (b.op === 'join') {
      if (typeof b.invite !== 'string' || !/^[0-9a-f]{32}$/.test(b.invite)) return reply({ error: 'Invite unavailable.' }, 404);
      const inviteHash = await hash(b.invite);
      const row = check(await db.from('mp_matches').select('*').eq('invite_hash', inviteHash).maybeSingle());
      if (!row) return reply({ error: 'Invite unavailable.' }, 404);
      if (row.host_id === actor || row.guest_id === actor) return reply(view(row, actor));
      const deck = validateDeck(b.deck);
      const state = startMatch(row.host_deck, deck, crypto.getRandomValues(new Uint32Array(1))[0]);
      check(await db.rpc('mp_join', { p_id: row.id, p_actor: actor, p_hash: inviteHash, p_deck: deck, p_state: state, p_balance: BALANCE_VERSION }));
      return reply(view(await load(row.id, actor), actor));
    }
    if (!uuid(b.id)) return reply({ error: 'Invalid match.' }, 400);
    let row = await load(b.id, actor);
    if (b.op === 'get') return reply(view(row, actor));
    if (b.op === 'report') {
      if (!uuid(b.reportId) || typeof b.description !== 'string' || !b.description.trim() || b.description.length > 2000) return reply({ error: 'Describe the issue (1–2000 characters).' }, 400);
      check(await db.from('mp_reports').upsert({ id: b.reportId, match_id: row.id, actor_id: actor, description: b.description.trim(), version: row.version, balance_version: row.balance_version, history: row.history }, { onConflict: 'id', ignoreDuplicates: true }));
      return reply({ ok: true });
    }
    if (b.op !== 'action' || !uuid(b.actionId) || !Number.isInteger(b.expectedVersion)) return reply({ error: 'Invalid request.' }, 400);
    const fingerprint = await hash(JSON.stringify({ version: b.expectedVersion, action: b.action }));
    const prior = check(await db.from('mp_actions').select('fingerprint').eq('match_id', b.id).eq('actor_id', actor).eq('action_id', b.actionId).maybeSingle());
    if (prior) return prior.fingerprint === fingerprint ? reply(view(row, actor)) : reply({ error: 'Action ID conflict.' }, 409);
    if (row.version !== b.expectedVersion) return reply({ error: 'Match changed. Your view has been refreshed.', current: view(row, actor) }, 409);
    if (row.status !== 'active') return reply({ error: 'Match is not active.' }, 409);
    const seat = row.host_id === actor ? 'playerState' : 'opponentState';
    let next;
    try { next = applyAction(row.state, seat, b.action); }
    catch { return reply({ error: 'That action is not legal now. Check the phase, cost, target, and pending choice.' }, 422); }
    // No card names, choice IDs, engine errors, or uncommitted effects in public history.
    const event = { actor: seat, type: b.action.type, turn: next.turnNumber, phase: next.phase, pending: !!next.pendingChoice, result: next.finished || null };
    const committed = await db.rpc('mp_commit', { p_id: row.id, p_actor: actor, p_action: b.actionId, p_fingerprint: fingerprint, p_expected: b.expectedVersion, p_state: next, p_event: event });
    row = await load(row.id, actor);
    if (committed.error) return reply({ error: 'Match changed. Your view has been refreshed.', current: view(row, actor) }, 409);
    return reply(view(row, actor));
  } catch { return reply({ error: 'Request could not be completed. Refresh the match or check the invite.' }, 400); }
});
