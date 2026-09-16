import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
const env=Object.fromEntries((await readFile('.env','utf8')).split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));
const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_ANON_KEY;
assert.equal(new URL(url).hostname,'lyqfwiqdbwuyqinvqpsd.supabase.co');
const users=JSON.parse(await readFile('outputs/live-test-private.json','utf8'));
const clients=users.map(()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}));
async function invoke(i,body){const {data,error}=await clients[i].functions.invoke('multiplayer',{body});if(error){let p;try{p=await error.context.json();}catch{}return {error:p?.error||error.message,status:error.context?.status,current:p?.current};}return data;}
for(let i=0;i<3;i++){const {error}=await clients[i].auth.signInWithPassword(users[i]);assert.equal(error,null,error?.message);}
console.log('PASS three distinct authenticated accounts');
const noauth=await fetch(`${url}/functions/v1/multiplayer`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({op:'list'})});assert.equal(noauth.status,401);console.log('PASS unauthenticated access rejected');
const invite=randomUUID().replaceAll('-',''),id=randomUUID(),deck={element:'fire',controller:'Flame Emperor'};
let room=await invoke(0,{op:'create',id,invite,deck});assert.equal(room.status,'waiting',JSON.stringify(room));
assert.equal((await invoke(2,{op:'get',id})).error!==undefined,true);
const joins=await Promise.all([invoke(1,{op:'join',invite,deck}),invoke(2,{op:'join',invite,deck})]);assert.equal(joins.filter(r=>r.status==='active').length,1,JSON.stringify(joins));
const guest=joins[0].status==='active'?1:2,outsider=guest===1?2:1;
console.log('PASS simultaneous joins admit exactly one opponent');
room=await invoke(0,{op:'get',id});assert.equal(room.status,'active');assert.equal(room.game.opponentState.hand.length,0);assert.equal(room.game.playerState.deck.length,0);assert.equal(room.game.seed,undefined);
const privateRead=await clients[0].from('mp_matches').select('*');assert.ok(privateRead.error);const outsiderRoom=await invoke(outsider,{op:'get',id});assert.ok(outsiderRoom.error);
const membership=await clients[outsider].from('mp_memberships').select('*').eq('match_id',id);assert.deepEqual(membership.data,[]);
console.log('PASS private states and non-member access blocked');
async function subscribe(i){await clients[i].realtime.setAuth(); return await new Promise((resolve,reject)=>{const c=clients[i].channel(`match:${id}`,{config:{private:true,presence:{key:users[i].id}}});const t=setTimeout(()=>{clients[i].removeChannel(c);reject(Error('Realtime timeout'));},12000);c.on('broadcast',{event:'changed'},()=>{}).subscribe((s,err)=>{if(s==='SUBSCRIBED'){clearTimeout(t);resolve(c);}if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){clearTimeout(t);clients[i].removeChannel(c);reject(Error(s+": "+(err?.message||"unknown")));}});});}
const channel=await subscribe(0);await channel.track({online:true});console.log('PASS participant private Realtime subscription');
let notification=false;channel.on('broadcast',{event:'changed'},()=>{notification=true;});
const envelope={op:'action',id,expectedVersion:room.version,actionId:randomUUID(),action:{type:'advance'}};
const [a,b]=await Promise.all([invoke(0,envelope),invoke(0,envelope)]);assert.equal(a.version,2,JSON.stringify(a));assert.equal(b.version,2,JSON.stringify(b));
assert.equal((await invoke(0,{op:'get',id})).version,2);console.log('PASS concurrent duplicate action commits once');
const stale=await invoke(0,{...envelope,actionId:randomUUID()});assert.equal(stale.status,409);assert.equal(stale.current.version,2);
const forged=await invoke(0,{...envelope,expectedVersion:2,actionId:randomUUID(),action:{type:'play',index:0,free:true}});assert.equal(forged.status,422);
const wrong=await invoke(guest,{...envelope,expectedVersion:2,actionId:randomUUID()});assert.equal(wrong.status,422);console.log('PASS stale, forged and wrong-seat moves rejected');
let guestView=await invoke(guest,{op:'get',id});assert.equal(guestView.version,2);assert.equal(guestView.game.isMyTurn,false);console.log('PASS reconnect fetch restores correct private view');
const report=await invoke(guest,{op:'report',id,reportId:randomUUID(),description:'Automated test report'});assert.equal(report.ok,true);
const finish=await invoke(guest,{op:'action',id,expectedVersion:2,actionId:randomUUID(),action:{type:'concede'}});assert.equal(finish.status,'finished');assert.equal(finish.game.result,'Defeat');assert.equal((await invoke(0,{op:'get',id})).game.result,'Victory');
console.log('PASS concession, winner and versioned bug report');
await new Promise(r=>setTimeout(r,1000));assert.ok(notification,'Expected version broadcast');console.log('PASS live version notification');
await clients[0].removeChannel(channel);
const naturalId=randomUUID(),naturalInvite=randomUUID().replaceAll('-','');
await invoke(0,{op:'create',id:naturalId,invite:naturalInvite,deck});
await invoke(guest,{op:'join',invite:naturalInvite,deck});
let natural=await invoke(0,{op:'get',id:naturalId}),turns=0;
while(natural.status!=='finished'&&turns++<400){
  let actor=natural.seat==='playerState'?0:guest;
  if((natural.game.waitingForChoice&&!natural.game.pendingChoice)||(!natural.game.waitingForChoice&&!natural.game.isMyTurn)){actor=actor===0?guest:0;natural=await invoke(actor,{op:'get',id:naturalId});}
  const g=natural.game;
  let candidates=[{type:'advance'}];
  if(g.pendingChoice)candidates=[{type:'choice',id:g.pendingChoice.options[0].id}];
  else if(g.phase==='main')candidates=[...g.playerState.hand.flatMap((c,index)=>c.card_type==='creature'&&c.displayCost<=g.playerState.shards&&g.playerState.creatures.some(u=>!u)?[{type:'play',index}]:[]),...candidates];
  else if(g.phase==='combat')candidates=[...[...g.playerState.creatures,...g.playerState.controllers].filter(u=>u?.canAttack).flatMap(source=>[...g.opponentState.creatures,...g.opponentState.controllers].filter(Boolean).map(target=>({type:'attack',source:source.uid,target:target.uid}))),...candidates];
  let moved=false;
  for(const action of candidates){const next=await invoke(actor,{op:'action',id:naturalId,expectedVersion:natural.version,actionId:randomUUID(),action});if(!next.error){natural=next;moved=true;break;}assert.equal(next.status,422,JSON.stringify(next));}
  assert.ok(moved,'A legal action must be available');
  if(turns%20===0)console.log(`Live game: ${turns} actions, turn ${natural.game.turnNumber}`);
}
assert.equal(natural.status,'finished','Live game should reach controller defeat');
assert.ok(['Victory','Defeat','Draw'].includes(natural.game.result));
console.log(`PASS two distinct accounts completed a full game in ${turns} actions`);
for(const c of clients){await c.auth.signOut();await c.removeAllChannels();}
console.log('LIVE MULTIPLAYER CHECKS PASSED');

