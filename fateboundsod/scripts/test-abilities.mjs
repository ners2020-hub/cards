import assert from 'node:assert/strict';
import { cards, newMatch, performMove, resolveChoice, cancelChoice, outcome, runAITurn, abilityList, elements, chooseAIAttack } from '../src/practice/rulesEngine.js';
import { definitions } from '../src/practice/cardAbilities.js';
const byName = Object.fromEntries(cards.map(c => [c.name,c]));
const P='playerState', E='opponentState';
let passed=0;
function test(name, run) { try { run(); passed++; console.log('PASS', name); } catch(e) { console.error('FAIL', name, e.stack); process.exitCode=1; } }
function fixture(p='Flame Emperor', e='Flame Emperor') {
 const g=newMatch(byName[p].element,byName[e].element,p,e,12);
 for(const side of [P,E]) { g[side].creatures.fill(null);g[side].artifacts.fill(null);g[side].spells.fill(null);g[side].hand=[];g[side].graveyard=[];g[side].shards=100; }
 g.turnNumber=5;g.phase='main';g.log=[];return g;
}
function put(g, side, name, zone='creatures', index=null) { const card=structuredClone(byName[name]);const u={uid:`u${++g.serial}`,side,owner:side,zone,card,baseElement:card.element,damage:0,bonusAP:0,bonusCH:0,statuses:{},flags:{},used:{},summonedTurn:1,attacksUsed:0,currentAP:card.ap||0,currentCH:card.ch||0,maxCH:card.ch||0};g[side][zone][index??g[side][zone].findIndex(u=>!u)]=u;return u; }
function cast(g,name,auto=true){g[P].hand.push(structuredClone(byName[name]));return performMove(g,{type:'play',index:g[P].hand.length-1},[],auto);}
function attack(g,a,t){g.phase='combat';return performMove(g,{type:'attack',source:a.uid,target:t.uid},[],true);}
function tick(g){return performMove(g,{type:'advance'},[],true);}

test('208 unique IDs and explicit definitions',()=>{assert.equal(cards.length,208);assert.equal(new Set(cards.map(c=>c.id)).size,208);for(const c of cards)assert.ok(Object.hasOwn(definitions,c.name),c.name);assert.equal(byName['Cryo Mage'].id,'CRTE_CYO_0008');assert.equal(byName['Ice Protector'].id,'CRTE_CYO_0006');});
test('all 29 controller starts resolve',()=>{for(const c of cards.filter(c=>c.card_type==='controller')) {const g=newMatch(c.element,'fire',c.name,'Flame Emperor',42);assert.equal(g[P].controllers[0].card.name,c.name);assert.ok(g[P].hand.length>=5);assert.ok(g[P].shards>=0);}});
test('opening hands contain creatures spells artifacts',()=>{for(const el of elements){const g=newMatch(el,'fire',null,null,21);for(const type of ['creature','spell','artifact'])assert.ok(g[P].hand.some(c=>c.card_type===type));}});
test('target choice is transactional and cancellation refunds everything',()=>{let g=fixture();const u=put(g,E,'Fire Knight');g[P].hand=[byName['Burning Blast']];const before=structuredClone(g);g=performMove(g,{type:'play',index:0});assert.ok(g.pendingChoice);assert.deepEqual(cancelChoice(g),before);g=resolveChoice(g,u.uid);assert.equal(g[P].shards,100-byName['Burning Blast'].cost);assert.equal(g[E].creatures[0].currentCH,1);assert.equal(g[P].hand.length,0);assert.equal(g[P].graveyard.at(-1).name,'Burning Blast');});
test('invalid play cannot spend shards or remove cards',()=>{let g=fixture();g[P].hand=[byName['Burning Blast']];g[P].shards=0;const before=JSON.stringify(g);assert.throws(()=>performMove(g,{type:'play',index:0}));assert.equal(JSON.stringify(g),before);});
test('equipment costs apply, buffs persist, and attachment goes to discard on death',()=>{let g=fixture();put(g,P,'Fire Knight');g=cast(g,'Spark Knight Blade');assert.equal(g[P].creatures[0].currentAP,5);assert.equal(g[P].artifacts.filter(Boolean).length,1);const target=put(g,E,'Flame Dragon');g=attack(g,g[P].creatures[0],target);assert.equal(g[P].creatures[0].currentCH,4);g.phase='main';g.isMyTurn=false;g[E].hand=[byName['Enflamed']];g=performMove(g,{type:'play',index:0},[],true);assert.equal(g[P].creatures[0],null);assert.equal(g[P].artifacts[0],null);assert.ok(g[P].graveyard.some(c=>c.name==='Spark Knight Blade'));});
test('allied aura only affects matching creatures',()=>{let g=fixture('Draco Alec');put(g,P,'Fire Knight');put(g,P,'Frozen Knight');g=tick(g);assert.equal(g[P].creatures[0].currentAP,4);assert.equal(g[P].creatures[1].currentAP,byName['Frozen Knight'].ap);});
test('Freeze prevents attacks and expires after affected owner turn',()=>{let g=fixture();put(g,E,'Fire Knight');g=cast(g,'Blizzard');assert.ok(g[E].creatures[0].statuses.Frozen);g=tick(g);g=tick(g);while(g.phase!=='combat')g=tick(g);assert.equal(g[E].creatures[0].canAttack,false);g=tick(g);assert.equal(g[E].creatures[0].statuses.Frozen,undefined);});
test('DOT damages each affected turn',()=>{let g=fixture();put(g,E,'Flame Guardian');g=cast(g,'Vine Coffin');g=tick(g);g=tick(g);while(g.phase!=='combat')g=tick(g);const before=g[E].creatures[0].currentCH;g=tick(g);assert.equal(g[E].creatures[0].currentCH,before-2);});
test('temporary AP and doomed creature expire at end phase',()=>{let g=fixture();put(g,P,'Fire Knight');g=cast(g,'Blood Magic');assert.equal(g[P].creatures[0].currentAP,6);g=tick(g);g=tick(g);assert.equal(g[P].creatures[0],null);});
test('healing on death resolves',()=>{let g=fixture();g[P].controllers[0].damage=5;put(g,P,'Redeemed Knight');g=cast(g,'Blood Ritual');assert.equal(g[P].controllers[0].currentCH,10);});
test('Guardian blocks controller target',()=>{let g=fixture();const a=put(g,P,'Flame Dragon');put(g,E,'Frozen Golem');g.phase='combat';assert.throws(()=>performMove(g,{type:'attack',source:a.uid,target:g[E].controllers[0].uid}),/Guardian/);});
test('haste ignores sickness but respects turn lock',()=>{let g=fixture();g=cast(g,'Fire Knight');g.phase='combat';g=performMove(g,{type:'attack',source:g[P].creatures[0].uid,target:g[E].controllers[0].uid},[],true);assert.ok(g[E].controllers[0].damage>0);g=fixture();g.turnNumber=1;g=cast(g,'Fire Knight');g.phase='combat';assert.throws(()=>performMove(g,{type:'attack',source:g[P].creatures[0].uid,target:g[E].controllers[0].uid}));});
test('activated ability once-per-turn and CH/shard costs',()=>{let g=fixture('RenLarKu');const uid=g[P].controllers[0].uid;g=performMove(g,{type:'ability',source:uid,index:0},[],true);assert.equal(g[P].controllers[0].currentCH,11);assert.equal(g[P].hand.length,1);assert.throws(()=>performMove(g,{type:'ability',source:uid,index:0}),/already used/);});
test('persistent enemy AP penalty removes when source dies',()=>{let g=fixture();put(g,E,'Fire Knight');g=cast(g,'Binding Chains of Lightning');assert.ok(g[E].creatures[0].statuses.Paralyzed);g=cast(g,'Spell Release');assert.equal(g[P].spells.filter(Boolean).length,0);assert.equal(g[E].creatures[0].statuses.Paralyzed,undefined);});
test('control transfer preserves original owner on recall',()=>{let g=fixture('Blood Weaver');put(g,E,'Fire Knight');g=cast(g,'Blood Bond');assert.equal(g[E].creatures[0],null);assert.equal(g[P].creatures[0].owner,E);g=cast(g,'Tidal Wave');assert.equal(g[P].creatures[0],null);assert.ok(g[E].hand.some(c=>c.name==='Fire Knight'));});
test('void returns after two owner turns',()=>{let g=fixture();const u=put(g,P,'Shadow Wraith');g=cast(g,'Dark Dimension');assert.equal(g[P].creatures[0],null);assert.equal(g[P].banished.length,1);for(let i=0;i<4*4;i++)g=tick(g);assert.equal(g[P].banished.length,0);assert.ok(g[P].creatures.some(v=>v?.uid===u.uid));});
test('spell immunity prevents damage',()=>{let g=fixture('Draco Alec');const target=put(g,E,'Fire Knight');g.isMyTurn=false;g[E].hand=[byName['The Generals Armor']];g=performMove(g,{type:'play',index:0});g=resolveChoice(g,target.uid);g.isMyTurn=true;g=cast(g,"Draco's Inferno");assert.equal(g[E].creatures[0].currentCH,4);});
test('tokens enter legal empty slots',()=>{let g=fixture();g=cast(g,'Vine Tree');assert.equal(g[P].creatures.filter(Boolean).length,2);assert.equal(g[P].creatures[0].currentCH,5);assert.ok(g[P].creatures[0].traits.guardian);});
test('spell prerequisites are enforced',()=>{let g=fixture();assert.throws(()=>cast(g,'Divine Light'),/Enchantment/);assert.throws(()=>cast(g,'Michael'),/Divine Light/);});
test('search chooses only eligible cards',()=>{let g=fixture();g[P].graveyard=[byName['Soul Siphon'],byName['Fire Knight']];g=cast(g,'Blood Witch',false);assert.ok(g.pendingChoice);assert.ok(g.pendingChoice.options.some(o=>o.card?.name==='Soul Siphon'));assert.ok(!g.pendingChoice.options.some(o=>o.card?.name==='Fire Knight'));});
test('all card entry resolvers are callable without programming errors',()=>{for(const card of cards){let g=fixture();put(g,P,'Draco');put(g,E,'Flame Dragon');g[P].hand=[card];try{performMove(g,{type:'play',index:0},[],true);}catch(e){assert.ok(!(e instanceof TypeError||e instanceof ReferenceError),`${card.name}: ${e.message}`);}}});
test('all activated abilities are callable without programming errors',()=>{for(const card of cards){let g=fixture();const zone=card.card_type==='controller'?'controllers':card.card_type==='artifact'?'artifacts':card.card_type==='spell'?'spells':'creatures';const u=put(g,P,card.name,zone);put(g,E,'Flame Dragon');for(let index=0;index<abilityList(u).length;index++){try{performMove(g,{type:'ability',source:u.uid,index},[],true);}catch(e){assert.ok(!(e instanceof TypeError||e instanceof ReferenceError),`${card.name}: ${e.message}`);}}}});
test('AI controller declines equal recoil chip damage',()=>{const g=fixture();g.isMyTurn=false;g.phase='combat';assert.equal(chooseAIAttack(g),null);});
test('AI refuses suicidal controller attacks',()=>{const g=fixture();g.isMyTurn=false;g.phase='combat';g[E].controllers[0].damage=11;put(g,P,'Frozen Golem');assert.equal(chooseAIAttack(g),null);});
test('AI preserves controller health even for a creature kill',()=>{const g=fixture();g.isMyTurn=false;g.phase='combat';g[E].controllers[0].damage=6;const target=put(g,P,'Fire Knight');target.damage=3;assert.equal(chooseAIAttack(g),null);});
test('AI takes a controller attack that wins safely',()=>{const g=fixture();g.isMyTurn=false;g.phase='combat';g[P].controllers[0].damage=11;const move=chooseAIAttack(g);assert.ok(move);assert.equal(move.source,g[E].controllers[0].uid);assert.equal(move.target,g[P].controllers[0].uid);});
test('AI prefers a creature for efficient damage',()=>{const g=fixture();g.isMyTurn=false;g.phase='combat';const unit=put(g,E,'Flame Dragon');const move=chooseAIAttack(g);assert.equal(move.source,unit.uid);});
test('AI can use a healthy equipped controller effectively',()=>{const g=fixture();g.isMyTurn=false;g.phase='combat';g[E].controllers[0].bonusAP=4;const move=chooseAIAttack(g);assert.ok(move);assert.equal(move.source,g[E].controllers[0].uid);});
test('AI forecast leaves the live match unchanged',()=>{const g=fixture();g.isMyTurn=false;g.phase='combat';put(g,E,'Flame Dragon');const before=JSON.stringify(g);chooseAIAttack(g);assert.equal(JSON.stringify(g),before);});
test('recruit effects summon exactly one additional copy',()=>{for(const name of ['Goblin Knight','Wind Pack']){let g=fixture();g[P].deck=Array.from({length:5},()=>structuredClone(byName[name]));g=cast(g,name);assert.equal(g[P].creatures.filter(Boolean).length,2);assert.equal(g[P].deck.length,4);}});
test('balance prices and repeatable damage costs',()=>{for(const name of ['Blood Bond',"Draco's Curse","Shadow's Embrace"])assert.equal(byName[name].cost,5);assert.equal(byName['Spark Knight Blade'].cost,3);for(const [name,index,cost] of [['Blood Lord',0,3],['Shadow Master',0,3],['Flame Emperor',1,2]]){let g=fixture(name);put(g,E,'Flame Dragon');g=performMove(g,{type:'ability',source:g[P].controllers[0].uid,index},[],true);assert.equal(g[P].shards,100-cost);}});
test('Inferno costs three before discounts and two with Draco',()=>{assert.equal(byName["Draco's Inferno"].cost,3);let g=fixture('Draco Alec');g=cast(g,"Draco's Inferno");assert.equal(g[P].shards,97);g=fixture('Draco Alec');put(g,P,'Draco');g=cast(g,"Draco's Inferno");assert.equal(g[P].shards,98);});
test('Smoke Body lasts through enemy turn and expires at owner turn start',()=>{let g=fixture();put(g,P,'Fire Knight');g=cast(g,'Smoke Body');assert.ok(g[P].creatures[0].traits.invulnerable);g=tick(tick(g));assert.equal(g[P].spells.filter(Boolean).length,1);while(g.phase!=='combat')g=tick(g);g=tick(g);assert.equal(g[P].spells.filter(Boolean).length,0);assert.ok(!g[P].creatures[0].traits.invulnerable);});
test('Light Bind lasts two affected owner turns',()=>{let g=fixture();put(g,E,'Fire Knight');g=cast(g,'Light Bind');assert.equal(g[E].creatures[0].statuses['Light Bind'].remaining,2);for(let i=0;i<14;i++)g=tick(g);assert.equal(g[E].creatures[0].statuses['Light Bind'],undefined);});
test('Enflamed caps controller burst at six',()=>{let g=fixture('Supreme Fire Spirit');put(g,E,'Flame Dragon').bonusCH=20;g=cast(g,'Enflamed');assert.equal(g[E].creatures[0].flags.enflamed.amount,6);g=tick(tick(g));while(g.phase!=='combat')g=tick(g);g=tick(g);assert.equal(g[E].controllers[0].damage,6);});
test('Frozen Troll heals only on owner turn start',()=>{let g=fixture();put(g,P,'Frozen Troll').damage=4;g=tick(tick(g));assert.equal(g[P].creatures[0].damage,4);while(g.phase!=='combat')g=tick(g);g=tick(g);assert.equal(g[P].creatures[0].damage,2);});
test('Reaper kill does not refund attack',()=>{let g=fixture();const a=put(g,P,'Reaper');a.bonusCH=10;const t=put(g,E,'Fire Knight');t.damage=3;g=attack(g,a,t);assert.equal(g[P].creatures[0].attacksUsed,1);assert.equal(g[P].creatures[0].canAttack,false);});
console.log(`${passed} synchronous rules tests passed.`);
let completed=0;
for(let i=0;i<elements.length;i++){
 let g=newMatch(elements[i],elements[(i+1)%elements.length],null,null,99+i);
 // Exercise both seats without changing ownership or moving zones.
 for(let turn=0;turn<180&&!outcome(g);turn++){
  g=(await runAITurn(g,{delayMs:0,difficulty:'hard',controlledSide:g.isMyTurn?P:E,simulation:true})).nextState;
  assert.ok(!g.pendingChoice,'AI fixture should resolve automatically');
  for(const s of[P,E])assert.ok(g[s].shards>=0);
 }
 if(outcome(g))completed++;
 else console.log('DRAW BY TURN LIMIT',elements[i]);
}
console.log(`${completed}/9 full AI games reached a controller defeat within 180 turns.`);
assert.equal(completed,9,'All faction simulations must complete.');

