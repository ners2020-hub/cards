# Fatebound: Shards of Dominion

The latest balanced local game, solo arena and invite-only multiplayer playtest.

- `/` or `/practice`: solo arena using balance patch 0.2.
- `/multiplayer`: authenticated invite-only rooms using the same rules, with server-authoritative actions and private player views.
- Supabase development project: `lyqfwiqdbwuyqinvqpsd`.
- GitHub: `ners2020-hub/cards`, branch `add-fatebound`, app directory `fateboundsod`.

## Run locally

```sh
npm ci
npm run dev
```

Create a local `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (legacy `VITE_SUPABASE_ANON_KEY` also works). Never use a service-role key in browser configuration. Credentials and build output are excluded from Git.

```sh
npm run test:rules
npm run test:multiplayer
npm run build
```

See [MULTIPLAYER.md](MULTIPLAYER.md) for deployment, completed live tests and known limitations; [PRACTICE.md](PRACTICE.md) and [CARD_ABILITIES.md](CARD_ABILITIES.md) describe the local rules. The original multiplayer plan is retained in [MULTIPLAYER_PLAN.md](MULTIPLAYER_PLAN.md).

## Backup scope

The GitHub source backup excludes `.env`, private keys, dependency folders, build output, ZIP backups and temporary test credentials. Your local source and credentials remain on the computer. The balanced-card spreadsheet and previews are preserved under `docs/balance`.

OneDrive could not provide the older local `supabase/config.toml` or the source/config files under `supabase/functions/adminUpsertCard` and `supabase/functions/redeem-promocode`; those unreadable originals were retained locally. The old `components.json` was already present in GitHub and was retained there. The new multiplayer function, schema, current local game rules and application source were successfully backed up.
