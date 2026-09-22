# The Deathbound

Select **Blood → Veyra, the Bloodmother** or **Shadow → Mordrath, Keeper of Graves** in solo or multiplayer. Both use the same 30-card mixed Shadow/Blood deck with a single starting Controller (12 CH, no shard cost). The complete pool is 21 designs: 20 collectible cards and one effect-only Risen token.

All supplied abilities have executable rules in `src/practice/deathbound.js`, shared by the browser, multiplayer service and solo reward verifier. No Deathbound ability is a description-only placeholder. New artwork has not been supplied; these cards use the existing fallback appearance.

## Confirmed rules

- All eleven regular Deathbound creatures and Risen are Undead. Controllers are not Undead creatures.
- Blood Stitcher uses the game's once-per-owner-turn activation rule, as do Blood Price and Consume.
- Call From Below selects a non-token Undead in your graveyard that was actually destroyed this game. A merely discarded creature is ineligible. Revival creates a fresh instance and repeats summon abilities.
- The First Corpse and Death Wave belong to both Shadow and Blood; either Deathbound controller can use the entire mixed deck. The First Corpse is limited to one allied copy in play.
- The Bone Pit occupies a persistent spell slot.
- Risen have no shard cost, cannot be drawn or bought in packs, and disappear when destroyed rather than entering the graveyard.

## Engine timing

- The battlefield still has five creature slots. Token creation fills only available slots; excess tokens are not created. Veyra cannot activate Blood Price on a full field.
- Paying Controller CH is a cost and requires more CH than the amount paid. Fresh Corpse deals damage instead and can kill your Controller.
- Mordrath, Corpse Harvester and The Bone Pit count each player's turn separately. A sacrifice is a destruction and triggers them. Recall, discard, and banishment do not.
- Refuse Death prevents both lethal damage and direct destruction once per instance, leaving exactly 1 CH. It does not count as a death. Silence disables it, and its spent marker is visible on the card.
- Area damage uses the engine's existing ordered resolution over the creatures present when the effect begins. Newly summoned replacement Risen are not damaged by that same Death Wave. Only creatures actually destroyed by its damage count toward its healing, capped at 3.
- Blood Husk and Sanguine Ghoul also trigger when their retaliation damage meets the printed condition. Prevented damage and prevented destruction do not trigger their rewards.
- Optional sacrifices use the existing choice dialog. Skip stops the effect; cancellation before commitment preserves cards, shards and CH.

## Compatibility and verification

Balance 0.5 adds the Deathbound deck. Existing 0.4 active matches and solo reward sessions remain supported; the old fixed decks retain their order and composition. Create a new room if an old unjoined invite reports a version mismatch.

Run `node scripts/test-deathbound.mjs` for card-specific and multiplayer-choice tests plus two complete AI matches. Existing rules, protection, economy, multiplayer and reward replay suites remain applicable. `node scripts/bundle-multiplayer.mjs --json` copies the canonical modules for both deployed Edge Functions.
