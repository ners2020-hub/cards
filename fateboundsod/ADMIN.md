# Owner tools

The signed-in owner redeems the privately configured owner code through the store promo field. The first successful redemption binds admin access to that auth UUID. Repeating it on the same account is harmless; other accounts cannot claim it afterward. No account email is preset. The bootstrap code is bcrypt-hashed in a service-only table, not bundled in the browser or saved to source control, promo listings or receipts.

The store then shows **Admin tools**, opening `/admin`. Existing `/AdminCardCreator` and `/AdminPromoCodes` links redirect there.

## Card authoring

Create and edit card drafts with name, element, type, rarity, stats, artwork URL, rules text, keywords and the original visual ability-design builder. Start from any current balanced card. Drafts support previews, saved versions, archive and reopening. Saving is authoring only: the shared battle engine still needs a tested implementation and publication before a new card can enter battles or packs. Drafts do not alter running matches or the current 187-card catalog.

## Promo management

Create, edit, enable or disable codes with token rewards, current catalog cards and quantities, a total redemption limit and an optional UTC expiry. All changes and card reward rows save atomically. Duplicate selected cards are combined. Existing redemption counts/history are retained; each player can redeem a promo only once. Legacy rewards display using the same name-based ID mapping as the store. Unknown legacy cards must be replaced with valid current cards before saving. Disabling a code preserves its history.

## Authorization and verification

`game_admins` is server-owned. Every admin RPC checks the verified auth UUID; profile roles and user metadata never grant these tools. The admin Edge Function verifies the JWT with auth.getUser. RLS is enabled, and no client grants exist on the role, bootstrap, draft, audit or current promo reward tables. Legacy card/promo mutation endpoints were retired, and browser mutation grants on the old role profile/card/promo tables were removed. The two old card endpoint aliases now return a moved-editor response and require JWT verification.

Mutation request IDs provide retry protection. Draft and promo versions reject stale edits from other tabs. `admin_requests` stores successful changes for an audit trail. Admin access does not grant free store purchases or gameplay advantages.

Fresh database setup: install multiplayer, store, rewards, then admin SQL before serving requests. Configure the one-time secret directly in Supabase separately; never commit it. Deploy the admin Edge Function and the updated store SQL. `supabase/admin-tests.sql` uses rollback-only fixtures and leaves the real bootstrap unclaimed. It checks first/same/second claim behavior, denied non-admin access, draft saves, stale edits, duplicate retries, real store promo redemption and privilege boundaries. Store and match-reward SQL regression tests and the frontend lint/build also passed. Browser interaction has not been tested in this environment.
