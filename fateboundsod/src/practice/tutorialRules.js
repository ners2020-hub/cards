import { newMatch, performMove, resolveChoice, outcome } from './rulesEngine.js';
import { byName } from './catalog.js';
export const tutorialLessons = [
 { title:'Draw your card', text:'Win by defeating every enemy Controller. Your Controller is your leader: protect its health. Each turn starts with Draw, then Energy, Main, and Combat. Click Draw card.', action:'advance', phase:'draw' },
 { title:'Gain shards', text:'Shards pay for cards and abilities. Gain 2 in each Energy Phase; unused shards carry over. Click Gain 2 shards. These practice scenes use preset resources.', action:'advance', phase:'energy' },
 { title:'Summon a creature', text:'In Main Phase, select Fire Knight from your hand, then the highlighted empty slot. Pay its shard cost. Most creatures must wait to attack; Haste skips that wait, but attacks still unlock only on turn 3.', action:'play', card:'Fire Knight', phase:'main' },
 { title:'Equip an artifact', text:'Play Spark Knight Blade, then choose your Fire Knight. Artifacts stay on the field: this blade gives +2 attack and prevents counter-damage when attacking.', action:'play', card:'Spark Knight Blade', ally:true, phase:'main' },
 { title:'Cast a spell', text:'Play Burning Blast, then choose the enemy Fire Knight. This spell costs 2 shards and deals 3 damage. Read each card: some spells have requirements or remain on the field.', action:'play', card:'Burning Blast', enemy:true, phase:'main' },
 { title:'Use a Controller ability', text:'Activate Flame Insight on Flame Emperor. It costs 2 shards to draw one card, once per turn. Other abilities may need a target or health payment.', action:'ability', phase:'main' },
 { title:'Attack the Guardian first', text:'This scene jumps to turn 3, when attacks are allowed. Select your Flame Dragon, then the enemy Flame Guardian. Shield creatures must be attacked before other creatures or Controllers. Combat normally deals damage in both directions.', action:'attack', guardian:true, phase:'combat' },
 { title:'Finish the duel', text:'With no defending creatures left, select Flame Dragon and attack the wounded enemy Controller. Any enemy creature normally protects its Controllers; only attacking creatures with Stealth can bypass this order. At End Phase, discard down to 7 cards.', action:'attack', finish:true, phase:'combat' },
];
function unit(g,side,name,zone='creatures') {
 const card=structuredClone(byName[name]);
 const u={uid:`u${++g.serial}`,side,owner:side,zone,card,baseElement:card.element,damage:0,bonusAP:0,bonusCH:0,statuses:{},flags:{},used:{},summonedTurn:1,attacksUsed:0,currentAP:card.ap||0,currentCH:card.ch||0,maxCH:card.ch||0};
 g[side][zone][0]=u;return u;
}
export function tutorialScene(index) {
 const lesson=tutorialLessons[index];if(!lesson)throw new Error('Unknown lesson.');
 const g=newMatch('fire','fire','Flame Emperor','Flame Emperor',1042);
 for(const side of ['playerState','opponentState']){g[side].hand=[];g[side].creatures.fill(null);g[side].shards=12;}
 g.turnNumber=3;g.phase=lesson.phase;g.log=['Guided practice scene.'];
 if(lesson.card)g.playerState.hand=[structuredClone(byName[lesson.card])];
 if(lesson.ally)unit(g,'playerState','Fire Knight');
 if(lesson.enemy)unit(g,'opponentState','Fire Knight');
 if(lesson.action==='attack')unit(g,'playerState','Flame Dragon');
 if(lesson.guardian)unit(g,'opponentState','Flame Guardian');
 if(lesson.finish){g.opponentState.controllers[0].damage=8;g.opponentState.controllers[0].currentCH=4;}
 return g;
}
export function tutorialAction(index,g) {
 const lesson=tutorialLessons[index];if(!lesson)throw new Error('Unknown lesson.');
 if(g.pendingChoice){
  const target=(lesson.ally?g.playerState:g.opponentState).creatures[0];
  if(!g.pendingChoice.options.some(o=>o.id===target?.uid))throw new Error('Unexpected tutorial choice.');
  return {type:'choice',id:target.uid};
 }
 if(lesson.action==='play')return {type:'play',index:0,...(lesson.card==='Fire Knight'?{slot:0}:{})};
 if(lesson.action==='ability')return {type:'ability',source:g.playerState.controllers[0].uid,index:0};
 if(lesson.action==='attack')return {type:'attack',source:g.playerState.creatures[0].uid,target:(lesson.finish?g.opponentState.controllers:g.opponentState.creatures)[0].uid};
 return {type:'advance'};
}
export function tutorialMove(index,g,action) {
 const expected=tutorialAction(index,g);
 if(!action||Object.keys(action).length!==Object.keys(expected).length||Object.keys(expected).some(k=>action[k]!==expected[k]))throw new Error('Follow the highlighted action for this lesson.');
 return action.type==='choice'?resolveChoice(g,action.id):performMove(g,action);
}
export function verifyTutorial(lessons) {
 if(!Array.isArray(lessons)||lessons.length!==tutorialLessons.length)throw new Error('Complete every lesson first.');
 for(let i=0;i<lessons.length;i++){
  const actions=lessons[i];if(!Array.isArray(actions)||actions.length<1||actions.length>3)throw new Error('Invalid lesson.');
  let g=tutorialScene(i),done=false;
  for(const action of actions){if(done)throw new Error('Extra actions.');g=tutorialMove(i,g,action);done=!g.pendingChoice;}
  if(!done||(i===lessons.length-1&&outcome(g)!=='Victory'))throw new Error('Lesson incomplete.');
 }
 return true;
}
