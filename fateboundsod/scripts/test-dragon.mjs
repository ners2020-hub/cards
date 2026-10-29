import assert from 'node:assert/strict';
import { cards, elements, controllersForDeck } from '../src/practice/catalog.js';
import { dragonDeck, dragonController } from '../src/practice/dragonDeck.js';
import { newMatch, performMove, resolveChoice } from '../src/practice/rulesEngine.js';
import { validateDeck, startMatch } from '../src/practice/multiplayer.js';
import { validateSolo, startSolo } from '../src/practice/soloRewards.js';
assert.equal(dragonDeck.length,30);
const contents=dragonDeck.map(name=>cards.find(c=>c.name===name));
assert.ok(contents.every(Boolean));
assert.ok(elements.every(el=>contents.some(c=>c.element===el)));
assert.equal(contents.filter(c=>c.card_type==='creature').length,14);
const deck={element:'dragon',controller:dragonController};
assert.deepEqual(validateDeck(deck),deck);
assert.throws(()=>validateDeck({...deck,controller:'Draco Alec'}));
assert.throws(()=>validateDeck({element:'light',controller:dragonController}));
assert.equal(controllersForDeck('dragon').length,1);
for(let seed=1;seed<=30;seed++){
 const g=newMatch('dragon','dragon',dragonController,dragonController,seed);
 for(const side of ['playerState','opponentState']){
  assert.equal(g[side].controllers.filter(Boolean).length,1);
  assert.equal(g[side].controllers[0].card.name,dragonController);
  assert.equal(g[side].deck.length+g[side].hand.length,30);
  assert.ok(g[side].hand.every(Boolean));
  assert.equal(g[side].shards,5);
 }
 assert.deepEqual(startMatch(deck,deck,seed).playerState,g.playerState);
}
const config=validateSolo({mine:deck,enemy:{element:'fire',controller:'Draco Alec'},difficulty:'medium'});
let g=startSolo(config,42);g.phase='main';g.playerState.shards=30;
g.playerState.hand=[structuredClone(cards.find(c=>c.name==='Flame Dragon'))];
g=performMove(g,{type:'play',index:0,slot:0},[],true);
const king=g.playerState.controllers[0],before=g.playerState.creatures[0].currentAP,shards=g.playerState.shards;
g=performMove(g,{type:'ability',source:king.uid,index:0});
assert.ok(g.pendingChoice);assert.equal(g.pendingChoice.options.length,1);
g=resolveChoice(g,g.pendingChoice.options[0].id);
assert.equal(g.playerState.creatures[0].currentAP,before+2);
assert.equal(g.playerState.shards,shards-2);
assert.throws(()=>performMove(g,{type:'ability',source:king.uid,index:0}));
g=performMove(g,{type:'advance'},[],true);
g=performMove(g,{type:'advance'},[],true);
assert.equal(g.playerState.creatures[0].currentAP,before);
console.log('PASS 30-card nine-element Dragon deck, deterministic starts, multiplayer/solo validation, Royal Command cost/target/limit/expiry.');
