# Fatebound card abilities

187 cards: 84 creatures, 27 controllers, 52 spells, and 24 artifacts.

Playtest balance version 0.2 • 2026-09-16. Printed text comes from the supplied database with the balance patch applied. Executable rules are in `src/practice/cardAbilities.js`, with shared mechanics in `rulesEngine.js`. This inventory is also searchable through **Card library** in the app.

## Rule defaults

The user approved zero-shard unpriced activated abilities usable once per turn, Nature = Earth, Charge = Haste, and rounding fractional damage up. Other timing interpretations below are provisional and can be adjusted to the canonical rulebook.

- Unpriced activated abilities cost 0 shards and are usable once per owner turn.
- Nature means Earth; Charge means Haste. Haste bypasses summoning sickness, but not the turn 1–2 attack lock.
- Fractional damage and health conversions round up.
- A duration of N turns means N turns of the affected card’s controller. Until End Phase effects expire at the current turn’s end.
- Unqualified creature entry effects trigger on summon; repeatable costed effects appear as activated abilities.
- Unspecified duration means while the source remains in play. Optional searches and extra summons can be skipped.
- Look/search effects let the acting player select a card. AI choices use the same legal options.
- All controllers are available in the controller selector; practice decks contain creatures, spells, artifacts, and universal spells.

## Known interpretation limits

- **Reaper:** Kills do not refund attacks. The current game has no separate block/exhaust phase.
- **Frozen Spirit:** Its direct-attack bypass applies only when the sole enemy creature is Frozen; it returns after dealing damage.
- **Draco's Slayer:** Choose equipment or removal when played. Equipment requires Draco; removal requires a 6+ AP creature.
- **Sun Wolf:** On summon, choose an immediate attack when the first-two-turn attack lock permits it.
- **Shadow's Embrace:** The stolen hand card becomes a 0/base-CH Guardian token (minimum 1 CH); sacrifice it to heal that CH.
- **The Kraken:** Ink Cloud is prepared in main phase and intercepts the next attack; target selection belongs to the defender.
- **Wind Mirage:** Prepared in main phase; cancels the next controller attack and summons a defensive Wind Golem if a slot is available.
- **Binding Chains of Lightning:** While AP is zero, damage is redirected to the lowest-CH enemy controller.
- **Sphere of Ice:** Protector/Knight means Ice Protector or Frozen Knight from hand/deck.
- **Defrost:** Cleanses Freeze, Paralyze and Bind; +3 AP lasts through the current End Phase.
- **Enflamed:** With Supreme Fire Spirit, the target survives until the end of its next turn, then explodes for its marked CH, capped at 6 damage.
- **Dark Ritual:** The Shadow Master bonus resolves its free summon immediately. Out-of-turn instant-speed casting requires the future response-stack implementation.
- **Vampiric Destiny:** Search, health grant, and marked-creature return are implemented. There is no interruption window in this solo preview.
- **Spell Release:** The Wind Warlock controller condition is recognized, but this preview has no creature-to-controller promotion action.
- **Light Spirit:** The Light Bind stat-copy synergy is implemented. The supplied list does not define any separate rule for the Vessel keyword.
- **Nature's Blade:** The +3 AP and draw-on-kill effect last until the current End Phase in this preview.

These are executable solo-preview rules, not a claim that every pairwise card interaction has been exhaustively verified. Online matches still use the original database-driven engine.

## Blood

### Katana of Fate

- Code: ARFT_BLD_0001
- Type: artifact; cost: 2 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

Attached card gains +1 AP (+2 if Blood). If on Blood_General or Ren, they gain RenLarKu's current AP.
### The Generals Armor

- Code: ARFT_BLD_0002
- Type: artifact; cost: 3 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

The equipped card cannot be destroyed by Spell effects. Only combat damage can destroy it.
### Blood Pendant

- Code: ARFT_BLD_0003
- Type: artifact; cost: 2 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

Whenever the equipped card deals damage, gain 1 extra Shard during your next Energy Phase.
### Vampiric Destiny

- Code: ARFT_BLD_0004
- Type: artifact; cost: 3 shards
- Equipment target in solo play: ally creature.

**Printed effect**

When played, if it resolves without interruption, add 1 Swarm creature card from your deck or discard pile to your hand. When equipped, add the equipped creature's base CH to a creature or Controller of your choice. When the equipped creature is destroyed or sacrificed, this remains and marks that creature. At the start of your next turn, return the marked creature to the battlefield or your hand (if no slot, to hand).

**Preview interpretation:** Search, health grant, and marked-creature return are implemented. There is no interruption window in this solo preview.
### RenLarKu

- Code: CTRL_BLD_0001
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

Pay 1 CH to draw 1 card. Active: Target 1 Creature; it gains +1 AP until End Phase.

**Activated abilities in the current game**

- **Blood draw:** 0 shards + 1 controller CH; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
- **Empower creature:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Blood Weaver

- Code: CTRL_BLD_0002
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

Sacrifice 2 creatures to search Hand/Deck/Discard for a Controller and play it. Active: Pay 2 CH to prevent 1 enemy from attacking.

**Activated abilities in the current game**

- **Sacrificial ascension:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
- **Blood restraint:** 0 shards + 2 controller CH; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Blood Lord

- Code: CTRL_BLD_0003
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

At the start of your turn, if you control no creatures, steal 1 CH from the enemy Controller. Active (3 shards, once per turn): Deal 2 damage to all enemy creatures.

**Activated abilities in the current game**

- **Blood nova:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Blood General

- Code: CRTE_BLD_0001
- Type: creature; cost: 5 shards; AP: 5; CH: 8

**Printed effect**

All other Blood-type creatures you control gain +1 AP.
### Crimson Knight

- Code: CRTE_BLD_0002
- Type: creature; cost: 4 shards; AP: 4; CH: 5

**Printed effect**

This card cannot be sacrificed to satisfy requirements of other Spells or Controller abilities.
### Blood Knight

- Code: CRTE_BLD_0003
- Type: creature; cost: 3 shards; AP: 3; CH: 6

**Printed effect**

Gains +2 CH as long as your active Controller has its maximum (12) CH.
### Redeemed Knight

- Code: CRTE_BLD_0004
- Type: creature; cost: 3 shards; AP: 2; CH: 8

**Printed effect**

On Death: Heal your active Controller for 3 CH.
### Reaper

- Code: CRTE_BLD_0005
- Type: creature; cost: 4 shards; AP: 5; CH: 2

**Printed effect**

If this destroys an enemy in combat, it can still block during the opponent’s turn. This does not grant another attack.

**Preview interpretation:** Kills do not refund attacks. The current game has no separate block/exhaust phase.
### Blood Witch

- Code: CRTE_BLD_0006
- Type: creature; cost: 2 shards; AP: 2; CH: 3

**Printed effect**

Select 1 Blood Spell from your discard pile and add it to your hand.
### Blood Swarm

- Code: CRTE_BLD_0007
- Type: creature; cost: 2 shards; AP: 1; CH: 2

**Printed effect**

Pay 1 CH from Controller to summon 2 Swarm Tokens (1/1).

**Activated abilities in the current game**

- **Summon swarm:** 0 shards + 1 controller CH; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Ren

- Code: CRTE_BLD_0008
- Type: creature; cost: 2 shards; AP: 2; CH: 4

**Printed effect**

If Katana of Fate is equipped, this gains the current AP of RenLarKu.
### Zombie's Day

- Code: SPEL_BLD_0001
- Type: spell; cost: 3 shards

**Printed effect**

This turn, any creature card that was Recalled from the battlefield to its owner's hand earlier in the game may be played from hand for 0 cost; it enters Zombified. Zombified: cannot attack, cannot activate abilities, may block, may be sacrificed, removed from play on death.
### Blood Bond

- Code: SPEL_BLD_0002
- Type: spell; cost: 5 shards

**Printed effect**

Req: Blood Weaver as Controller. Take control of 1 enemy creature; it can be used for sacrifices.
### Blood Ritual

- Code: SPEL_BLD_0003
- Type: spell; cost: 0 shards

**Printed effect**

Sacrifice 1 creature you control to gain 3 temporary Shards this turn.
### Blood Magic

- Code: SPEL_BLD_0004
- Type: spell; cost: 1 shards

**Printed effect**

Target creature gains +3 AP. At End Phase, that creature is destroyed.
### Soul Siphon

- Code: SPEL_BLD_0005
- Type: spell; cost: 2 shards

**Printed effect**

Deal 2 damage to a creature. If Controller is Blood-type, heal Controller for 2 CH.
### Lifeblood

- Code: SPEL_BLD_0006
- Type: spell; cost: 4 shards

**Printed effect**

Sacrifice all creatures. Add their combined total CH to one of your Controllers as permanent Bonus Health.
### Mist of Fate

- Code: SPEL_BLD_0007
- Type: spell; cost: 3 shards

**Printed effect**

Destroy 1 enemy creature. If none, steal 2 CH. Non-Blood: Flip a coin.

## Cryo

### Sphere of Ice

- Code: ARFT_CYO_0001
- Type: artifact; cost: 3 shards
- Equipment target in solo play: ally controller.

**Printed effect**

If on Guardian Princess, summon Protector/Knight for 0. Controller gains +3 AP, but loses 1 AP per death.

**Preview interpretation:** Protector/Knight means Ice Protector or Frozen Knight from hand/deck.
### Enchanted Ice Crystal

- Code: ARFT_CYO_0002
- Type: artifact; cost: 2 shards
- Solo implementation: field artifact; no equipment target required.

**Printed effect**

Cryo spells cost 1 less. Gain +1 Shard once per turn when you Freeze an enemy.
### CyRelli Princess

- Code: CTRL_CYO_0001
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

Summon CyRelli's Tiger. If Tiger is destroyed by an effect (not battle), add its 5 CH to the Princess.
### Guardian Princess

- Code: CTRL_CYO_0002
- Type: controller; cost: 5 shards; AP: 1; CH: 12

**Printed effect**

Cryo allies gain +2 CH if Sphere of Ice is active. Active (3): Target ally cannot be destroyed by battle this turn.

**Activated abilities in the current game**

- **Royal protection:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Royal Ice Knight

- Code: CTRL_CYO_0003
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

Frozen creatures gain +2 AP. Active (2): Summon a 3/3 Wyrm with Haste for one turn.

**Activated abilities in the current game**

- **Summon frost wyrm:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### CyRelli's Tiger

- Code: CRTE_CYO_0001
- Type: creature; cost: 4 shards; AP: 5; CH: 5

**Printed effect**

Cannot attack. Its 5 AP is added to CyRelli Princess. While on field, Princess cannot be targeted by attacks.
### Frost Wyrm

- Code: CRTE_CYO_0002
- Type: creature; cost: 5 shards; AP: 5; CH: 5

**Printed effect**

Freeze effects last +1 turn. If Ice Breath is played, trigger 3-turn lockdown.
### Ice Yetti

- Code: CRTE_CYO_0003
- Type: creature; cost: 6 shards; AP: 7; CH: 8

**Printed effect**

When attacking, target and adjacent creatures are Frozen for 1 turn.
### Frozen Troll

- Code: CRTE_CYO_0004
- Type: creature; cost: 5 shards; AP: 4; CH: 10

**Printed effect**

Heals 2 CH at the start of your turn.
### Frozen Golem

- Code: CRTE_CYO_0005
- Type: creature; cost: 4 shards; AP: 2; CH: 12
- Printed keywords: Guardian

**Printed effect**

Taunt
### Ice Protector

- Code: CRTE_CYO_0006
- Type: creature; cost: 3 shards; AP: 3; CH: 7

**Printed effect**

Your Controller takes 0 damage from enemy Spells. If destroyed, Freeze the attacker for 2 turns.
### Frozen Knight

- Code: CRTE_CYO_0007
- Type: creature; cost: 3 shards; AP: 4; CH: 5

**Printed effect**

Damaged creatures are Frozen on opponent's next turn.
### Cryo Mage

- Code: CRTE_CYO_0008
- Type: creature; cost: 3 shards; AP: 3; CH: 3

**Printed effect**

Freeze one enemy creature.
### Frozen Spirit

- Code: CRTE_CYO_0009
- Type: creature; cost: 1 shards; AP: 1; CH: 1

**Printed effect**

If only 1 enemy is on field and it is Frozen, hit Controller directly. Return to hand after attack.

**Preview interpretation:** Its direct-attack bypass applies only when the sole enemy creature is Frozen; it returns after dealing damage.
### Frozen Barrage

- Code: SPEL_CYO_0001
- Type: spell; cost: 4 shards

**Printed effect**

If no allies: Recall enemies to hand. Creatures with 3 AP or less are destroyed.
### Ice Breath

- Code: SPEL_CYO_0002
- Type: spell; cost: 3 shards

**Printed effect**

If Frost Wyrm is out, enemies can't attack for 3 turns. If enemies are Cryo, play Freezing Spell for 0 cost.
### Freezing Spell

- Code: SPEL_CYO_0003
- Type: spell; cost: 3 shards

**Printed effect**

No enemy creatures or Controllers can attack on their next turn.
### Blizzard

- Code: SPEL_CYO_0004
- Type: spell; cost: 3 shards

**Printed effect**

All creatures except Cryo are Frozen for 1 turn.
### White Out

- Code: SPEL_CYO_0005
- Type: spell; cost: 2 shards

**Printed effect**

All enemy creatures lose 2 AP for 1 turn.
### Defrost

- Code: SPEL_CYO_0006
- Type: spell; cost: 1 shards

**Printed effect**

Cleanse "cannot attack" effects. Give +3 AP. If Royal Ice Knight active, tutor Blizzard or White Out.

**Preview interpretation:** Cleanses Freeze, Paralyze and Bind; +3 AP lasts through the current End Phase.

## Earth

### Earth Staff

- Code: ARFT_ETH_0001
- Type: artifact; cost: 2 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

Equipped card gains +4 CH. If attacked, attacker takes 1 damage.
### Enchanted Emerald

- Code: ARFT_ETH_0002
- Type: artifact; cost: 3 shards
- Solo implementation: field artifact; no equipment target required.

**Printed effect**

Every 2 turns, gain +1 extra Shard.
### Earth Spirit

- Code: CTRL_ETH_0001
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

Play a Nature Creature: gain 1 Shard (once per turn). Active (2): Search deck for Emerald or Guardian of the Tree.

**Activated abilities in the current game**

- **Nature’s calling:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Earth Defender

- Code: CTRL_ETH_0002
- Type: controller; cost: 5 shards; AP: 1; CH: 12

**Printed effect**

Allies cannot be moved to hand/deck by enemy effects. Active (3): Paralyze 1 enemy for 2 turns; -2 CH each turn.

**Activated abilities in the current game**

- **Entangling roots:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Giant

- Code: CTRL_ETH_0003
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

Attack with Artifact: opponent discards 1 card. Active (4): Deal 3 damage to all enemy creatures.

**Activated abilities in the current game**

- **Earthquake:** 4 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Guardian of the Tree

- Code: CRTE_ETH_0001
- Type: creature; cost: 5 shards; AP: 4; CH: 10

**Printed effect**

Search deck/discard for Vine Tree or Vine Coffin. All Nature allies heal 2 CH at end of your turn.
### Moss Dragon

- Code: CRTE_ETH_0002
- Type: creature; cost: 6 shards; AP: 6; CH: 10

**Printed effect**

Reduces all incoming damage by 2.
### Earth Serpent

- Code: CRTE_ETH_0003
- Type: creature; cost: 4 shards; AP: 4; CH: 7

**Printed effect**

Untargetable if another Nature ally is present. Deals +3 bonus damage vs Paralyzed enemies.
### Earth Knight

- Code: CRTE_ETH_0004
- Type: creature; cost: 4 shards; AP: 5; CH: 6

**Printed effect**

Artifacts cannot be destroyed by spells. On Play: Ally gains +3 CH and Freeze immunity.
### Ogre Attacker

- Code: CRTE_ETH_0005
- Type: creature; cost: 4 shards; AP: 6; CH: 4

**Printed effect**

Destroy equipped card and equipment. Takes 1 CH damage vs unequipped; cannot attack next turn.
### Witch of Nature

- Code: CRTE_ETH_0006
- Type: creature; cost: 2 shards; AP: 2; CH: 5

**Printed effect**

Heal ally for 3 CH. If equipped with Staff, attacks heal lowest ally for 2 CH.
### Gnome Warlock

- Code: CRTE_ETH_0007
- Type: creature; cost: 3 shards; AP: 3; CH: 5

**Printed effect**

When a Nature ally is destroyed, gain 1 Shard (limit 1/turn).
### Wolfen

- Code: CRTE_ETH_0008
- Type: creature; cost: 3 shards; AP: 3; CH: 3
- Printed keywords: Charge

**Printed effect**

Haste; +2 AP if you control another Wolfen or Goblin Knight.
### Goblin Knight

- Code: CRTE_ETH_0009
- Type: creature; cost: 3 shards; AP: 3; CH: 4

**Printed effect**

When summoned, you may summon another Goblin Knight from hand or deck for 0 shards. A creature summoned by this effect cannot trigger this ability.
### Golem Defender

- Code: CRTE_ETH_0010
- Type: creature; cost: 5 shards; AP: 3; CH: 10
- Printed keywords: Guardian

**Printed effect**

Taunt: Enemies attack this card first
### Tree of Life

- Code: SPEL_ETH_0001
- Type: spell; cost: 4 shards

**Printed effect**

If Guardian present: Guardian absorbs all ally CH (not Controllers), AP becomes 0, Taunts everyone. Else: Search Earth Staff.
### Nature's Bliss

- Code: SPEL_ETH_0002
- Type: spell; cost: 2 shards

**Printed effect**

If Witch is out: auto-equip Staff + Blade from hand. Else: summon Gnome or Goblin from hand.
### Vine Tree

- Code: SPEL_ETH_0003
- Type: spell; cost: 3 shards

**Printed effect**

Summon two 0/5 Wall of Vines tokens with Taunt.
### Vine Coffin

- Code: SPEL_ETH_0004
- Type: spell; cost: 3 shards

**Printed effect**

Target is Paralyzed for 2 turns and loses 2 CH each turn.
### Nature's Blade

- Code: SPEL_ETH_0005
- Type: spell; cost: 2 shards

**Printed effect**

Target gains +3 AP. If it destroys an enemy this turn, draw 1 card.

**Preview interpretation:** The +3 AP and draw-on-kill effect last until the current End Phase in this preview.

## Electric

### Lightning Stone

- Code: ARFT_ELC_0001
- Type: artifact; cost: 2 shards
- Solo implementation: field artifact; no equipment target required.

**Printed effect**

Electric spells cost 1 less. If destroyed, opponent loses 2 Shards.
### Lightning Gauntlet

- Code: ARFT_ELC_0002
- Type: artifact; cost: 2 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

If equipped to a Controller, their attacks Paralyze target for 1 turn.
### Spark Knight Blade

- Code: ARFT_ELC_0003
- Type: artifact; cost: 3 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

Equipped creature/Controller gains +2 AP. Takes 0 counter-damage when attacking.
### The Luminary

- Code: CTRL_ELC_0001
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

When an Electric Spell is played, deal 1 damage to all enemy creatures. Active (3): Target creature gains +4 AP and Haste.

**Activated abilities in the current game**

- **Thunder blessing:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Spark White Dragon

- Code: CTRL_ELC_0002
- Type: controller; cost: 5 shards; AP: 1; CH: 12

**Printed effect**

When this Controller attacks with an Artifact, deal 2 damage to a second enemy. Active (4): Deal 5 damage.

**Activated abilities in the current game**

- **Lightning burst:** 4 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Spark Knight

- Code: CTRL_ELC_0003
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

Electric Artifacts cost 1 less. Active (2): Target enemy cannot use its Passive ability next turn.

**Activated abilities in the current game**

- **Disrupt passive:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Volt-Howler

- Code: CRTE_ELC_0001
- Type: creature; cost: 4 shards; AP: 5; CH: 5

**Printed effect**

If targeted by an enemy spell, deal 2 damage to the enemy Controller. Damage dealt to creatures under Binding Chains is doubled.
### Lightning Giant

- Code: CRTE_ELC_0002
- Type: creature; cost: 5 shards; AP: 5; CH: 9

**Printed effect**

On attack, target is Paralyzed for 1 turn.
### Lightning Samurai

- Code: CRTE_ELC_0003
- Type: creature; cost: 4 shards; AP: 5; CH: 4

**Printed effect**

If it destroys a creature, it deals its full AP to enemy Controller.
### Lightning Zephyr Knight

- Code: CRTE_ELC_0004
- Type: creature; cost: 4 shards; AP: 4; CH: 4

**Printed effect**

Summon 1 Zephyr from hand/deck as Equip (+2/+2). If attacked by >6 AP, discard Zephyr to stay on field.
### Viking of Light

- Code: CRTE_ELC_0005
- Type: creature; cost: 3 shards; AP: 4; CH: 4

**Printed effect**

If your Controller has an Artifact equipped, this gains Stealth.
### Lightning Knight

- Code: CRTE_ELC_0006
- Type: creature; cost: 3 shards; AP: 4; CH: 4

**Printed effect**

Reduces all incoming damage by 1.
### Lightning Mage

- Code: CRTE_ELC_0007
- Type: creature; cost: 3 shards; AP: 3; CH: 3

**Printed effect**

Your equipped Artifacts gain +2 AP for this turn.
### Lightning Wielder

- Code: CRTE_ELC_0008
- Type: creature; cost: 3 shards; AP: 3; CH: 4

**Printed effect**

Once per turn, transfer 1 Artifact between cards for 0 cost.

**Activated abilities in the current game**

- **Transfer artifact:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Cosmic Witch

- Code: CRTE_ELC_0009
- Type: creature; cost: 2 shards; AP: 2; CH: 3

**Printed effect**

Controller Active abilities cost 1 less while active.
### Spirit of Lightning

- Code: CRTE_ELC_0010
- Type: creature; cost: 1 shards; AP: 1; CH: 1

**Printed effect**

Sacrifice: gain 2 Shards this turn.

**Activated abilities in the current game**

- **Sacrifice for energy:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Zephyr

- Code: CRTE_ELC_0011
- Type: creature; cost: 2 shards; AP: 2; CH: 2

**Printed effect**

Equip to LZK: +2 AP/+2 CH. Discard to prevent LZK removal from attacks >6 AP.

**Activated abilities in the current game**

- **Equip to Lightning Zephyr Knight:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Binding Chains of Lightning

- Code: SPEL_ELC_0001
- Type: spell; cost: 3 shards
- Solo implementation: persistent spell; remains in a spell slot.

**Printed effect**

Target cannot attack. Loses 1 AP per Electric ally. If AP hits 0, channels damage to the weakest Controller.

**Preview interpretation:** While AP is zero, damage is redirected to the lowest-CH enemy controller.
### Surreal Light

- Code: SPEL_ELC_0002
- Type: spell; cost: 4 shards

**Printed effect**

1 Electric creature gains +4 AP and Haste. On kill, play 1 Electric Artifact from hand for 0 cost.
### Wolf Lightning Strike

- Code: SPEL_ELC_0003
- Type: spell; cost: 2 shards

**Printed effect**

Deal 4 damage. If it destroys the target, damage jumps to enemy Controller.

## Fire

### Cursed Flame Sword

- Code: ARFT_FIR_0001
- Type: artifact; cost: 2 shards
- Equipment target in solo play: ally creature.

**Printed effect**

Equipped creature gains +3 AP. Every attack deals 1 damage to your Controller; if used by Draco, ignore self-damage for first 2 turns.
### Flame Orb

- Code: ARFT_FIR_0002
- Type: artifact; cost: 2 shards
- Equipment target in solo play: ally creature.

**Printed effect**

Double 1 Fire creature's AP. Destroy that creature at End Phase; it deals 2 damage to all other creatures.
### Draco's Slayer

- Code: ARFT_FIR_0003
- Type: artifact; cost: 3 shards
- Equipment target in solo play: ally creature.

**Printed effect**

As Equip: Draco gains +3 AP for 2 turns. As Spell: destroy 1 enemy creature with 6 AP or higher.

**Preview interpretation:** Choose equipment or removal when played. Equipment requires Draco; removal requires a 6+ AP creature.
### Draco Alec

- Code: CTRL_FIR_0001
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

All Fire-type creatures gain +1 AP. Active: Target 1 Fire creature can attack twice; destroyed at End Phase.

**Activated abilities in the current game**

- **Fateful assault:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Flame Emperor

- Code: CTRL_FIR_0002
- Type: controller; cost: 5 shards; AP: 1; CH: 12

**Printed effect**

Active (2 shards, once per turn): Draw 1 card. Active (2 shards, once per turn): Deal 2 damage directly to the enemy Controller.

**Activated abilities in the current game**

- **Flame insight:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
- **Imperial fire:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Supreme Fire Spirit

- Code: CTRL_FIR_0003
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

All Fire creatures gain +1 AP. Active: Pay 3 Shards to destroy 1 enemy creature with 4 CH or less.

**Activated abilities in the current game**

- **Incinerate:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Draco

- Code: CRTE_FIR_0001
- Type: creature; cost: 3 shards; AP: 4; CH: 6

**Printed effect**

Fire Spells cost 1 less while on field. If Draco Alec is Controller, Draco gains +2 AP.
### Emperor's Fire Dragon

- Code: CRTE_FIR_0002
- Type: creature; cost: 6 shards; AP: 7; CH: 9

**Printed effect**

If Flame Emperor is active, can attack twice. Pay 2 Shards to deal 3 damage to an enemy creature.

**Activated abilities in the current game**

- **Dragon flame:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Flame Dragon

- Code: CRTE_FIR_0003
- Type: creature; cost: 5 shards; AP: 6; CH: 8

**Printed effect**

Bypass Swarm tokens and attack Controller if tokens are only shields.
### Fire Paladin

- Code: CRTE_FIR_0004
- Type: creature; cost: 3 shards; AP: 4; CH: 7

**Printed effect**

When it destroys an enemy creature, heal your active Controller for 2 CH.
### Flame Samurai

- Code: CRTE_FIR_0005
- Type: creature; cost: 4 shards; AP: 5; CH: 3

**Printed effect**

When attacking a creature with lower AP, takes no recoil damage. First Strike
### Fire Knight

- Code: CRTE_FIR_0006
- Type: creature; cost: 3 shards; AP: 3; CH: 4
- Printed keywords: Charge

**Printed effect**

Charge
### Flaming Sword Bearer

- Code: CRTE_FIR_0007
- Type: creature; cost: 3 shards; AP: 3; CH: 5

**Printed effect**

On Death: Search Deck/Discard for Cursed Flame Sword or Katana of Fate; add to hand.
### Flame Guardian

- Code: CRTE_FIR_0008
- Type: creature; cost: 3 shards; AP: 1; CH: 10
- Printed keywords: Guardian

**Printed effect**

Cannot attack. High CH shield.
### Flame Wolf

- Code: CRTE_FIR_0009
- Type: creature; cost: 2 shards; AP: 2; CH: 2

**Printed effect**

If you play 1 Flame Wolf, you may play a second from hand for 0 Shards.
### Fire Witch

- Code: CRTE_FIR_0010
- Type: creature; cost: 2 shards; AP: 2; CH: 4

**Printed effect**

Deal 1 damage to an enemy Controller.
### Flame Warlock

- Code: CRTE_FIR_0011
- Type: creature; cost: 3 shards; AP: 3; CH: 3

**Printed effect**

Sacrifice 1 of your creatures to deal 3 damage to any enemy creature.

**Activated abilities in the current game**

- **Sacrificial fire:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Draco's Inferno

- Code: SPEL_FIR_0001
- Type: spell; cost: 3 shards

**Printed effect**

Requires Draco or Draco Alec on field. Deal 3 damage to all creatures. If BOTH are on field, deal 5 to all creatures and 2 to the enemy Controller instead. Cost reductions cannot reduce its casting cost below 1 shard.
### Draco's Curse

- Code: SPEL_FIR_0002
- Type: spell; cost: 5 shards

**Printed effect**

Req: Draco Alec is Controller. Take control of 1 enemy creature. If it is sacrificed or destroyed, Draco can attack twice next turn.
### Enflamed

- Code: SPEL_FIR_0003
- Type: spell; cost: 4 shards

**Printed effect**

Destroy 1 enemy creature. If Supreme Fire Spirit is active, instead mark its current CH (maximum 6); at the end of its next turn, destroy it and deal the marked amount to the enemy Controller. Earlier destruction also triggers the marked damage.

**Preview interpretation:** With Supreme Fire Spirit, the target survives until the end of its next turn, then explodes for its marked CH, capped at 6 damage.

## Light

### Dagger of Fate

- Code: ARFT_LGT_0001
- Type: artifact; cost: 2 shards
- Equipment target in solo play: ally creature.

**Printed effect**

Equipped creature gets +2 AP. If it attacks a Controller, opponent discards 1 card.
### Sword of the Sun Guardian

- Code: ARFT_LGT_0002
- Type: artifact; cost: 3 shards
- Equipment target in solo play: ally creature.

**Printed effect**

Equipped creature gets +4 AP. Sun Knight gains Stealth; Stealth attacks deal 50% damage to Controller.
### Cosmic Sunlight Goddess

- Code: CTRL_LGT_0001
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

All Light creatures gain +1 AP. Active (4): Opponent cannot play Artifacts for 2 turns.

**Activated abilities in the current game**

- **Seal artifacts:** 4 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Perfect Light Being

- Code: CTRL_LGT_0002
- Type: controller; cost: 5 shards; AP: 1; CH: 12

**Printed effect**

Light Spells cost 1 less (min 1). Active (3): Light Bind: Target cannot attack/use abilities for 2 turns.

**Activated abilities in the current game**

- **Light restraint:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Light Priest

- Code: CTRL_LGT_0003
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

Heal 1 CH to all Light creatures at turn start. Active (2): Heal any target for 3 CH.

**Activated abilities in the current game**

- **Healing light:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Michael

- Code: CRTE_LGT_0001
- Type: creature; cost: 6 shards; AP: 9; CH: 9

**Printed effect**

Cannot be summoned unless Divine Light was played this turn. Targets lose all abilities and cannot heal.
### Light Dragon

- Code: CRTE_LGT_0002
- Type: creature; cost: 5 shards; AP: 6; CH: 7

**Printed effect**

When attacking, deal 2 damage to all other enemy creatures.
### Sun Golem

- Code: CRTE_LGT_0003
- Type: creature; cost: 5 shards; AP: 2; CH: 10

**Printed effect**

Cannot attack. Reflects 50% of damage taken back to attacker.
### Sun Guardian

- Code: CRTE_LGT_0004
- Type: creature; cost: 4 shards; AP: 4; CH: 8

**Printed effect**

While active, your Controllers and Spells cannot be targeted by enemy Spells.
### Sun Commander

- Code: CRTE_LGT_0005
- Type: creature; cost: 4 shards; AP: 5; CH: 5

**Printed effect**

All Light creatures gain +2 AP for this turn.
### Sun Knight

- Code: CRTE_LGT_0006
- Type: creature; cost: 3 shards; AP: 4; CH: 5
- Printed keywords: Guardian

**Printed effect**

Guardian: Must be destroyed before opponent can attack your Controller.
### Radiant Witch

- Code: CRTE_LGT_0007
- Type: creature; cost: 3 shards; AP: 3; CH: 4

**Printed effect**

Choose 1 creature; it gains "cannot be destroyed by Spells."
### Sun Mage

- Code: CRTE_LGT_0008
- Type: creature; cost: 3 shards; AP: 3; CH: 3

**Printed effect**

Spend 1 Shard to deal 2 damage to any target.

**Activated abilities in the current game**

- **Solar bolt:** 1 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Sun Wolf

- Code: CRTE_LGT_0009
- Type: creature; cost: 2 shards; AP: 3; CH: 2
- Printed keywords: Charge

**Printed effect**

Haste. Immediately attacks

**Preview interpretation:** On summon, choose an immediate attack when the first-two-turn attack lock permits it.
### Sun Fairy

- Code: CRTE_LGT_0010
- Type: creature; cost: 2 shards; AP: 2; CH: 2

**Printed effect**

Sacrifice to grant your Controller 2 Shards.

**Activated abilities in the current game**

- **Sacrifice for shards:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Light Spirit

- Code: CRTE_LGT_0011
- Type: creature; cost: 1 shards; AP: 1; CH: 1

**Printed effect**

If Light Bind is active, gains AP/CH of the bound enemy creature. Vessel

**Preview interpretation:** The Light Bind stat-copy synergy is implemented. The supplied list does not define any separate rule for the Vessel keyword.
### Divine Light

- Code: SPEL_LGT_0001
- Type: spell; cost: 3 shards

**Printed effect**

Requires Light Enchantment. Restore Controller to 12 CH. Allows Michael to be summoned this turn.
### Light Bind

- Code: SPEL_LGT_0002
- Type: spell; cost: 2 shards

**Printed effect**

Target enemy creature cannot attack, defend, or use abilities for 2 of its controller’s turns. Enables Light Spirit stat gain while bound.
### Burning Blast

- Code: SPEL_LGT_0003
- Type: spell; cost: 2 shards

**Printed effect**

Deal 3 damage to an enemy. If it kills the target, gain 1 Shard.
### Light Enchantment

- Code: SPEL_LGT_0004
- Type: spell; cost: 2 shards
- Solo implementation: persistent spell; remains in a spell slot.
- Equipment target in solo play: ally controller.

**Printed effect**

Attach to Controller. Cut CH in half; add that amount to Controller AP. If destroyed, the Controller is destroyed.
### Divine Elemental Convergence

- Code: SPEL_LGT_0005
- Type: spell; cost: 6 shards
- Solo implementation: persistent spell; remains in a spell slot.

**Printed effect**

While active, no Spells on the field can be destroyed. All Light cards gain +1 AP. Collapse: If you have 0 Light creatures, destroy this card.

## Shadow

### Thor's Hammer

- Code: ARFT_SHD_0001
- Type: artifact; cost: 5 shards
- Equipment target in solo play: ally creature.

**Printed effect**

Equipped creature gains +5 AP. When attacking, deal 1 damage to all other enemy creatures.
### Cursed Sword

- Code: ARFT_SHD_0002
- Type: artifact; cost: 2 shards
- Equipment target in solo play: ally creature.

**Printed effect**

Equipped creature gains +4 AP. Ignores Swarm tokens. Equipped creature loses 2 CH each End Phase.
### Dark Orb

- Code: ARFT_SHD_0003
- Type: artifact; cost: 2 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

When dealing damage, look at top 3 cards and take a Shadow Spell. If sacrificed via Dark Ritual, draw 2 cards.
### Darth Ayres

- Code: CTRL_SHD_0001
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

All enemy creatures lose 1 AP. Active (4): Dark Nova: Deal 2 damage to all enemy creatures.

**Activated abilities in the current game**

- **Dark nova:** 4 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Umbra Reaver

- Code: CTRL_SHD_0002
- Type: controller; cost: 5 shards; AP: 1; CH: 12

**Printed effect**

If opponent draws extra cards, they lose 1 CH. Active (2): Deal 2 damage and heal active Controller 2 CH.

**Activated abilities in the current game**

- **Soul drain:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Shadow Master

- Code: CTRL_SHD_0003
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

May play Shadow Spells from discard (+1 cost). Active (3 shards, once per turn): Send 1 creature to the Void for 2 turns.

**Activated abilities in the current game**

- **Dark dimension:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Dark Samurai

- Code: CRTE_SHD_0001
- Type: creature; cost: 4 shards; AP: 5; CH: 4

**Printed effect**

+1 AP for every Shadow card in discard. If Shadow Spell is used on him: destroy 1 enemy Artifact or Spell.
### Dark Phantom

- Code: CRTE_SHD_0002
- Type: creature; cost: 3 shards; AP: 3; CH: 2
- Printed keywords: Stealth

**Printed effect**

Stealth; if Shadow Spell used on him: cannot be targeted by spells until next turn.
### Dark Knight

- Code: CRTE_SHD_0003
- Type: creature; cost: 4 shards; AP: 5; CH: 6

**Printed effect**

Creatures with 3 AP or less cannot attack this. Gains AP from Dark Chains siphon.
### Shadow Knight

- Code: CRTE_SHD_0004
- Type: creature; cost: 3 shards; AP: 4; CH: 4

**Printed effect**

+2 damage if opponent has no creatures. Gains AP from Dark Chains siphon.
### Dark Warlock

- Code: CRTE_SHD_0005
- Type: creature; cost: 3 shards; AP: 2; CH: 3

**Printed effect**

Force opponent to discard 1 card. Enables Black Spell bonus.
### Sigurd Shadowhand

- Code: CRTE_SHD_0006
- Type: creature; cost: 3 shards; AP: 3; CH: 4

**Printed effect**

When attacking, look at opponent hand; choose 1 card for them to discard.
### Shadow Wraith

- Code: CRTE_SHD_0007
- Type: creature; cost: 5 shards; AP: 6; CH: 5

**Printed effect**

Gains +1 AP permanently when it destroys a creature. Returns from Dark Dimension with Double AP.
### Night Terror

- Code: CRTE_SHD_0008
- Type: creature; cost: 2 shards; AP: 2; CH: 2

**Printed effect**

Hit target cannot attack/use abilities next turn. Returns from Dark Dimension with Double AP.
### Dark Dimension

- Code: SPEL_SHD_0001
- Type: spell; cost: 3 shards

**Printed effect**

Banish 1 creature for 2 turns. If your Wraith/Phantom/Terror and Shadow Master active: returns with Double AP for 1 turn.
### Black Spell

- Code: SPEL_SHD_0002
- Type: spell; cost: 4 shards

**Printed effect**

Summon 2 Tokens (2/2). If Dark Warlock is out, summon 1 Shadow creature from hand for 0 cost. None can attack this turn.
### Dark Ritual

- Code: SPEL_SHD_0003
- Type: spell; cost: 4 shards

**Printed effect**

Sacrifice 1 creature; gain 5 Shards. If Shadow Master active: get Shadow's Embrace from deck and 0-cost instant summon from hand during any phase.

**Preview interpretation:** The Shadow Master bonus resolves its free summon immediately. Out-of-turn instant-speed casting requires the future response-stack implementation.
### Shadow's Embrace

- Code: SPEL_SHD_0004
- Type: spell; cost: 5 shards

**Printed effect**

Control 1 enemy creature. If Darth Ayres bonus: steal 1 card from opponent hand as shield token. Sacrifice stolen card to heal Controller CH.

**Preview interpretation:** The stolen hand card becomes a 0/base-CH Guardian token (minimum 1 CH); sacrifice it to heal that CH.
### Dark Chains

- Code: SPEL_SHD_0005
- Type: spell; cost: 3 shards
- Solo implementation: persistent spell; remains in a spell slot.

**Printed effect**

Enemy: target cannot attack; Knights siphon its AP. Self: opponent must attack this card; survives 1st hit, dies on 2nd hit same turn.
### Shadow Spell

- Code: SPEL_SHD_0006
- Type: spell; cost: 2 shards

**Printed effect**

Target Shadow creature gains +2 AP and Stealth. Triggers Samurai or Phantom synergy.
### Dark Nova

- Code: SPEL_SHD_0007
- Type: spell; cost: 4 shards

**Printed effect**

Deal 3 damage to all creatures. If Darth Ayres is out, your units are safe. Gain 1 Shard next turn for each creature destroyed.

## Universal

### Elemental Convergence

- Code: SPEL_UNI_0001
- Type: spell; cost: 6 shards
- Solo implementation: persistent spell; remains in a spell slot.

**Printed effect**

The Great Alteration: Change all enemy card elements to one chosen element until this card leaves play. When destroyed/removed, attributes revert immediately.
### Creature Recall

- Code: SPEL_UNI_0002
- Type: spell; cost: 3 shards

**Printed effect**

Return 1 Creature or Fallen Controller (as a creature) from discard pile to your hand. Resurrection

## Water

### Spear of Neptune

- Code: ARFT_WTR_0001
- Type: artifact; cost: 3 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

Equipped card gains +4 AP. On attack, return target to hand after damage.
### Crown of Neptune

- Code: ARFT_WTR_0002
- Type: artifact; cost: 4 shards
- Solo implementation: field artifact; no equipment target required.

**Printed effect**

Water Spells cost 1 less. Gain 1 Shard every time you play a Water Spell.
### Neptune

- Code: CTRL_WTR_0001
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

Search deck/discard for 1 Water Safe. If The Kraken is on field, add 1 Kraken Slash to hand. Gain 1 Shard whenever an enemy is Recalled (bounced).
### The Kraken

- Code: CTRL_WTR_0002
- Type: controller; cost: 4 shards; AP: 1; CH: 12
- Printed keywords: Reaction

**Printed effect**

Play a Water Spell: opponent loses 1 Shard. Ink Cloud (3): Reaction during opponent attack; you choose the attack target; must hit own creatures first or own Controller if none. Reaction

**Activated abilities in the current game**

- **Prepare Ink Cloud:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.

**Preview interpretation:** Ink Cloud is prepared in main phase and intercepts the next attack; target selection belongs to the defender.
### Mermaid Empress

- Code: CTRL_WTR_0003
- Type: controller; cost: 5 shards; AP: 1; CH: 12

**Printed effect**

Water Guardians and Royal Guards gain +2 AP. Deep Recovery (2): Heal target Water creature for 4 CH.

**Activated abilities in the current game**

- **Deep recovery:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Supreme Water Dragon

- Code: CRTE_WTR_0001
- Type: creature; cost: 6 shards; AP: 8; CH: 10

**Printed effect**

Return all enemy creatures with 4 AP or less to hand.
### Water Golem

- Code: CRTE_WTR_0002
- Type: creature; cost: 5 shards; AP: 2; CH: 12
- Printed keywords: Guardian

**Printed effect**

Taunt; takes 0 damage from creatures with 6+ AP.
### Guardians of Atlantis

- Code: CRTE_WTR_0003
- Type: creature; cost: 4 shards; AP: 4; CH: 6

**Printed effect**

Your Controller takes 50% less damage from Spells.
### Shark

- Code: CRTE_WTR_0004
- Type: creature; cost: 4 shards; AP: 5; CH: 4

**Printed effect**

Gains +3 AP when attacking a creature already damaged this turn.
### Royal Guard

- Code: CRTE_WTR_0005
- Type: creature; cost: 3 shards; AP: 3; CH: 6

**Printed effect**

While Mermaid Empress is out, this card can take damage in her place.
### Lizard Warrior

- Code: CRTE_WTR_0006
- Type: creature; cost: 3 shards; AP: 4; CH: 4

**Printed effect**

If a Water Spell was played this turn: +2 AP and can attack twice.
### Water Warlock

- Code: CRTE_WTR_0007
- Type: creature; cost: 3 shards; AP: 3; CH: 5

**Printed effect**

When this deals damage to an enemy creature, steal 1 Shard.
### Water Guardian

- Code: CRTE_WTR_0008
- Type: creature; cost: 2 shards; AP: 2; CH: 6

**Printed effect**

If recalled to hand, may summon again immediately for 0 cost.
### Water Familiar

- Code: CRTE_WTR_0009
- Type: creature; cost: 1 shards; AP: 1; CH: 1

**Printed effect**

Sacrifice: look at opponent hand; choose 1 Spell, they cannot play it for 2 turns.

**Activated abilities in the current game**

- **Seal an enemy spell:** 0 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Whirlpool

- Code: SPEL_WTR_0001
- Type: spell; cost: 2 shards

**Printed effect**

Opponent cannot play Spells next turn. If a Persistent Spell is active, destroy it and add 1 Tidal Wave to your hand.
### Water Entrapment

- Code: SPEL_WTR_0002
- Type: spell; cost: 3 shards

**Printed effect**

Target is Paralyzed for 3 turns. If target is Fire attribute, discard it immediately.
### Kraken Slash

- Code: SPEL_WTR_0003
- Type: spell; cost: 3 shards

**Printed effect**

Deal 5 damage. If target survives, return it to owner's hand.
### Tidal Wave

- Code: SPEL_WTR_0004
- Type: spell; cost: 4 shards

**Printed effect**

Return all non-Water creatures to owner's hands.
### Dragon's Tsunami

- Code: SPEL_WTR_0005
- Type: spell; cost: 5 shards

**Printed effect**

Requires Supreme Water Dragon. Destroy all enemy creatures with 3 CH or less; recall the rest.
### Water Safe

- Code: SPEL_WTR_0006
- Type: spell; cost: 2 shards
- Solo implementation: persistent spell; remains in a spell slot.

**Printed effect**

Water allies cannot be targeted by non-Water. Maintenance: Pay 1 CH from Mermaid Empress per turn or discard this card.

## Wind

### Wind Orb

- Code: ARFT_WID_0001
- Type: artifact; cost: 2 shards
- Solo implementation: field artifact; no equipment target required.

**Printed effect**

+1 AP/+1 CH to all Wind allies. Draw 1 card when a Wind ally is Recalled.
### Wind Staff

- Code: ARFT_WID_0002
- Type: artifact; cost: 3 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

Equipped: When this card attacks, opponent discards 1 card.
### Wind Sword

- Code: ARFT_WID_0003
- Type: artifact; cost: 3 shards
- Equipment target in solo play: allied creature or controller.

**Printed effect**

Equipped: +2 AP/+2 CH. On Wind Keeper, attacks bounce enemies to hand.
### Wind Knight

- Code: CTRL_WID_0001
- Type: controller; cost: 4 shards; AP: 1; CH: 12

**Printed effect**

Gale Force: Your Wind creatures gain Haste. Active (3): Ronin Strike: Target ally can attack twice this turn.

**Activated abilities in the current game**

- **Ronin strike:** 3 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Wind Witch

- Code: CTRL_WID_0002
- Type: controller; cost: 5 shards; AP: 1; CH: 12

**Printed effect**

Sky Blessing: First Wind Spell each turn costs 1 less. Active (2): Mirage Veil: Target ally cannot be targeted by spells for 1 turn.

**Activated abilities in the current game**

- **Mirage veil:** 2 shards; once per owner turn. See printed effect above for the effect and any additional sacrifice or target requirements.
### Spirit of the Wind

- Code: CTRL_WID_0003
- Type: controller; cost: 6 shards; AP: 1; CH: 12

**Printed effect**

Cyclonic Flow: Gain 1 Shard when a card is Recalled. Ghost Strike: If Smoke Body is active, can attack Controllers directly.
### Wind Dragon

- Code: CRTE_WID_0001
- Type: creature; cost: 6 shards; AP: 7; CH: 9

**Printed effect**

Attacks deal 2 splash damage to all other enemies. Protects your board from Sweeping Wind.
### Wind Golem

- Code: CRTE_WID_0002
- Type: creature; cost: 5 shards; AP: 3; CH: 11
- Printed keywords: Guardian

**Printed effect**

Reduces incoming non-magical damage by 3. Taunt. Summoned by Wind Mirage.
### Wind Ronin

- Code: CRTE_WID_0003
- Type: creature; cost: 4 shards; AP: 5; CH: 5

**Printed effect**

Double Strike.
### Wind Warrior

- Code: CRTE_WID_0004
- Type: creature; cost: 4 shards; AP: 4; CH: 6

**Printed effect**

Give an ally +2 AP. Gains +2 AP per Wind ally if your side holds a creature via Wind Control.
### Wind Warlock

- Code: CRTE_WID_0005
- Type: creature; cost: 3 shards; AP: 3; CH: 5

**Printed effect**

Arcane Anchor: While on field, Dark Infusion becomes a searcher. If in Controller slot, Spell Release becomes a board-wipe.
### Wind Keeper

- Code: CRTE_WID_0006
- Type: creature; cost: 3 shards; AP: 2; CH: 7

**Printed effect**

Artifacts can't be destroyed. If holding Wind Sword, attacks return enemies to hand (1x/turn).
### Wind Pack

- Code: CRTE_WID_0007
- Type: creature; cost: 3 shards; AP: 3; CH: 3

**Printed effect**

When summoned, you may summon another Wind Pack from your deck for 0 shards. A creature summoned by this effect cannot trigger this ability.
### Tempest

- Code: SPEL_WID_0001
- Type: spell; cost: 4 shards

**Printed effect**

For each enemy creature that was Recalled or returned to hand this turn, deal 1 damage to an enemy Controller. If 3+ were Recalled/returned, draw 1 card.
### Wind Control

- Code: SPEL_WID_0002
- Type: spell; cost: 4 shards

**Printed effect**

Take an enemy for 2 turns, then destroy it. Buffs Wind Warrior based on your Wind allies.
### Sweeping Wind

- Code: SPEL_WID_0003
- Type: spell; cost: 5 shards

**Printed effect**

Recall all creatures. If Dragon is out, only hits enemies. Draw 1: if Spell, play; if Creature, shuffle.
### Spell Release

- Code: SPEL_WID_0004
- Type: spell; cost: 3 shards

**Printed effect**

Destroy 1 target Spell. If Warlock is Controller, destroy all enemy Spells/Persistent Spells.

**Preview interpretation:** The Wind Warlock controller condition is recognized, but this preview has no creature-to-controller promotion action.
### Dark Infusion

- Code: SPEL_WID_0005
- Type: spell; cost: 3 shards

**Printed effect**

Search for Wind Control if Warlock is out, or deal 3 damage to enemy Controller.
### Wind Protection

- Code: SPEL_WID_0006
- Type: spell; cost: 3 shards

**Printed effect**

If you have 2+ Wind allies, they cannot be attacked for 3 turns.
### Smoke Body

- Code: SPEL_WID_0007
- Type: spell; cost: 2 shards
- Solo implementation: persistent spell; remains in a spell slot.
- Equipment target in solo play: ally unit.

**Printed effect**

Target allied creature or Controller is invulnerable and untargetable until the start of your next turn, then discard this spell. Enables Spirit of the Wind direct attacks while active.
### Wind Mirage

- Code: SPEL_WID_0008
- Type: spell; cost: 3 shards
- Printed keywords: Reaction

**Printed effect**

Stops an attack on Controller; summons a defensive Wind Golem (cannot attack).

**Preview interpretation:** Prepared in main phase; cancels the next controller attack and summons a defensive Wind Golem if a slot is available.
