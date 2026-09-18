export const BALANCE_VERSION = '0.4 • 2026-09-17';
// Playtest tuning. Keep the supplied database intact for before/after comparisons.
export const balancePatch = {
  'Flame Dragon': { description: 'Creature protection applies: defeat shield creatures, then other creatures, before attacking a Controller. Can bypass this order only if it gains Stealth.', reason: 'The confirmed protection rule allows only creature Stealth to bypass defenders.' },
  'Frozen Spirit': { description: 'Return to hand after dealing attack damage. Can attack a protected Controller only if it gains Stealth.', reason: 'A lone Frozen creature still protects its Controller.' },
  'Cursed Sword': { description: 'Equipped creature gains +4 AP and loses 2 CH each End Phase. Creature protection applies unless the equipped creature has Stealth.', reason: 'Swarm tokens also protect Controllers; this equipment does not grant Stealth.' },
  'Sun Knight': { description: 'Guardian: Enemies must attack this shield creature before other creatures or Controllers, unless attacking with a creature that has Stealth.', reason: 'Shield priority protects the whole formation.' },
  'Goblin Knight': { description: 'When summoned, you may summon another Goblin Knight from hand or deck for 0 shards. A creature summoned by this effect cannot trigger this ability.', reason: 'Stops recursive free board filling.' },
  'Wind Pack': { description: 'When summoned, you may summon another Wind Pack from your deck for 0 shards. A creature summoned by this effect cannot trigger this ability.', reason: 'Stops recursive free board filling.' },
  'Blood Lord': { description: 'At the start of your turn, if you control no creatures, steal 1 CH from the enemy Controller. Active (3 shards, once per turn): Deal 2 damage to all enemy creatures.', reason: 'Prices repeatable area damage.' },
  'Shadow Master': { description: 'May play Shadow Spells from discard (+1 cost). Active (3 shards, once per turn): Send 1 creature to the Void for 2 turns.', reason: 'Prices repeatable removal.' },
  'Flame Emperor': { description: 'Active (2 shards, once per turn): Draw 1 card. Active (2 shards, once per turn): Deal 2 damage directly to the enemy Controller.', reason: 'Prices repeatable controller damage.' },
  "Draco's Inferno": { cost: 3, description: 'Requires Draco or Draco Alec on field. Deal 3 damage to all creatures. If BOTH are on field, deal 5 to all creatures and 2 to the enemy Controller instead. Cost reductions cannot reduce its casting cost below 1 shard.', reason: 'Board damage requires meaningful investment even with discounts.' },
  'Smoke Body': { description: 'Target allied creature or Controller is invulnerable and untargetable until the start of your next turn, then discard this spell. Enables Spirit of the Wind direct attacks while active.', reason: 'Prevents permanent protection for 2 shards.' },
  'Blood Bond': { cost: 5, reason: 'Permanent theft both removes an enemy and adds an ally.' },
  "Draco's Curse": { cost: 5, reason: 'Permanent theft plus a death bonus needs a higher cost.' },
  "Shadow's Embrace": { cost: 5, reason: 'Permanent theft plus its synergy needs a higher cost.' },
  'Light Bind': { description: 'Target enemy creature cannot attack, defend, or use abilities for 2 of its controller’s turns. Enables Light Spirit stat gain while bound.', reason: 'Shortens cheap disabling without removing its synergy.' },
  'Spark Knight Blade': { cost: 3, reason: 'Premium price for +2 AP and prevention of counter-damage.' },
  'Enflamed': { description: 'Destroy 1 enemy creature. If Supreme Fire Spirit is active, instead mark its current CH (maximum 6); at the end of its next turn, destroy it and deal the marked amount to the enemy Controller. Earlier destruction also triggers the marked damage.', reason: 'Caps the controller burst at 6 damage.' },
  'Frozen Troll': { description: 'Heals 2 CH at the start of your turn.', reason: 'Healing occurs once per round rather than twice.' },
  'Reaper': { description: 'If this destroys an enemy in combat, it can still block during the opponent’s turn. This does not grant another attack.', reason: 'Corrects an unintended attack refund. Separate blocking is not implemented in solo play.' },
};
