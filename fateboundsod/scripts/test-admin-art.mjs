import assert from 'node:assert/strict';
import { createArtHandler,generateImage,buildPrompt,artPayload } from '../supabase/functions/admin-art/handler.js';
const id='11111111-1111-4111-8111-111111111111';
const body={op:'generate',requestId:id,card:{code:'TEST',name:'Test Knight',element:'light',card_type:'creature',description:'Guardian.'},direction:'Golden armor'};
function fixture(){
 const jobs=new Map(),pending=[];let calls=0,admin=true,configured=true;
 const deps={key:()=>configured?'fake-test-key':null,authenticate:async t=>t==='valid'?{id:'owner'}:t==='anonymous'?{id:'guest',is_anonymous:true}:null,isAdmin:async()=>admin,
 reserve:async(actor,id,payload)=>{if(jobs.has(id))return{run:false,job:jobs.get(id)};const job={id,user_id:actor,payload,status:'processing'};jobs.set(id,job);return{run:true,job};},
 status:async(actor,id)=>jobs.get(id),finish:async(actor,id,values)=>Object.assign(jobs.get(id),values),upload:async()=>{},publicUrl:path=>'https://storage.example/'+path,
 generate:async()=>{calls++;return new Uint8Array([255,216,255,0]);},background:p=>pending.push(p)};
 const handler=createArtHandler(deps);
 return {deps,jobs,handler,calls:()=>calls,setAdmin:v=>{admin=v;},setKey:v=>{configured=v;},drain:()=>Promise.all(pending)};
}
const req=(value=body,token='valid')=>new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:typeof value==='string'?value:JSON.stringify(value)});
let passed=0;
async function test(name,fn){await fn();console.log('PASS',name);passed++;}
await test('missing, invalid and anonymous sessions rejected before any work',async()=>{for(const token of ['', 'invalid','anonymous']){const f=fixture();assert.equal((await f.handler(req(body,token))).status,401);assert.equal(f.calls(),0);assert.equal(f.jobs.size,0);}});
await test('non-admin cannot configure, generate or retrieve images',async()=>{for(const op of ['config','generate','status']){const f=fixture();f.setAdmin(false);assert.equal((await f.handler(req({...body,op}))).status,403);assert.equal(f.jobs.size,0);}});
await test('missing key returns configuration state and cannot reserve paid work',async()=>{const f=fixture();f.setKey(false);assert.equal((await(await f.handler(req({op:'config'}))).json()).configured,false);const r=await f.handler(req());assert.equal(r.status,503);assert.equal((await r.json()).started,false);assert.equal(f.jobs.size,0);});
await test('invalid or oversized requests cannot trigger generation',async()=>{for(const b of [null,{...body,requestId:'bad'},{...body,card:{...body.card,name:''}},{...body,direction:'a'.repeat(1001)},'x'.repeat(13000)]){const f=fixture();assert.ok((await f.handler(req(b))).status>=400);assert.equal(f.calls(),0);}});
await test('same request returns existing job, never another paid call',async()=>{const f=fixture();assert.equal((await f.handler(req())).status,202);await f.drain();const again=await(await f.handler(req())).json();assert.equal(f.calls(),1);assert.equal(again.status,'ready');assert.equal(again.url,`https://storage.example/owner/generated/${id}.jpg`);assert.equal(again.payload,undefined);});
await test('status recovers ready result without generation',async()=>{const f=fixture();await f.handler(req());await f.drain();const r=await(await f.handler(req({op:'status',requestId:id}))).json();assert.equal(r.cardCode,'TEST');assert.equal(r.status,'ready');assert.equal(f.calls(),1);});
await test('quota rejection cannot invoke provider',async()=>{const f=fixture();f.deps.reserve=async()=>{throw Object.assign(new Error('Daily limit'),{safe:true,status:409});};assert.equal((await f.handler(req())).status,409);assert.equal(f.calls(),0);});
await test('provider failure does not leak secrets or automatically retry',async()=>{const f=fixture();f.deps.generate=async()=>{throw new Error('fake-test-key secret details');};await f.handler(req());await f.drain();const r=await(await f.handler(req({op:'status',requestId:id}))).json();assert.equal(r.status,'failed');assert.ok(!JSON.stringify(r).includes('fake-test-key'));await f.handler(req());assert.equal(f.jobs.size,1);});
await test('revoked admin cannot start provider work after reservation',async()=>{const f=fixture();let checks=0;f.deps.isAdmin=async()=>++checks===1;await f.handler(req());await f.drain();assert.equal(f.calls(),0);assert.equal(f.jobs.get(id).status,'failed');});
await test('provider options fixed server-side, JPEG bytes validated',async()=>{const payload=artPayload(body);assert.match(buildPrompt(payload),/Golden armor/);let called=false;const bytes=await generateImage('test-key',payload,async(url,init)=>{called=true;assert.equal(url,'https://api.openai.com/v1/images/generations');const request=JSON.parse(init.body);assert.equal(request.n,1);assert.equal(request.model,'gpt-image-2.5-flare');assert.equal(request.size,'1024x1536');return Response.json({data:[{b64_json:Buffer.from([255,216,255,1]).toString('base64')}]});});assert.ok(called);assert.equal(bytes.length,4);await assert.rejects(generateImage('test-key',payload,async()=>Response.json({data:[{b64_json:'YWJj'}]})));});
console.log(`${passed} admin artwork authorization, recovery and provider checks passed. No paid API calls made.`);
