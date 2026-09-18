import { cards, byName, elements } from './catalog.js';
import { definitions } from './cardAbilities.js';
import { chooseCombatMove } from './aiStrategy.js';

export { cards, elements };
const sides = ['playerState', 'opponentState'];
const other = side => sides.find(s => s !== side);
const clone = value => structuredClone(value);
const zones = ['controllers', 'creatures', 'artifacts', 'spells'];
const units = (g, side) => ['controllers', 'creatures'].flatMap(zone => g[side][zone].filter(Boolean));
const field = (g, side) => zones.flatMap(zone => g[side][zone].filter(Boolean));
const active = (g, side) => g[side].controllers.find(Boolean);
const definition = unit => definitions[unit?.card?.name || unit?.name] || {};
const alive = (g, unit) => unit && field(g, unit.side).some(u => u.uid === unit.uid);
const hasStatus = (unit, name) => !!unit?.statuses?.[name];
const suppressed = unit => hasStatus(unit, 'Silenced') || hasStatus(unit, 'Passive disabled');
class Choice extends Error { constructor(prompt, options, side) { super(prompt); this.options = options; this.side = side; } }
function random(g) { g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0; return g.seed / 4294967296; }
function note(g, text) { g.log = [...g.log.slice(-79), text]; }
function find(g, uid) { for (const side of sides) for (const zone of zones) { const unit = g[side][zone].find(u => u?.uid === uid); if (unit) return unit; } return null; }
function locate(g, unit) { for (const side of sides) for (const zone of zones) { const index = g[side][zone].findIndex(u => u?.uid === unit.uid); if (index >= 0) return { side, zone, index }; } return null; }
function makeUnit(g, side, card, zone = 'creatures') {
  return { uid: `u${++g.serial}`, side, owner: side, zone, card: clone(card), baseElement: card.element, damage: 0, bonusAP: 0, bonusCH: 0, statuses: {}, flags: {}, used: {}, summonedTurn: g.turnNumber, attacksUsed: 0, currentAP: card.ap || 0, currentCH: card.ch || 0, maxCH: card.ch || 0, isActive: zone === 'controllers' };
}
function recalc(g) {
  for (const side of sides) for (const zone of ['hand', 'deck', 'graveyard']) for (const card of g[side][zone]) card.instanceId ||= `c${++g.serial}`;
  for (const side of sides) for (const u of field(g, side)) {
    u.card.element = u.baseElement;
    u.currentAP = (u.card.ap || 0) + u.bonusAP;
    u.maxCH = (u.card.ch || 0) + u.bonusCH;
    u.traits = suppressed(u) ? {} : { ...(definition(u).traits || {}) };
    u.attackLimit = u.traits.double ? 2 : 1;
    for (const [name, status] of Object.entries(u.statuses)) {
      if (status.source && !find(g, status.source)) { delete u.statuses[name]; continue; }
      u.currentAP += status.ap || 0; u.maxCH += status.ch || 0;
      if (status.trait) u.traits[status.trait] = true;
    }
  }
  // Element conversion precedes element-sensitive auras.
  for (const side of sides) for (const spell of g[side].spells.filter(Boolean)) if (spell.card.name === 'Elemental Convergence' && spell.flags.element) {
    for (const u of field(g, other(side))) u.card.element = spell.flags.element;
  }
  for (const source of sides.flatMap(side => field(g, side)).sort((a, b) => (definition(a).priority || 0) - (definition(b).priority || 0))) {
    if (!suppressed(source)) definition(source).aura?.(context(g, source.side, source, { auto: true }));
  }
  for (const side of sides) for (const u of units(g, side)) {
    u.currentAP = Math.max(0, u.currentAP); u.maxCH = Math.max(1, u.maxCH);
    u.currentCH = Math.max(0, u.maxCH - u.damage);
    if (u.traits.double || hasStatus(u, 'Double attack')) u.attackLimit = 2;
    u.attacksRemaining = Math.max(0, u.attackLimit - u.attacksUsed);
    u.canAttack = g.turnNumber >= 3 && u.attacksRemaining > 0 && !u.traits.cannotAttack && !['Frozen', 'Paralyzed', 'Bound', 'Zombified'].some(s => hasStatus(u, s)) && (u.summonedTurn < g.turnNumber || u.traits.haste);
  }
}
function select(ctx, prompt, options, optional = false) {
  if (!options.length) { if (optional) return null; throw new Error(`No legal choice: ${prompt}`); }
  if (optional) options = [...options, { id: 'skip', label: 'Skip', value: null }];
  const { input } = ctx;
  const supplied = input.choices?.[input.cursor];
  if (input.auto && !input.forceHuman && supplied === undefined) {
    const choices = options.filter(o => o.id !== 'skip');
    const chosen = choices.sort((a, b) => (b.score || 0) - (a.score || 0))[0] || options.find(o => o.id === 'skip');
    input.choices ||= []; input.choices.push(chosen.id); input.cursor++;
    return chosen.value;
  }
  const id = input.choices?.[input.cursor++];
  if (id === undefined) throw new Choice(prompt, options.map(({ id, label, card }) => ({ id, label, card })), ctx.side);
  const choice = options.find(o => o.id === id);
  if (!choice) throw new Error('That choice is no longer legal.');
  return choice.value;
}
function emit(g, event, payload, input, sourceSide = null) {
  if (++input.events > 150) throw new Error('Effect chain exceeded its safe limit.');
  for (const side of sides) for (const source of [...field(g, side)]) {
    if (!alive(g, source) || suppressed(source)) continue;
    definition(source)[event]?.(context(g, side, source, input), payload, sourceSide);
  }
}
function remove(g, unit, cause, input, killer = null) {
  const loc = locate(g, unit); if (!loc) return false;
  if (unit.zone === 'artifacts' && ['spell', 'ability', 'combat', 'attachment'].includes(cause) && field(g, unit.side).some(u => u.card.name === 'Wind Keeper' && !suppressed(u))) { if (cause === 'attachment') unit.target = null; return false; }
  if (cause === 'spell' && (unit.traits?.spellImmune || (unit.zone === 'artifacts' && field(g, unit.side).some(u => u.card.name === 'Earth Knight' && !suppressed(u))) || (unit.zone === 'spells' && sides.some(s => g[s].spells.some(u => u?.card.name === 'Divine Elemental Convergence'))))) return false;
  if (cause === 'sacrifice' && unit.traits?.cannotSacrifice) throw new Error(`${unit.card.name} cannot be sacrificed.`);
  g[loc.side][loc.zone][loc.index] = null;
  const attachments = [...g[unit.side].artifacts, ...g[unit.side].spells].filter(a => a?.target === unit.uid);
  for (const a of attachments) {
    if (a.card.name === 'Vampiric Destiny') { a.flags.returnCard = clone(unit.card); a.flags.returnOwner = unit.owner; a.flags.returnTurn = g.turnNumber; a.target = null; }
    else remove(g, a, 'attachment', input);
  }
  if (!unit.card.token) g[unit.owner][hasStatus(unit, 'Zombified') ? 'void' : 'graveyard'].push(unit.card);
  note(g, `${unit.card.name} ${cause === 'sacrifice' ? 'sacrificed' : 'destroyed'}.`);
  if (!suppressed(unit)) definition(unit).onDeath?.(context(g, unit.side, unit, input), { cause, killer });
  emit(g, 'unitDied', { unit, cause, killer }, input, unit.side);
  if (unit.flags.enflamed) damage(g, active(g, other(unit.flags.enflamed.side)), unit.flags.enflamed.amount, 'spell', input, unit);
  if (unit.flags.dracoCurse) g[unit.flags.dracoCurse].flags.dracoDoubleNext = true;
  return true;
}
function damage(g, target, amount, kind, input, source = null) {
  if (!alive(g, target) || amount <= 0) return 0;
  recalc(g);
  if (hasStatus(target, 'Lightning chains') && target.currentAP === 0 && target.zone === 'creatures') {
    const controller = g[target.side].controllers.filter(Boolean).sort((a, b) => a.currentCH - b.currentCH)[0];
    if (controller) target = controller;
  }
  if ((target.traits.invulnerable && kind !== 'healthLoss') || (kind === 'spell' && target.traits.spellImmune) || (kind === 'combat' && target.traits.battleImmune)) return 0;
  if (target.zone === 'controllers' && kind === 'spell') {
    if (g[target.side].creatures.some(u => u?.card.name === 'Ice Protector' && !hasStatus(u, 'Silenced'))) return 0;
    if (g[target.side].creatures.some(u => u?.card.name === 'Guardians of Atlantis' && !hasStatus(u, 'Silenced'))) amount = Math.ceil(amount / 2);
  }
  if (kind === 'combat' && target.traits.waterGolem && source?.currentAP >= 6) return 0;
  if (kind === 'combat' && target.flags.zephyr && source?.currentAP > 6 && amount >= target.currentCH) { target.flags.zephyr = false; target.bonusAP -= 2; target.bonusCH -= 2; target.damage = Math.min(target.damage, Math.max(0, target.maxCH - 3)); if (byName.Zephyr) g[target.side].graveyard.push(clone(byName.Zephyr)); note(g, 'Zephyr intercepts the lethal attack.'); return 0; }
  if (target.zone === 'controllers' && target.card.name === 'Mermaid Empress') {
    const guard = g[target.side].creatures.find(u => u?.card.name === 'Royal Guard');
    if (guard) target = guard;
  }
  amount = Math.max(0, amount - (kind === 'healthLoss' ? 0 : target.traits.reduction || 0) - (kind === 'combat' ? target.traits.combatReduction || 0 : 0));
  if (hasStatus(target, 'Dark shield')) {
    const status = target.statuses['Dark shield'];
    if (status.hitTurn !== g.turnNumber) { status.hitTurn = g.turnNumber; amount = Math.min(amount, Math.max(0, target.currentCH - 1)); }
    else { remove(g, target, kind, input, source); return amount; }
  }
  target.damage += amount; target.flags.damagedTurn = g.turnNumber;
  g.lastEffect = { kind: 'damage', uid: target.uid, amount };
  recalc(g);
  if (target.currentCH <= 0) remove(g, target, kind, input, source);
  return amount;
}
function summonUnit(ctx, card, options = {}) {
  if (!card) return null;
  const { g, side, input } = ctx;
  const zone = options.controller ? 'controllers' : 'creatures';
  const index = options.index ?? g[side][zone].findIndex(u => !u);
  if (index < 0 || index >= g[side][zone].length || g[side][zone][index]) throw new Error(`No empty ${zone} slot.`);
  const u = makeUnit(g, side, card, zone); g[side][zone][index] = u;
  if (options.suppressRecruit) u.flags.suppressRecruit = true;
  recalc(g);
  if (options.haste) u.statuses.Haste = { trait: 'haste', end: g.turnNumber };
  if (options.zombie) u.statuses.Zombified = {};
  if (options.temporary) u.statuses.Ephemeral = { end: g.turnNumber, destroy: true };
  note(g, `${card.name} enters play.`);
  definition(u).onPlay?.(context(g, side, u, input));
  emit(g, 'unitPlayed', u, input, side); recalc(g);
  return u;
}
function context(g, side, source, input) {
  input.events ||= 0; input.cursor ||= 0;
  const ctx = { g, side, source, input, me: g[side], enemy: g[other(side)], opponent: other(side), card: source?.card,
    units: (s = side) => units(g, s), field: (s = side) => field(g, s), controller: (s = side) => active(g, s),
    has: (name, s = side) => field(g, s).some(u => u.card.name === name && !hasStatus(u, 'Silenced')),
    named: (name, s = side) => field(g, s).find(u => u.card.name === name),
    attached: (u = source) => [...g[u.side].artifacts, ...g[u.side].spells].filter(a => a?.target === u.uid),
    targetUnit: () => source?.target ? find(g, source.target) : null,
    choose: (prompt, values, label = v => v.card?.name || v.name, optional = false) => select(ctx, prompt, values.map((value, i) => ({ id: String(value.uid || i), label: label(value), card: value.card || (value.card_type ? value : undefined), value, score: (value.currentAP || value.ap || 0) + (value.currentCH || value.ch || 0) })), optional),
    target: (type = 'enemy creature', optional = false, filter = () => true) => {
      let candidates = type.includes('enemy') ? field(g, other(side)) : type.includes('ally') ? field(g, side) : [...field(g, side), ...field(g, other(side))];
      candidates = candidates.filter(u => (type.includes('creature') ? u.zone === 'creatures' : type.includes('controller') ? u.zone === 'controllers' : type.includes('artifact') ? u.zone === 'artifacts' : type.includes('spell') ? u.zone === 'spells' : ['creatures', 'controllers'].includes(u.zone)) && filter(u));
      candidates = candidates.filter(u => u.side === side || (!u.traits?.untargetable && !(source?.card?.card_type === 'spell' && (u.traits?.spellUntargetable || u.traits?.spellImmune)) && !(u.traits?.waterSafe && source?.card?.element !== 'water')));
      const chosen = input.targetOverride ? candidates.find(u => u.uid === input.targetOverride) : select(ctx, `Choose ${type}`, candidates.map(u => ({ id: u.uid, label: `${u.side === side ? 'Ally' : 'Enemy'}: ${u.card.name} (${u.currentAP} AP / ${u.currentCH} CH)`, card: u.card, value: u, score: u.side === side ? (u.damage || 0) + u.currentAP : u.currentAP + u.currentCH })), optional);
      if (input.targetOverride && !chosen && !optional) throw new Error('The required target is not available.');
      if (chosen?.side !== side && chosen && source?.card?.card_type === 'spell' && chosen.card.name === 'Volt-Howler') damage(g, active(g, side), 2, 'ability', input, chosen);
      return chosen;
    },
    status: (u, name, data = {}) => { if (!u) return; if (name === 'Frozen' && u.traits?.freezeImmune) return; if (name === 'Frozen' && ctx.has('Frost Wyrm')) data = { ...data, remaining: (data.remaining || 1) + 1 }; u.statuses[name] = { applied: g.turnNumber, ...data }; if (name === 'Frozen' && ctx.has('Enchanted Ice Crystal') && g[side].flags.freezeShard !== g.turnNumber) { g[side].flags.freezeShard = g.turnNumber; g[side].shards++; } recalc(g); },
    buff: (u, ap = 0, ch = 0, duration = 'permanent', name = 'Enchanted') => { if (!u) return; if (duration === 'permanent') { u.bonusAP += ap; u.bonusCH += ch; } else ctx.status(u, name, { ap, ch, ...(duration === 'end' ? { end: g.turnNumber } : { remaining: duration }) }); recalc(g); },
    heal: (u, amount) => { if (u && !hasStatus(u, 'No healing')) { u.damage = Math.max(0, u.damage - amount); recalc(g); } },
    damage: (u, amount, kind = source?.card?.card_type === 'spell' ? 'spell' : 'ability') => damage(g, u, amount, kind, input, source),
    destroy: (u, cause = source?.card?.card_type === 'spell' ? 'spell' : 'ability') => u && remove(g, u, cause, input, source),
    aoe: (amount, targets = g[other(side)].creatures.filter(Boolean)) => { let killed = 0; for (const u of [...targets]) { const exists = alive(g, u); ctx.damage(u, amount); if (exists && !alive(g, u)) killed++; } return killed; },
    draw: (count = 1, who = side) => { for (let i = 0; i < count; i++) { const card = g[who].deck.shift(); if (card) { g[who].hand.push(card); if (ctx.has('Umbra Reaver', other(who)) && g.phase !== 'draw') damage(g, active(g, who), 1, 'ability', input); } } },
    gain: (n, temporary = false) => { g[side].shards += n; if (temporary) g[side].temporaryShards += n; },
    pay: (n = 0, ch = 0) => { if (g[side].shards < n) throw new Error(`Requires ${n} shards.`); const controller = active(g, side); if (ch && (!controller || controller.currentCH <= ch)) throw new Error(`Requires more than ${ch} controller CH.`); g[side].shards -= n; if (ch) controller.damage += ch; },
    discard: (who = other(side), count = 1, predicate = () => true) => { for (let i = 0; i < count; i++) { const list = g[who].hand.filter(predicate); if (!list.length) break; const card = ctx.choose('Choose a card to discard', list); g[who].hand.splice(g[who].hand.indexOf(card), 1); g[who].graveyard.push(card); note(g, `${card.name} discarded.`); } },
    search: (names, sourceZones = ['deck', 'graveyard'], optional = true) => {
      const predicate = typeof names === 'function' ? names : c => names.includes(c.name);
      const options = sourceZones.flatMap(zone => g[side][zone].map((card, index) => ({ id: `${zone}:${index}`, label: `${card.name} (${zone})`, card, value: { card, zone, index } })).filter(o => predicate(o.card)));
      const selected = select(ctx, 'Choose a card', options, optional);
      if (!selected) return null;
      g[side][selected.zone].splice(selected.index, 1); g[side].hand.push(selected.card); return selected.card;
    },
    summon: (card, options = {}) => summonUnit(ctx, card, options),
    fromZone: (names, sourceZones = ['hand', 'deck'], options = {}) => { const card = ctx.search(names, sourceZones); if (card) { g[side].hand.splice(g[side].hand.indexOf(card), 1); return summonUnit(ctx, card, options); } return null; },
    token: (name, ap, ch, count = 1, traits = {}) => { for (let i = 0; i < count && g[side].creatures.some(u => !u); i++) { const u = summonUnit(ctx, { id: `token-${name}`, name, ap, ch, cost: 0, card_type: 'creature', element: source?.card.element || 'shadow', token: true, description: Object.keys(traits).join(', ') }); for (const trait of Object.keys(traits)) u.statuses[trait] = { trait }; } },
    playFree: (card, target = null) => { const previous = input.targetOverride; input.targetOverride = target?.uid; try { play(g, side, card, input, { free: true }); } finally { input.targetOverride = previous; } },
    attackNow: target => attackUnit(g, side, source, target, input),
    bounce: u => { const loc = u && locate(g, u); if (!loc) return; if (u.side !== side && ctx.has('Earth Defender', u.side)) return; g[loc.side][loc.zone][loc.index] = null; for (const a of ctx.attached(u)) remove(g, a, 'attachment', input); if (!u.card.token) { const card = { ...u.card, recalled: true }; if (card.name === 'Water Guardian') card.freeRecall = true; g[u.owner].hand.push(card); } g[side].flags.recalled = (g[side].flags.recalled || 0) + 1; if (ctx.has('Neptune') && u.side !== side) ctx.gain(1); for (const s of sides) { if (ctx.has('Spirit of the Wind', s)) g[s].shards++; if (ctx.has('Wind Orb', s) && u.card.element === 'wind' && u.side === s) ctx.draw(1, s); } note(g, `${u.card.name} returned to hand.`); },
    steal: (u, duration = null) => { if (!u || u.zone !== 'creatures') throw new Error('Choose a creature.'); const index = g[side].creatures.findIndex(c => !c); if (index < 0) throw new Error('You need an empty creature slot.'); const loc = locate(g, u); g[loc.side][loc.zone][loc.index] = null; u.side = side; g[side].creatures[index] = u; u.summonedTurn = g.turnNumber; if (duration) ctx.status(u, 'Stolen', { remaining: duration, destroy: true }); },
    banish: (u, turns = 2) => { const loc = u && locate(g, u); if (!loc) return; g[loc.side][loc.zone][loc.index] = null; for (const a of ctx.attached(u)) remove(g, a, 'attachment', input); g[u.owner].banished.push({ unit: u, remaining: turns, applied: g.turnNumber, double: ctx.has('Shadow Master') && ['Shadow Wraith', 'Dark Phantom', 'Night Terror'].includes(u.card.name) }); },
    flag: (name, value = true) => { g[side].flags[name] = value; },
    note: text => note(g, text), alive: u => alive(g, u), recalc: () => recalc(g),
    random: () => random(g), byName,
  };
  return ctx;
}
function price(g, side, card) {
  const ctx = context(g, side, null, { auto: true }); let cost = card.cost || 0;
  if (card.freeRecall || (card.recalled && g[side].flags.zombieTurn === g.turnNumber)) return 0;
    if (card.card_type === 'spell') {
    if (card.element === 'fire' && ctx.has('Draco')) cost--;
    if (card.element === 'cryo' && ctx.has('Enchanted Ice Crystal')) cost--;
    if (card.element === 'electric' && ctx.has('Lightning Stone')) cost--;
    if (card.element === 'water' && ctx.has('Crown of Neptune')) cost--;
    if (card.element === 'wind' && ctx.has('Wind Witch') && g[side].flags.windDiscount !== g.turnNumber) cost--;
    if (card.element === 'light' && ctx.has('Perfect Light Being')) return Math.max(1, cost - 1);
  }
  if (card.element === 'electric' && card.card_type === 'artifact' && ctx.has('Spark Knight')) cost--;
  if (card.name === 'Flame Wolf' && g[side].flags.wolfTurn === g.turnNumber) cost = 0;
  return Math.max(card.name === "Draco's Inferno" ? 1 : 0, cost);
}
function play(g, side, card, input, move = {}) {
  const source = { card, side, uid: 'casting' }; let ctx = context(g, side, source, input);
  const spec = definition(card);
  if (!spec) throw new Error('Missing card rules.');
  if (card.card_type === 'spell' && g[side].locks.spells > 0) throw new Error('Spells are locked this turn.');
  if (g[side].banned[card.id] > 0) throw new Error(`${card.name} is sealed.`);
  if (card.card_type === 'artifact' && g[side].locks.artifacts > 0) throw new Error('Artifacts are locked this turn.');
  spec.require?.(ctx);
  const cost = move.free ? 0 : price(g, side, card) + (move.fromGraveyard ? 1 : 0);
  ctx.pay(cost);
  const sourceZone = move.fromGraveyard ? 'graveyard' : 'hand';
  const index = g[side][sourceZone].indexOf(card); if (index < 0) throw new Error('Card is no longer available.');
  g[side][sourceZone].splice(index, 1);
  note(g, `${side === 'playerState' ? 'You' : 'Opponent'} played ${card.name} (${cost} shards).`);
  if (card.card_type === 'creature' || card.card_type === 'controller') {
    summonUnit(ctx, card, { index: move.slot, controller: card.card_type === 'controller', zombie: card.recalled && g[side].flags.zombieTurn === g.turnNumber });
  } else if (card.card_type === 'artifact' || spec.persistent) {
    const zone = card.card_type === 'artifact' ? 'artifacts' : 'spells';
    const index = g[side][zone].findIndex(u => !u); if (index < 0) throw new Error(`All ${zone} slots are occupied.`);
    let target = null;
    if (spec.equip && card.name !== "Draco's Slayer") target = ctx.target(spec.equip === true ? 'ally unit' : spec.equip);
    const unit = makeUnit(g, side, card, zone); unit.target = target?.uid;
    g[side][zone][index] = unit; ctx = context(g, side, unit, input);
    spec.onPlay?.(ctx);
  } else { spec.onPlay?.(ctx); g[side].graveyard.push(card); }
  if (card.card_type === 'spell') {
    g[side].flags.spellTurn = g.turnNumber; g[side].flags[`${card.element}SpellTurn`] = g.turnNumber;
    if (card.element === 'wind') g[side].flags.windDiscount = g.turnNumber;
    emit(g, 'spellPlayed', card, input, side);
  }
  recalc(g); g.lastEffect = { kind: card.card_type === 'spell' ? 'spell' : 'summon', text: card.name };
}
function attackUnit(g, side, source, target, input) {
  recalc(g); if (!source?.canAttack) throw new Error('This unit cannot attack now.');
  if (!target || target.side === side || !['creatures', 'controllers'].includes(target.zone)) throw new Error('Choose an enemy unit.');
  if (target.traits.untargetable || target.traits.invulnerable || target.traits.cannotBeAttacked) throw new Error('That target cannot be attacked.');
  const defendingCreatures = g[other(side)].creatures.filter(Boolean);
  const guardians = defendingCreatures.filter(u => (u.traits.guardian || u.traits.guardianController) && !u.traits.cannotDefend);
  const bypass = source.zone === 'creatures' && source.traits.stealth;
  if (!bypass) {
    if (guardians.length && !guardians.includes(target)) throw new Error('A shield creature (Guardian) must be attacked first.');
    if (target.zone === 'controllers' && defendingCreatures.length) throw new Error('Defeat all enemy creatures before attacking a controller. Only a creature with Stealth can bypass them.');
  }
  if (target.traits.waterSafe && source.card.element !== 'water') throw new Error('Water Safe protects this target from non-Water cards.');
  if (target.card.name === 'Dark Knight' && source.currentAP <= 3 && !hasStatus(target, 'Silenced')) throw new Error('Dark Knight cannot be attacked by units with 3 AP or less.');
  const ctx = context(g, side, source, input);
  const defending = context(g, other(side), target, input);
  if (g[other(side)].reaction?.name === 'Wind Mirage' && target.zone === 'controllers') {
    g[other(side)].reaction = null;
    if (g[other(side)].creatures.some(u => !u)) { const defender = defending.summon(byName['Wind Golem']); defending.status(defender, 'Defensive summon', { trait: 'cannotAttack' }); }
    source.attacksUsed++; note(g, 'Wind Mirage stops the attack.'); return;
  }
  if (g[other(side)].reaction?.name === 'Ink Cloud') {
    g[other(side)].reaction = null;
    const options = units(g, side);
    const priorAuto = input.auto;
    input.forceHuman = g.gameMode === 'multiplayer' || (other(side) === 'playerState' && priorAuto !== 'all'); input.auto = g.gameMode === 'multiplayer' ? false : priorAuto === 'all' ? 'all' : other(side) === 'opponentState';
    try { target = defending.choose('Redirect attack to an attacker-owned unit', options.filter(u => u.zone === 'creatures').length ? options.filter(u => u.zone === 'creatures') : options); }
    finally { input.forceHuman = false; input.auto = priorAuto; }
  }
  source.attacksUsed++;
  if (!suppressed(source)) definition(source).onAttack?.(ctx, target);
  for (const a of ctx.attached()) definition(a).onAttack?.(context(g, side, a, input), target, source);
  recalc(g);
  if (!alive(g, source)) return;
  let ap = source.currentAP;
  if (source.card.name === 'Shark' && target.flags.damagedTurn === g.turnNumber) ap += 3;
  if (source.card.name === 'Earth Serpent' && hasStatus(target, 'Paralyzed')) ap += 3;
  if (source.card.name === 'Shadow Knight' && !g[other(side)].creatures.some(Boolean)) ap += 2;
  if (source.card.name === 'Volt-Howler' && hasStatus(target, 'Lightning chains')) ap *= 2;
  if (source.traits.halfControllerDamage && target.zone === 'controllers') ap = Math.ceil(ap / 2);
  const recoil = target.currentAP; const wasCreature = target.zone === 'creatures';
  const dealt = damage(g, target, ap, 'combat', input, source);
  if (dealt && target.uid !== source.uid && !(source.traits.noRecoil || (source.traits.firstStrike && !alive(g, target)) || (source.card.name === 'Flame Samurai' && ap > recoil))) damage(g, source, recoil, 'combat', input, target);
  if (target.traits.reflect && dealt) damage(g, source, Math.ceil(dealt / 2), 'ability', input, target);
  if (ctx.attached(target).some(a => a.card.name === 'Earth Staff')) damage(g, source, 1, 'ability', input, target);
  if (!alive(g, target) && wasCreature) {
    if (!suppressed(source)) definition(source).onKill?.(ctx, target);
    if (hasStatus(source, 'Nature blade')) ctx.draw();
    if (hasStatus(source, 'Surreal')) { const card = ctx.search(c => c.element === 'electric' && c.card_type === 'artifact', ['hand']); if (card) play(g, side, card, input, { free: true }); }
  }
  if (dealt) {
    if (!suppressed(source)) definition(source).onDamage?.(ctx, target);
    for (const a of ctx.attached()) definition(a).onDamage?.(context(g, side, a, input), target, source);
  }
  note(g, `${source.card.name} attacks ${target.card.name} for ${dealt}.`);
  g.lastEffect = { kind: 'attack', text: `${source.card.name} → ${target.card.name}`, uid: target.uid, amount: dealt }; recalc(g);
}
function advance(g, side, input) {
  const ctx = context(g, side, null, input);
  if (g.phase === 'draw') { ctx.draw(); g.phase = 'energy'; }
  else if (g.phase === 'energy') { ctx.gain(2 + g[side].nextShards); g[side].nextShards = 0; g.phase = 'main'; }
  else if (g.phase === 'main') g.phase = 'combat';
  else {
    emit(g, 'turnEnd', side, input, side);
    for (const s of sides) for (const u of [...field(g, s)]) for (const [name, status] of Object.entries(u.statuses)) {
      if (!alive(g, u)) break;
      if (status.dot && u.side === side && status.applied < g.turnNumber) damage(g, u, status.dot, 'healthLoss', input);
      if (status.remaining && u.side === side && status.applied < g.turnNumber) status.remaining--;
      if (status.end === g.turnNumber || status.remaining === 0) {
        delete u.statuses[name];
        if (status.destroy) remove(g, u, 'expiry', input);
        if (status.explode) { const c = context(g, u.side, u, input); c.aoe(status.explode, [...units(g, side), ...units(g, other(side))].filter(v => v.zone === 'creatures' && v.uid !== u.uid)); }
      }
    }
    g[side].shards = Math.max(0, g[side].shards - g[side].temporaryShards); g[side].temporaryShards = 0;
    for (const key of Object.keys(g[side].locks)) g[side].locks[key] = Math.max(0, g[side].locks[key] - 1);
    for (const key of Object.keys(g[side].banned)) g[side].banned[key] = Math.max(0, g[side].banned[key] - 1);
    // End effects resolve before the hand limit. Replayed choices identify each copy.
    recalc(g);
    input.handLimit = true;
    while (g[side].hand.length > 7 && !outcome(g)) {
      const card = select(ctx, `Discard to 7 cards: choose ${g[side].hand.length - 7} more.`, g[side].hand.map(card => ({
        id: card.instanceId, label: `${card.name} (${card.cost} shards)`, card, value: card,
        score: card.cost || 0,
      })));
      g[side].hand.splice(g[side].hand.indexOf(card), 1);
      g[side].graveyard.push(card);
      note(g, `${side === 'playerState' ? 'You' : 'Opponent'} discarded ${card.name} (hand limit).`);
    }
    input.handLimit = false;
    g.turnNumber++; g.isMyTurn = !g.isMyTurn; g.phase = 'draw';
    const next = other(side); g[next].turns++;
    g[next].flags.recalled = 0;
    for (const u of field(g, next)) { u.attacksUsed = 0; u.used = {}; }
    if (g[next].flags.dracoDoubleNext) {
      const draco = g[next].creatures.find(u => u?.card.name === 'Draco');
      if (draco) context(g, next, draco, input).status(draco, 'Double attack', { end: g.turnNumber });
      delete g[next].flags.dracoDoubleNext;
    }
    for (const b of [...g[next].banished]) if (--b.remaining <= 0) {
      const index = g[next].creatures.findIndex(u => !u);
      if (index < 0) g[next].hand.push(b.unit.card);
      else { b.unit.side = next; b.unit.summonedTurn = g.turnNumber; b.unit.attacksUsed = 0; g[next].creatures[index] = b.unit; if (b.double) context(g, next, b.unit, input).buff(b.unit, b.unit.currentAP, 0, 'end', 'Void empowerment'); }
      g[next].banished.splice(g[next].banished.indexOf(b), 1);
    }
    recalc(g); emit(g, 'turnStart', next, input, next);
    note(g, `${next === 'playerState' ? 'Your' : 'Opponent’s'} turn ${g.turnNumber}.`);
  }
  recalc(g);
}
export function outcome(g) {
  const lose = side => !g[side].controllers.some(Boolean);
  return lose('playerState') && lose('opponentState') ? 'Draw' : lose('playerState') ? 'Defeat' : lose('opponentState') ? 'Victory' : null;
}
export function performMove(state, move, choices = [], auto = false) {
  if (outcome(state)) throw new Error('The duel is over.');
  const g = clone(state); delete g.pendingChoice;
  recalc(g);
  const side = g.isMyTurn ? 'playerState' : 'opponentState';
  const input = { choices, cursor: 0, auto, events: 0 };
  try {
    if (move.type === 'advance') advance(g, side, input);
    else if (move.type === 'attack') {
      if (g.phase !== 'combat') throw new Error('Attack during combat.');
      const source = find(g, move.source); if (source?.side !== side) throw new Error('Select your unit.');
      attackUnit(g, side, source, find(g, move.target), input);
    } else if (move.type === 'play') {
      if (g.phase !== 'main') throw new Error('Play cards during your main phase.');
      const card = g[side][move.fromGraveyard ? 'graveyard' : 'hand'][move.index];
      if (!card) throw new Error('Select a card from your hand.');
      if (move.fromGraveyard && !(card.element === 'shadow' && card.card_type === 'spell' && field(g, side).some(u => u.card.name === 'Shadow Master'))) throw new Error('Shadow Master is required to cast from discard.');
      play(g, side, card, input, move);
    } else if (move.type === 'ability') {
      if (g.phase !== 'main') throw new Error('Activate abilities during main phase.');
      const u = find(g, move.source); if (!u || u.side !== side) throw new Error('Select your unit.');
      if (['Silenced', 'Bound', 'Zombified'].some(name => hasStatus(u, name))) throw new Error('This unit cannot use abilities.');
      const ab = abilityList(u)[move.index || 0]; if (!ab) throw new Error('No activated ability.');
      if (u.used[move.index || 0]) throw new Error('This ability was already used this turn.');
      const ctx = context(g, side, u, input);
      const cost = Math.max(0, (ab.cost || 0) - (u.zone === 'controllers' && ctx.has('Cosmic Witch') ? 1 : 0));
      ctx.pay(cost, ab.ch || 0); ab.run(ctx); u.used[move.index || 0] = true;
      note(g, `${u.card.name}: ${ab.label}.`); g.lastEffect = { kind: 'spell', text: ab.label };
    } else throw new Error('Unknown move.');
    recalc(g);
    for (let pass = 0; pass < 12; pass++) {
      for (const s of sides) for (const u of g[s].spells.filter(Boolean)) if (u.card.name === 'Divine Elemental Convergence' && !g[s].creatures.some(v => v?.card.element === 'light')) remove(g, u, 'expiry', input);
      const dying = sides.flatMap(s => units(g, s)).filter(u => u.currentCH <= 0);
      if (!dying.length) break;
      for (const u of dying) remove(g, u, 'stat loss', input);
      recalc(g);
    }
    return g;
  } catch (error) {
    if (error instanceof Choice) return { ...state, pendingChoice: { move, auto, kind: input.handLimit ? 'handLimit' : 'effect', side: error.side, choices: input.choices.slice(0, input.cursor - 1), prompt: error.message, options: error.options } };
    throw error;
  }
}
export function resolveChoice(g, id) { const p = g.pendingChoice; if (!p) return g; return performMove(g, p.move, [...p.choices, id], p.auto); }
export function cancelChoice(g) { const next = { ...g }; delete next.pendingChoice; return next; }
export function abilityList(unit) { return unit?.flags?.shield ? [{ label: 'Sacrifice shield to heal controller', run(c) { const health = c.source.currentCH; c.destroy(c.source, 'sacrifice'); c.heal(c.controller(), health); } }] : definition(unit).active || []; }
export function cardCost(g, side, card) { return price(g, side, card); }
export function chooseAIAttack(state, side = 'opponentState') {
  const g = clone(state); recalc(g);
  return chooseCombatMove(g, side, move => performMove(g, move, [], 'all'));
}
export function newMatch(element, enemy, controllerName, enemyControllerName, seed = Date.now()) {
  const g = { serial: 0, seed: seed >>> 0, turnNumber: 1, isMyTurn: true, phase: 'draw', gameMode: 'ai', log: [] };
  for (const [i, side] of sides.entries()) {
    const el = i ? enemy : element;
    const pool = cards.filter(c => c.element === el && c.card_type !== 'controller');
    const creatures = pool.filter(c => c.card_type === 'creature');
    const spells = pool.filter(c => c.card_type === 'spell');
    const artifacts = pool.filter(c => c.card_type === 'artifact');
    const controllerCards = cards.filter(c => c.element === el && c.card_type === 'controller');
    const chosenName = i ? enemyControllerName : controllerName;
    const reserves = controllerCards.filter(c => c.name !== (chosenName || controllerCards[0].name));
    const deck = [
      ...Array.from({ length: 14 }, (_, n) => creatures[n % creatures.length]),
      ...Array.from({ length: 8 }, (_, n) => spells[n % spells.length]),
      ...Array.from({ length: 4 }, (_, n) => artifacts[n % artifacts.length]),
      ...reserves, byName['Elemental Convergence'], byName['Creature Recall'],
    ].map(clone);
    for (let n = deck.length - 1; n > 0; n--) { const j = Math.floor(random(g) * (n + 1)); [deck[n], deck[j]] = [deck[j], deck[n]]; }
    // Opening hands include each card type so the rules are easy to explore.
    const hand = ['creature', 'creature', 'spell', 'artifact', 'creature'].map(type => { const index = deck.findIndex(c => c.card_type === type); return deck.splice(index, 1)[0]; });
    g[side] = { shards: 10, controllers: [null, null, null], creatures: Array(5).fill(null), artifacts: Array(3).fill(null), spells: Array(3).fill(null), hand, deck, graveyard: [], void: [], banished: [], flags: {}, locks: {}, banned: {}, turns: 1, temporaryShards: 0, nextShards: 0 };
  }
  for (const [i, side] of sides.entries()) {
    const el = i ? enemy : element; const name = i ? enemyControllerName : controllerName;
    const card = cards.find(c => c.name === name && c.element === el && c.card_type === 'controller') || cards.find(c => c.element === el && c.card_type === 'controller');
    g[side].shards -= card.cost; summonUnit(context(g, side, null, { auto: true, events: 0 }), card, { controller: true });
  }
  recalc(g); return g;
}
export async function runAITurn(state, { delayMs = 350, difficulty = 'medium', onStep = () => {}, cancelled = () => false, controlledSide = 'opponentState', simulation = false } = {}) {
  let g = state; let moves = 0;
  const automatic = simulation ? 'all' : true;
  const step = async move => { if (cancelled()) return; g = performMove(g, move, [], automatic); onStep(clone(g)); if (delayMs) await new Promise(r => setTimeout(r, delayMs)); };
  while ((g.isMyTurn ? 'playerState' : 'opponentState') === controlledSide && !g.pendingChoice && !outcome(g) && !cancelled() && moves++ < 70) {
    const side = controlledSide; let acted = false;
    if (g.phase === 'main') {
      const options = [...units(g, side).flatMap(u => abilityList(u).map((_, index) => ({ type: 'ability', source: u.uid, index }))), ...g[side].hand.map((_, index) => ({ type: 'play', index }))];
      if (difficulty === 'easy') options.reverse();
      for (const move of options) {
        try {
          const next = performMove(g, move, [], automatic);
          // Do not spend every turn's income on an empty optional search/summon.
          if (move.type === 'ability' && !next.pendingChoice) {
            const beforeEffect = clone(g), afterEffect = clone(next);
            for (const value of [beforeEffect, afterEffect]) {
              delete value.log; delete value.lastEffect;
              for (const owner of sides) for (const unit of field(value, owner)) delete unit.used;
            }
            afterEffect[side].shards = Math.max(beforeEffect[side].shards, afterEffect[side].shards);
            if (JSON.stringify(beforeEffect) === JSON.stringify(afterEffect)) continue;
          }
          if (JSON.stringify(next) !== JSON.stringify(g)) { await step(move); acted = true; break; }
        } catch { /* Try the next legal action. */ }
      }
    } else if (g.phase === 'combat') {
      const move = chooseAIAttack(g, side);
      if (move) { await step(move); acted = true; }
    }
    if (!acted) await step({ type: 'advance' });
  }
  return { nextState: g };
}
