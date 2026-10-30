# Learn to Play

The lobby links to `/tutorial`. Eight preset practice scenes use the canonical rules engine for drawing, energy, summoning, equipment, targeted spells, Controller abilities, shield-first combat, and defeating a Controller. Scenes explain their preset turn/resources; ordinary match rules do not change. There is no timer. The learner chooses highlighted cards/targets and explicitly continues after each result.

Completion actions are saved locally so guests can sign in and return to `/tutorial`. The rewards Edge Function replays every lesson, authenticates the account, then invokes the service-role-only `tutorial_reward_claim` RPC. The database locks the account and stores one unique tutorial claim per user. It directly grants five cards using Starter Pack rarity odds (70% common, 25% uncommon, 5% rare), adds a zero-cost store receipt, and leaves tokens unchanged. Repeated or concurrent claims return the same cards. Pack opening and collection delivery are one transaction. Existing normal AI win rewards remain 10 tokens; no extra follow-up bonus is added.

Database migration: `tutorial_one_time_free_pack` (applied through Supabase migration API). `tutorial_rewards` has RLS and no client grants; the RPC is invoker security and executable only by service_role. A rollback-only database test checks five-card delivery, unchanged tokens, idempotency and denied client RPC permissions. Local verification: `node scripts/test-tutorial.mjs`.

The server verifies a complete legal tutorial transcript, not human attention or bot resistance. Rewards are limited per account. Browser storage is a convenience, not proof of completion.
