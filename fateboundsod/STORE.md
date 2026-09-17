# Card store

The current store is available locally at `/store`; `/Shop` redirects there. It uses the same balanced card art, costs, attack, health and descriptions as the arena.

## Economy

- Starter: 50 tokens, five cards; rarity odds 70% common / 25% uncommon / 5% rare per card.
- Premium: 150 tokens, five cards; 40% / 35% / 20% / 5% epic.
- Elite: 300 tokens, five cards; 20% / 30% / 30% / 15% / 5% legendary.
- New accounts receive 100 tokens and the original 14-card starter selection with two copies each.
- Existing balances and collection quantities are imported once, matching legacy card names to current IDs. Unmatched entries are retained for review. Old admin-mode flags never grant free purchases.
- Original deck unlocks cost 500 tokens and five qualifying wins. Existing wins and completed authoritative multiplayer wins count. Unlocks are collection entitlements; practice and fixed multiplayer playtest decks are unrestricted.
- Promo codes use the existing promo definitions and redemption history. This release adds no real-money payments or new match token rewards.

## Backend

Apply `supabase/store.sql`, then `supabase/store-catalog.sql`, then deploy `supabase/functions/store/index.ts` as `store` with JWT verification enabled. The Edge Function verifies the signed-in user and passes their UUID to a service-role-only, security-invoker transaction. The browser cannot pick rewards, prices, target accounts, or balances. Account locks serialize purchases, receipts make retries idempotent, and promo row locks enforce total uses. Legacy browser write grants and the old redemption RPC are disabled to avoid split balances.

`node scripts/export-store-catalog.mjs` regenerates canonical catalog SQL. Rarities are retained by name from the original database; new unmatched cards default to common. This does not overwrite the legacy card table.

## Verification and release status

- Frontend production build and focused ESLint passed.
- `supabase/store-tests.sql` contains transactional tests that roll back every fixture. Run after applying the schema and catalog.
- Database rollout and live transaction verification are pending explicit user approval following automatic approval review. The new store has not yet been published.
- Google sign-in uses the established multiplayer callback and then returns to the store. It still requires the Google provider to be enabled in Supabase.
