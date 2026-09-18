import assert from 'node:assert/strict';
import {newMatch,performMove,resolveChoice,cards} from '../src/practice/rulesEngine.js';
import {applyAction,playerView,BALANCE_VERSION} from '../src/practice/multiplayer.js';
for(const side of ['playerState','opponentState']){
 const g=newMatch('fire','fire','Flame Emperor','Flame Emperor',44);g.balanceVersion=BALANCE_VERSION;g.isMyTurn=side==='playerState';g.phase='energy';g[side].nextShards=3;
 const before=g[side].shards,n=applyAction(g,side,{type:'advance'});assert.equal(n[side].shards,before+5);assert.equal(n[side].nextShards,0);
 g.phase='combat';g[side].hand=Array.from({length:10},(_,i)=>({...cards.find(c=>c.name==='Fire Knight'),instanceId:`test${i}`}));
 const original=JSON.stringify(g);let p=applyAction(g,side,{type:'advance'});assert.equal(JSON.stringify(g),original);assert.equal(p.pendingChoice.options.length,10);assert.equal(p.turnNumber,g.turnNumber);
 const other=side==='playerState'?'opponentState':'playerState';assert.equal(playerView(p,other).pendingChoice,undefined);assert.equal(playerView(p,other).opponentState.hand.length,0);
 assert.throws(()=>applyAction(p,other,{type:'choice',id:'test0'}));assert.throws(()=>applyAction(p,side,{type:'advance'}));assert.throws(()=>applyAction(p,side,{type:'choice',id:'skip'}));
 for(let i=0;i<3;i++){p=applyAction(p,side,{type:'choice',id:`test${i}`});if(i<2){assert.ok(p.pendingChoice);assert.ok(!p.pendingChoice.options.some(o=>o.id===`test${i}`));}}
 assert.equal(p[side].hand.length,7);assert.equal(p[side].graveyard.filter(c=>c.instanceId?.startsWith('test')).length,3);assert.equal(p.turnNumber,g.turnNumber+1);assert.equal(p.pendingChoice,undefined);
 g[side].hand=g[side].hand.slice(0,7);assert.equal(performMove(g,{type:'advance'}).pendingChoice,undefined);
 g[side].hand.push({...g[side].hand[0],instanceId:'extra'});const ai=performMove(g,{type:'advance'},[],true);assert.equal(ai[side].hand.length,7);assert.equal(ai.pendingChoice,undefined);
 console.log('PASS income, bonus income, discard copies, seven-card boundary, forced choice, private view and AI:',side);
}
