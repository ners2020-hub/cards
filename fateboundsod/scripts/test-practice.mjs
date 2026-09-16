import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const moduleUrl = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const engineUrl = moduleUrl(await readFile(new URL('../src/components/tcg/gameEngine.jsx', import.meta.url), 'utf8'));
const cardsUrl = moduleUrl(await readFile(new URL('../src/practice/cardDatabase.js', import.meta.url), 'utf8'));
const adapterSource = (await readFile(new URL('../src/practice/practiceEngine.js', import.meta.url), 'utf8')).replace('../components/tcg/gameEngine.jsx', engineUrl).replace('./cardDatabase.js', cardsUrl);
const { newMatch, summon, attack, outcome, elements, engine } = await import(moduleUrl(adapterSource));
const aiSource = (await readFile(new URL('../src/components/tcg/aiEngine.js', import.meta.url), 'utf8')).replace('@/components/tcg/gameEngine', engineUrl);
const { runAITurn } = await import(moduleUrl(aiSource));
for (const element of elements) {
  const gs = newMatch(element, 'cryo');
  assert.equal(gs.playerState.hand.length, 5);
  assert.equal(gs.playerState.deck.length, 25);
  assert.equal(gs.playerState.controllers.filter(Boolean).length, 1);
  assert.throws(() => summon(gs, gs.playerState.hand[0], 0), /main phase/);
}
let gs = newMatch('fire', 'cryo');
gs = engine.endPhase(gs);
assert.equal(gs.playerState.hand.length, 6);
gs = engine.endPhase(gs);
const card = gs.playerState.hand.find(c => c.cost <= gs.playerState.shards);
assert.ok(card);
const before = gs.playerState.shards;
gs = summon(gs, card, 0);
assert.equal(gs.playerState.shards, before - card.cost);
assert.equal(gs.playerState.hand.length, 5);
assert.throws(() => summon(gs, gs.playerState.hand[0], 0), /empty/);
gs = engine.endPhase(gs);
assert.throws(() => attack(gs, { type: 'creature', index: 0 }, -1), /turn 3/);
let completed = 0;
for (let match = 0; match < 4; match++) {
  gs = newMatch(elements[match], elements[match + 1]);
  for (let turn = 0; turn < 150 && !outcome(gs); turn++) {
    // Exercise the real AI for both seats, translating back after each turn.
    const view = { ...gs, playerState: gs.opponentState, opponentState: gs.playerState, isMyTurn: false };
    const { nextState } = await runAITurn(view, { delayMs: 0, difficulty: 'hard' });
    gs = { ...nextState };
    assert.ok(gs.playerState.shards >= 0 && gs.opponentState.shards >= 0);
    assert.equal(gs.playerState.creatures.length, 5);
  }
  assert.ok(outcome(gs), 'AI match must finish within 150 turns');
  completed++;
}
console.log(`Passed: 9 faction decks, draw/energy/summon validation, attack turn lock, and ${completed} complete AI matches.`);
