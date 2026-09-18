# Fatebound solo arena

## Run

From this folder, run `npm ci` once, then `npm run dev -- --host 127.0.0.1`.
Open http://127.0.0.1:5173/ and choose Enter the arena.

The root page and `/practice` load the local solo arena without a login. `/login` and `/TCGMainMenu` retain the original account experience and Supabase requirements. This work does not migrate or modify online card data.

## Cards and controls

- All 187 supplied cards have named rule entries and appear in the searchable **Card library**. See `CARD_ABILITIES.md` for the complete printed list and interpretation notes.
- Choose your element and controller, opponent element/controller, and difficulty. Practice decks contain 14 creatures, 8 faction spells, 4 artifacts, 2 reserve controllers, and 2 universal spells.
- Summon creatures by selecting a hand card and an empty slot. Click spells/artifacts to play; a dialog requests targets, equipment recipients, searches, or other choices. Cancellation leaves cards and resources unchanged.
- Click a unit’s sparkle button for activated abilities. Each ability is usable once per owner turn; priced abilities pay shards and/or controller CH.
- Artifacts and persistent spells appear in their own rows. Units show status badges and derived stats. Damage, death effects, auras, tokens, shields, delayed returns, and turn expiry share one solo rules engine for both players.
- The AI simulates combat before committing. Controllers preserve a health reserve, avoid equal-or-worse recoil trades and non-winning sacrifices, and consider visible next-turn threats. Efficient creature attacks and safe winning attacks are prioritized. This is a heuristic, not a full multi-turn strategic search.

## Rule decisions and limits

The user approved: unpriced activated abilities cost zero shards and are once per turn; Nature means Earth; Charge means Haste; fractional damage rounds up. The corrected local ID of Cryo Mage is `CRTE_CYO_0008`; Ice Protector retains `CRTE_CYO_0006`.

Other timing choices are documented in `CARD_ABILITIES.md` and the app. Reactions are prepared in main phase and intercept a qualifying attack; there is no general response stack yet. The Dark Ritual instant-speed bonus is resolved immediately. Wind Warlock’s controller-only combination lacks a promotion action because that rule was not supplied. Vessel has no independent definition in the provided list. These remain rules-preview limitations rather than verified official rules.

Games are held in memory and reset on refresh. Artwork uses the supplied remote URLs with fallback frames. Desktop is the primary battlefield layout; narrower screens can scroll the board. Existing online gameplay has not been verified or switched to this engine.

## Validation

- `npm run test:rules`: 38 regression checks, all 27 controller starts, all 187 rule entries, and 9 complete deterministic AI simulations.
- `node node_modules/eslint/bin/eslint.js src/practice --quiet`
- `npm run build`
- Browser checks: controller summon synergy, creature aura, equipment target selection and AP bonus, activated ability choice/status, end-phase destruction and AI turn progression.

The tests cover representative mechanics and controller safety; they do not exhaust every possible card pairing. The earlier `practiceEngine.js` and `test-practice.mjs` are legacy base-stat prototype files; the live UI now imports `rulesEngine.js` and the primary suite is `test:rules`.

## Rules 0.4
Gain 2 shards per own Energy Phase. After end-of-turn effects, choose excess hand cards to discard until 7 remain. Drawing above 7 during the turn is allowed. Discarded cards enter the graveyard. AI follows the same limit.


## Combat presentation
Attacks announce both cards, move the attacker toward its target, then reveal damage with a reading pause. Solo AI awaits each presentation; received multiplayer updates are queued in order. Reduced-motion users receive a stationary announcement. The battle log stays visible on desktop and mobile.

