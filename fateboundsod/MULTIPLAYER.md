# Invite-only multiplayer

Implemented against Supabase project `lyqfwiqdbwuyqinvqpsd` on 2026-09-16. The canonical rules are the local `src/practice` modules, including balance patch 0.2. The older `components/tcg/gameEngine` does not power multiplayer.

## Play

Open `/multiplayer`, sign in or create an account, select an element and controller, then create a room. Share the private invite link with one friend. Their selected fixed deck is locked when they join. The room starts atomically when the second seat is filled. There is no public matchmaking. Invitations expire after 24 hours; existing matches remain resumable.

Copy the invitation before leaving the waiting room: only its SHA-256 hash is stored on the server. Recent matches are listed after login. Refresh, reconnect, or reopen `/multiplayer?match=<id>` to resume. Leaving the page does not concede. Use Concede to end a game. Bug reports include the match ID, balance version, version and public action history.

## Architecture

- `src/practice/multiplayer.js` validates seats, deck/controller combinations, action fields, phases and choices, and builds explicit allowlisted player views. The same rules engine validates costs and targets.
- `scripts/bundle-multiplayer.mjs` copies canonical modules into the ignored Edge Function bundle. Never edit generated `_shared/rules` copies.
- `supabase/functions/multiplayer/index.ts` verifies the Auth user, rejects anonymous accounts, creates/joins rooms, and applies versioned actions. The service-role key exists only in the Edge Function environment.
- `supabase/multiplayer.sql` is the schema bootstrap already applied to the development project. Do not rerun it against that project. CLI migration capture was blocked by a low-disk-space installation failure; this SQL preserves the exact schema change without inventing migration history.
- `mp_matches`, `mp_actions` and `mp_reports` deny all direct client access. `mp_memberships` permits a signed-in user to read only their own memberships. The RPCs use security invoker and are executable only by the service role.
- Room joins use row locks. Action commits use a row lock, expected version, and per-actor action ID/fingerprint to prevent stale writes and duplicate retries. Pending choices and randomness stay server-held; Ink Cloud choices belong to the defender.
- Private Realtime channels authorize membership and broadcast only a version number. Clients refetch sanitized state and track presence. Reconnect/focus and a 15-second recovery fetch cover missed notifications. Presence is advisory, never authority.
- Opponent hands and both deck orders are absent from views. Search options go only to the designated chooser. Arbitrary engine logs and private move/choice payloads are excluded from public history and generic errors. Some printed card effects deliberately reveal selectable cards to the acting player.
- Match records retain deck/controller choices, balance version, turn count, winner and concession reason. Public history records action type and phase; it does not contain hidden choices or the full private snapshot.

## Development after disk cleanup

The main source directory and `.env` are retained. Generated `node_modules` and `dist` can be recreated:

```sh
npm ci
npm run test:rules
npm run test:multiplayer
npm run build
npm run dev
```

Set `VITE_SUPABASE_URL=https://lyqfwiqdbwuyqinvqpsd.supabase.co` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or the existing `VITE_SUPABASE_ANON_KEY`) in local/hosting environment variables. Never put a service-role or secret key in Vite variables. The Supabase client dependency is pinned to 2.94.0.

Before redeploying the Edge Function run `npm run bundle:multiplayer`. Deploy the `multiplayer` function with JWT verification enabled. It also verifies the user with `auth.getUser`. Existing matches reject a different balance version; preserve an older version handler before future balance upgrades if those matches need to finish.

## Verification completed

- Production Vite build and focused ESLint checks passed.
- Existing rules: 38 checks plus 9 full AI games passed.
- Multiplayer boundary: 11 checks, including a complete two-seat game, privacy allowlists, invalid moves, pending choices, and defender-owned reactions passed.
- Deployed service: three distinct temporary authenticated accounts; simultaneous joins; concurrent duplicate action requests; stale versions; forged free plays; wrong-seat moves; denied private table reads; non-member denial; reconnect fetch; private Realtime subscription and version notification; concession and bug report passed.
- Two temporary accounts completed a full live game through sanitized views and server actions (34 actions in the recorded run). Temporary users, matches, actions and reports were deleted afterward.
- Browser visual automation could not initialize in this desktop environment; no visual/browser interaction test is claimed.

The live harness is `scripts/test-multiplayer-live.mjs`. `prepare-live-test.mjs` only prepares SQL and test credentials in ignored `outputs`; applying its SQL creates Auth users and requires explicit authorization. Always execute its matching cleanup SQL after testing, including failed runs. Do not commit `outputs`.

## Hosting and existing project findings

The Edge Function and schema are deployed. Frontend public hosting remains pending selection/confirmation of the existing host. Configure SPA fallback to `index.html`, HTTPS, and Supabase Site URL/redirect allowlists for the chosen origin. Localhost links cannot be opened by a remote friend.

The security advisor still reports pre-existing issues outside multiplayer: RLS disabled on `public.promocode_redemption`, mutable search path on `redeem_promocode`, publicly executable security-definer helper functions, and disabled leaked-password protection. These were not modified by this change. See the [Supabase database linter](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public). The new server-only tables intentionally have RLS with no client policies, and their grants are revoked.
