// A conservative, public-board-only combat evaluator. Simulation never mutates the match.
const opponent = side => side === 'playerState' ? 'opponentState' : 'playerState';
const units = state => [...state.controllers, ...state.creatures].filter(Boolean);
const byUid = (g, side, uid) => units(g[side]).find(u => u.uid === uid);
function material(state) {
  return state.creatures.filter(Boolean).reduce((sum, u) => sum + 3 + u.currentAP * 1.5 + u.currentCH * .7, 0)
    + state.controllers.filter(Boolean).reduce((sum, u) => sum + 35 + u.currentCH * 4, 0);
}
function visibleThreat(g, side) {
  // This estimates the next turn from visible cards, without consulting the enemy hand.
  const threats = units(g[opponent(side)]).filter(u =>
    !u.traits?.cannotAttack && !['Frozen', 'Paralyzed', 'Bound', 'Zombified'].some(s => u.statuses?.[s])
  ).map(u => u.currentAP * (u.attackLimit || 1));
  const protectedByCreatures = g[side].creatures.some(Boolean);
  const stealthThreat = g[opponent(side)].creatures.filter(u => u?.traits?.stealth && !u.traits.cannotAttack && !['Frozen', 'Paralyzed', 'Bound', 'Zombified'].some(s => u.statuses?.[s])).reduce((n, u) => n + u.currentAP * (u.attackLimit || 1), 0);
  return protectedByCreatures ? Math.max(stealthThreat, 0, ...threats) : threats.reduce((a, b) => a + b, 0);
}
export function scoreCombatMove(before, after, side, move) {
  const enemy = opponent(side);
  if (!after[side].controllers.some(Boolean)) return -Infinity;
  if (!after[enemy].controllers.some(Boolean)) return 100000;
  const attacker = byUid(before, side, move.source);
  const survivor = byUid(after, side, move.source);
  if (!attacker || after.pendingChoice) return -Infinity;
  let score = material(after[side]) - material(before[side])
    + material(before[enemy]) - material(after[enemy]);
  if (attacker.zone === 'controllers') {
    // Never sacrifice a controller for a non-winning attack, even with backups alive.
    if (!survivor) return -Infinity;
    const healthSpent = Math.max(0, attacker.currentCH - survivor.currentCH);
    const target = byUid(before, enemy, move.target);
    const targetAfter = byUid(after, enemy, move.target);
    const damageDealt = target ? target.currentCH - (targetAfter?.currentCH || 0) : 0;
    if (healthSpent > 0) {
      const reserve = Math.max(3, Math.ceil(survivor.maxCH / 2));
      if (survivor.currentCH < reserve || survivor.currentCH <= visibleThreat(after, side)) return -Infinity;
      // Chipping for one damage while taking equal or greater recoil is not worthwhile.
      if (targetAfter && damageDealt <= healthSpent) return -Infinity;
      score -= healthSpent * 3;
    }
    score -= .25; // Prefer an equally productive creature attack before risking a controller.
  }
  return score;
}
export function chooseCombatMove(g, side, simulate) {
  let best = null;
  for (const source of units(g[side]).filter(u => u.canAttack)) {
    for (const target of units(g[opponent(side)])) {
      const move = { type: 'attack', source: source.uid, target: target.uid };
      try {
        const after = simulate(move);
        const score = scoreCombatMove(g, after, side, move);
        if (score > .1 && (!best || score > best.score)) best = { move, score };
      } catch { /* Blocked targets and effects without legal choices are not candidates. */ }
    }
  }
  return best?.move || null;
}
