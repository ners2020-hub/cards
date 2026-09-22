// Deathbound master list. Tokens are visible in the library, never in packs or decks.
const card = (id, name, element, card_type, cost, ap, ch, description, extra = {}) => ({ id, name, element, card_type, cost, ...(ap !== null ? { ap, ch } : {}), description, keywords: [], archetype: 'deathbound', ...extra });
const creature = (id, name, element, cost, ap, ch, description, extra = {}) => card(id, name, element, 'creature', cost, ap, ch, description, { subtypes: ['Undead'], ...extra });
const spell = (id, name, element, cost, description, extra = {}) => card(id, name, element, 'spell', cost, null, null, description, extra);
export const deathboundCards = Object.fromEntries([
  card('CTRL_BLD_DB01', 'Veyra, the Bloodmother', 'blood', 'controller', 0, 1, 12, 'Blood Price — Once per turn, pay 1 Controller CH to summon 1 Risen. Starting Controller for the Deathbound deck.', { startingOnly: true }),
  card('CTRL_SHD_DB01', 'Mordrath, Keeper of Graves', 'shadow', 'controller', 0, 1, 12, 'Restless Dead — Once per turn, when an allied creature is destroyed, gain 1 Shard. Starting Controller for the Deathbound deck.', { startingOnly: true }),
  creature('CRTE_SHD_DB01', 'Graveborn Wretch', 'shadow', 1, 1, 2, 'Undead. Grave Whisper — When destroyed, gain 1 Shard.'),
  creature('CRTE_BLD_DB01', 'Blood Husk', 'blood', 1, 2, 1, 'Undead. Blood Frenzy — When this creature deals damage to an enemy Controller, heal your Controller for 1 CH.'),
  creature('CRTE_SHD_DB02', 'Crypt Crawler', 'shadow', 2, 2, 3, 'Undead. No ability.'),
  creature('CRTE_BLD_DB02', 'Blood Stitcher', 'blood', 2, 1, 4, 'Undead. Stitch Flesh — Once per turn, pay 1 Controller CH to heal an allied Undead creature for 2 CH.'),
  creature('CRTE_SHD_DB03', 'Gravecaller', 'shadow', 3, 2, 3, 'Undead. Unearth — When summoned, summon 2 Risen.'),
  creature('CRTE_BLD_DB03', 'Corpse Harvester', 'blood', 3, 3, 3, 'Undead. Harvest — When another allied creature is destroyed, heal your Controller for 1 CH. Maximum twice per turn.'),
  creature('CRTE_SHD_DB04', 'Hollow Knight', 'shadow', 3, 3, 5, 'Undead. Guardian — Must be attacked before other creatures or Controllers, unless the attacker has Stealth.', { keywords: ['Guardian'] }),
  creature('CRTE_BLD_DB04', 'Sanguine Ghoul', 'blood', 4, 4, 4, 'Undead. Blood Feast — When this creature destroys an enemy creature, deal 1 damage to the enemy Controller.'),
  creature('CRTE_SHD_DB05', 'Gravebound Horror', 'shadow', 4, 5, 5, 'Undead. Refuse Death — The first time this creature would be destroyed, it remains in play with 1 CH instead.'),
  creature('CRTE_BLD_DB05', 'Flesh Colossus', 'blood', 5, 6, 6, 'Undead. Made From the Dead — When summoned, you may destroy up to 2 allied Risen. For each destroyed, gain +1 AP and +2 maximum/current CH.'),
  creature('CRTE_MIX_DB01', 'The First Corpse', 'shadow', 7, 7, 8, 'Unique Undead. Ancient Dead — When summoned, summon 1 Risen per other allied Undead, up to 3. Consume — Once per turn, destroy an allied Risen to heal this creature for 2 CH.', { is_unique: true, elements: ['shadow', 'blood'] }),
  spell('SPEL_BLD_DB01', 'Fresh Corpse', 'blood', 1, 'Deal 1 damage to your Controller, then summon 2 Risen.'),
  spell('SPEL_SHD_DB01', "Shadow's Grasp", 'shadow', 2, 'Deal 2 damage to an enemy creature.'),
  spell('SPEL_BLD_DB02', 'Bloodletting', 'blood', 2, 'Deal 2 damage to an allied creature, then gain 2 Shards.'),
  spell('SPEL_BLD_DB03', 'Feast of Corpses', 'blood', 3, 'Destroy up to 2 allied Risen. Heal your Controller for 2 CH per Risen destroyed.'),
  spell('SPEL_SHD_DB02', 'Call From Below', 'shadow', 4, 'Return a non-token Undead creature from your graveyard to play. It must have been destroyed this game; a creature merely discarded is not eligible.'),
  spell('SPEL_MIX_DB01', 'Death Wave', 'shadow', 5, 'Deal 2 damage to all creatures. Heal your Controller for 1 CH per creature destroyed by Death Wave, up to 3 CH.', { elements: ['shadow', 'blood'] }),
  spell('PERS_SHD_DB01', 'The Bone Pit', 'shadow', 3, 'Persistent. Once per turn, when an allied creature is destroyed, summon 1 Risen.', { is_persistent: true }),
  creature('TOKEN_RISEN', 'Risen', 'shadow', 0, 1, 1, 'Undead token. Created by effects only; cannot be included in decks or revived from the graveyard.', { token: true }),
].map(c => [c.id, c]));

export const isUndead = card => card?.subtypes?.includes('Undead');
const allies = c => c.me.creatures.filter(Boolean);
const risen = u => u.card.id === 'TOKEN_RISEN';
const room = c => { if (!c.me.creatures.some(u => !u)) throw new Error('You need an empty creature slot.'); };
const summonRisen = (c, count = 1) => { for (let i = 0; i < count && c.me.creatures.some(u => !u); i++) c.summon(c.byName.Risen); };
const destroyRisen = (c, optional = false) => {
  const u = c.target('ally creature', optional, risen);
  return u && c.destroy(u, 'sacrifice');
};
const consumeUpToTwo = (c, reward) => {
  for (let i = 0; i < 2; i++) { if (!destroyRisen(c, true)) break; reward(); }
};
const onceDeath = (c, unit, key) => {
  if (unit.side !== c.side || unit.zone !== 'creatures' || c.source.flags[key] === c.g.turnNumber) return false;
  c.source.flags[key] = c.g.turnNumber; return true;
};
export const deathboundDefinitions = {
  'Veyra, the Bloodmother': { active: [{ label: 'Blood Price: summon Risen', ch: 1, run(c) { room(c); summonRisen(c); } }] },
  'Mordrath, Keeper of Graves': { unitDied(c, { unit }) { if (onceDeath(c, unit, 'restlessDeadTurn')) { c.gain(1); c.note('Restless Dead: +1 Shard.'); } } },
  'Graveborn Wretch': { onDeath(c) { c.gain(1); c.note('Grave Whisper: +1 Shard.'); } },
  'Blood Husk': { dealtDamage(c, target) { if (target.side !== c.side && target.zone === 'controllers') c.heal(c.controller(), 1); } },
  'Crypt Crawler': {},
  'Blood Stitcher': { active: [{ label: 'Stitch Flesh: heal Undead', ch: 1, run(c) { c.heal(c.target('ally creature', false, u => isUndead(u.card)), 2); } }] },
  'Gravecaller': { onPlay: c => summonRisen(c, 2) },
  'Corpse Harvester': { unitDied(c, { unit }) {
    if (unit.side !== c.side || unit.zone !== 'creatures' || unit.uid === c.source.uid) return;
    if (c.source.flags.harvestTurn !== c.g.turnNumber) { c.source.flags.harvestTurn = c.g.turnNumber; c.source.flags.harvestCount = 0; }
    if (c.source.flags.harvestCount >= 2) return;
    c.source.flags.harvestCount++; c.heal(c.controller(), 1); c.note('Harvest: heal Controller for 1 CH.');
  } },
  'Hollow Knight': { traits: { guardian: true } },
  'Sanguine Ghoul': { destroyedEnemy(c, target) { if (target.side !== c.side && target.zone === 'creatures') c.damage(c.controller(c.opponent), 1); } },
  'Gravebound Horror': { preventDeath(c) {
    if (c.source.statuses['Refuse Death spent']) return false;
    c.source.damage = c.source.maxCH - 1;
    c.status(c.source, 'Refuse Death spent'); c.note('Gravebound Horror refuses death and remains at 1 CH.'); return true;
  } },
  'Flesh Colossus': { onPlay(c) { consumeUpToTwo(c, () => c.buff(c.source, 1, 2)); } },
  'The First Corpse': {
    onPlay(c) { summonRisen(c, Math.min(3, allies(c).filter(u => u.uid !== c.source.uid && isUndead(u.card)).length)); },
    active: [{ label: 'Consume: destroy Risen and heal 2 CH', run(c) { if (destroyRisen(c)) c.heal(c.source, 2); } }],
  },
  'Fresh Corpse': { onPlay(c) { c.damage(c.controller(), 1); summonRisen(c, 2); } },
  "Shadow's Grasp": { onPlay: c => c.damage(c.target('enemy creature'), 2) },
  'Bloodletting': { onPlay(c) { c.damage(c.target('ally creature'), 2); c.gain(2); } },
  'Feast of Corpses': { onPlay(c) { consumeUpToTwo(c, () => c.heal(c.controller(), 2)); } },
  'Call From Below': { onPlay(c) {
    room(c);
    const card = c.search(card => card.card_type === 'creature' && isUndead(card) && !card.token && card.destroyedThisGame, ['graveyard'], false);
    c.me.hand.splice(c.me.hand.indexOf(card), 1); c.summon(card);
  } },
  'Death Wave': { onPlay(c) { const killed = c.aoe(2, [...allies(c), ...c.enemy.creatures.filter(Boolean)]); c.heal(c.controller(), Math.min(3, killed)); } },
  'The Bone Pit': { persistent: true, unitDied(c, { unit }) { if (onceDeath(c, unit, 'bonePitTurn')) summonRisen(c); } },
  'Risen': {},
};

// Fixed 30-card mixed deck: either starting controller commands the same pool.
export const deathboundDeck = [
  ...['Graveborn Wretch', 'Blood Husk', 'Crypt Crawler', 'Blood Stitcher', 'Gravecaller', 'Corpse Harvester', 'Hollow Knight', 'Sanguine Ghoul', 'Gravebound Horror'].flatMap(name => [name, name]),
  'Flesh Colossus', 'The First Corpse',
  'Fresh Corpse', 'Fresh Corpse', "Shadow's Grasp", "Shadow's Grasp", 'Bloodletting', 'Bloodletting',
  'Feast of Corpses', 'Call From Below', 'Death Wave', 'The Bone Pit',
];
