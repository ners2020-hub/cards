import assert from 'node:assert/strict';
import {startSolo,replaySolo} from '../src/practice/soloRewards.js';
import {cards,performMove,resolveChoice,runAITurn,outcome,chooseAIAttack} from '../src/practice/rulesEngine.js';
for(const mine of [...['fire','water','cryo'].map(element=>({element,controller:cards.find(c=>c.element===element&&c.card_type==='controller').name})),{element:'blood',controller:'Veyra, the Bloodmother'},{element:'shadow',controller:'Mordrath, Keeper of Graves'}]) {
 const config={mine,enemy:{element:'fire',controller:'Flame Emperor'},difficulty:'medium'};
 let g=startSolo(config,42),actions=[];
 while(!outcome(g)&&actions.length<1500){
  let move={type:'advance'};
  if(g.pendingChoice)move={type:'choice',id:g.pendingChoice.options[0].id};
  else if(g.phase==='main'){const i=g.playerState.hand.findIndex(c=>c.card_type==='creature'&&c.cost<=g.playerState.shards);if(i>=0&&g.playerState.creatures.some(u=>!u))move={type:'play',index:i};}
  else if(g.phase==='combat')move=chooseAIAttack(g,'playerState')||move;
  g=move.type==='choice'?resolveChoice(g,move.id):performMove(g,move);actions.push(move);
  if(!g.isMyTurn&&!g.pendingChoice&&!outcome(g))g=(await runAITurn(g,{delayMs:0,difficulty:config.difficulty})).nextState;
 }
 assert.ok(outcome(g));const checked=await replaySolo(config,42,actions);assert.equal(checked.result,outcome(g));
 await assert.rejects(replaySolo(config,42,actions.concat({type:'advance'})));
 await assert.rejects(replaySolo(config,42,[{type:'play',index:0,free:true}]));
 await assert.rejects(replaySolo(config,42,[{type:'advance'}]));
 console.log('PASS verified solo',mine.controller,actions.length,checked.result);
}
console.log('Solo replay rejects forged actions, unfinished games and extra actions.');
const config={mine:{element:'fire',controller:'Flame Emperor'},enemy:{element:'fire',controller:'Flame Emperor'},difficulty:'hard'};
let g=startSolo(config,93),actions=[];
while(!outcome(g)&&actions.length<500){const action=g.pendingChoice?{type:'choice',id:g.pendingChoice.options[0].id}:{type:'advance'};g=g.pendingChoice?resolveChoice(g,action.id):performMove(g,action);actions.push(action);if(!g.isMyTurn&&!g.pendingChoice&&!outcome(g))g=(await runAITurn(g,{delayMs:0,difficulty:'hard'})).nextState;}
assert.equal(outcome(g),'Defeat');assert.equal((await replaySolo(config,93,actions)).result,'Defeat');console.log('PASS completed solo defeat verifies for play quests');
