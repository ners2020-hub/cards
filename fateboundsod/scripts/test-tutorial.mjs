import assert from 'node:assert/strict';
import {tutorialScene,tutorialAction,tutorialMove,tutorialLessons,verifyTutorial} from '../src/practice/tutorialRules.js';
const records=[];
for(let i=0;i<tutorialLessons.length;i++){
 let game=tutorialScene(i),actions=[];
 assert.throws(()=>tutorialMove(i,game,{type:'advance',free:true}));
 do{const action=tutorialAction(i,game);actions.push(action);game=tutorialMove(i,game,action);}while(game.pendingChoice);
 records.push(actions);
 if(i===0)assert.equal(game.playerState.hand.length,1);
 if(i===1)assert.equal(game.playerState.shards,14);
 if(i===2)assert.equal(game.playerState.creatures[0].card.name,'Fire Knight');
 if(i===3){assert.equal(game.playerState.artifacts[0].card.name,'Spark Knight Blade');assert.equal(game.playerState.creatures[0].currentAP,5);}
 if(i===4)assert.equal(game.opponentState.creatures[0].currentCH,1);
 if(i===5){assert.equal(game.playerState.hand.length,1);assert.equal(game.playerState.shards,10);}
}
assert.equal(verifyTutorial(records),true);
assert.throws(()=>verifyTutorial(records.slice(0,7)));
const extra=structuredClone(records);extra[0].push({type:'advance'});assert.throws(()=>verifyTutorial(extra));
const forged=structuredClone(records);forged[3][1].id='u9999';assert.throws(()=>verifyTutorial(forged));
assert.throws(()=>verifyTutorial(null));
console.log('PASS all eight real-engine lessons, card effects, shard costs, full completion replay, wrong targets and forged/skipped/extra actions rejected.');
