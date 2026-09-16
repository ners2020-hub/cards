# Invite-only multiplayer playtest

> Implementation update (2026-09-16): invite-only multiplayer now uses the local balance 0.2 rules. The backend is deployed and live multiplayer tests passed. See `MULTIPLAYER.md` for architecture, verification, cleanup and the remaining frontend-hosting step. The original plan below is retained as design context.

## Current state

The local arena uses `src/practice/rulesEngine.js` and balance patch 0.2. Existing Supabase lobby and PvP code uses the older `src/components/tcg/gameEngine.jsx`. It cannot simply be enabled to play the current rules.

The existing client writes both players' full states and polls full records. Full hands and deck order must remain private. `endPvPTurnDb` also references an undefined `player` variable. Lobby joins need an atomic check that the second seat is still empty.

## Recommended first release

1. **One shared rules engine.** Extract or adapt the current pure rules module for browser previews and a server action handler. Pin a balance version to each match. Translate player seat identity rather than trusting client `isMyTurn` values. Make player choices server-held and validate each selected option.
2. **Authenticated two-player rooms.** Reuse Supabase login; identify seats by auth UUID. Create and join invite-code rooms atomically. Start only once both decks and controllers validate. Initially use fixed test decks and no public matchmaking.
3. **Server-validated actions.** An authenticated Edge Function receives match ID, expected version, unique action ID, and action/choice. Load authoritative state, validate ownership, phase, cost, target and pending choices, apply the move and commit with compare-and-swap. Reject stale moves and deduplicate retries. Randomness and deck shuffling happen on the server.
4. **Private player views.** Keep full state in a server-only table. Return each player's own hand, public battlefield and discard, and only counts for the opponent's hand and decks. Do not broadcast full snapshots or hidden search choices. Test responses, logs and error messages for hidden-card leakage.
5. **Live updates and reconnect.** Notify participants through private Supabase Realtime channels authorized by match membership. On notification or reconnect fetch the latest sanitized view. Presence shows connection state; disconnecting must not delete the match. Preserve current animations by sending public action events with the new version.
6. **Test and publish.** Verify two distinct accounts can finish games; test simultaneous joins, repeated actions, illegal moves, stale versions, browser refresh and reconnect. Deploy the frontend to a public HTTPS host with production auth URLs configured. The current localhost address is accessible only on this computer. Keep backend secret keys on the server.

## Playtest feedback

Record match/balance version, deck and controller choices, winner, turn count and concession reason. Provide a bug-report action that attaches match ID and public action history. Compare faction/controller outcomes across human games before tuning again; deterministic AI simulations are regression checks, not a balance study.

## Official implementation references

- Supabase function authentication: https://supabase.com/docs/guides/functions/auth
- Private Realtime authorization: https://supabase.com/docs/guides/realtime/authorization

This document is an implementation plan. Multiplayer has not been migrated or deployed by the balance update.
