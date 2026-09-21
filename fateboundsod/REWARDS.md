# Match rewards

Implemented September 20, 2026 using the original MainMenu win payouts and Progression quest templates.

- Signed-in solo victory: 10 store tokens. Multiplayer victory: 30.
- Finished losses and draws give no base tokens, but count for played-match quests.
- One assigned daily and one assigned weekly quest, with the original token and XP amounts. Rewards claim automatically, once per period. Daily resets at midnight UTC; weekly resets Monday midnight UTC.
- Store → Rewards displays quests, quest XP, the original rank thresholds, and recent match payouts. The old displayed milestone pack gifts are not awarded by this implementation.
- Existing balances and collections remain in store_accounts. This new quest XP counter tracks rewards earned after rollout; legacy playerprogress remains preserved.
- No retroactive payouts for games finished before rollout. In-progress multiplayer games receive rewards on completion. Solo players must sign in before starting a new game; guests retain local practice.

## Verification and persistence

Multiplayer completion inserts both participant result records through a service-only trigger inside the match transaction. A unique (user_id, match_id) key prevents duplication. Store synchronization atomically credits pending results and completed quests under the same account lock as purchases. Offline players receive their earned tokens when opening their match results or store.

Solo starts receive a server-generated seed and immutable configuration. The rewards Edge Function replays the player's decisions with the canonical rules and AI, rejecting unsupported fields, incomplete games and decisions after completion. It does not accept a browser-reported winner. The solo session and result receipt make retrying safe. Pending completion requests are retained per account in the browser and can be retried in Store → Rewards. Restarting or leaving an unfinished solo game grants nothing. Solo replay accepts up to 2,000 player decisions / 200 KB.

The three new tables use RLS and have no client grants. Reward functions are security invoker with an empty search path and service-role-only execution. The store remains the only balance authority; browser code cannot write tokens or result records. Controllers lost in battle are counted even if subsequently revived. A lethal targeted choice now finalizes multiplayer state correctly.

Fresh database installation order: existing multiplayer.sql, store.sql + store-catalog.sql, then rewards.sql, before serving requests. Existing projects use the recorded Supabase migrations. Deploy rewards and multiplayer with the canonical bundled rule modules.

## Checks

- `node scripts/test-rewards.mjs`: seeded solo wins across three factions, a solo defeat, forged free plays, incomplete results and extra actions rejected.
- `supabase/rewards-tests.sql`: rollback-only accounts test both-player recording, duplicate protection, offline progress, quest XP, AI/PvP unlock wins, purchases with earned tokens, and denied client privileges.
- Existing store SQL regression checks and multiplayer/rules regression suites passed.
- Production build and changed frontend lint passed. Browser interaction was not tested in this environment.

No daily payout cap or opponent cooldown is imposed; these are invite-only playtest rewards, not a real-money economy.
