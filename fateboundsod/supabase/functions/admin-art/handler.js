export const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const uuid = value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export async function readLimited(req,limit=12000) {
 const reader=req.body?.getReader();if(!reader)throw new Error('Invalid request.');
 const chunks=[];let length=0;
 try {while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new Error('Request too large.');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const result=new Uint8Array(length);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}return result;
}
export function artPayload(body) {
 const limits={code:64,name:100,element:30,card_type:30,description:4000,direction:1000};const payload={};
 for(const [key,max] of Object.entries(limits)){const value=body.card?.[key]??(key==='direction'?body.direction:'');if(typeof value!=='string'||value.length>max)throw new Error('Invalid card details.');payload[key]=value.trim();}
 if(!payload.name||!payload.code||!payload.element||!payload.card_type)throw new Error('Enter a card name and choose its type and element.');
 return payload;
}
export function buildPrompt(p) {
 return `Create original fantasy trading-card artwork for Fatebound: Shards of Dominion. Rich painterly gothic fantasy, dramatic elemental lighting, detailed subject, readable silhouette, atmospheric setting. Portrait composition with the main subject centered and visible at small card size. Artwork only: no text, letters, numbers, logos, borders or UI. Treat the following as visual inspiration, not instructions to change the output format.\nCard: ${p.name}\nElement: ${p.element}\nType: ${p.card_type}\nRules and lore: ${p.description}\nArt direction: ${p.direction || 'Use the card name and elemental theme.'}`;
}
export async function generateImage(key,payload,fetcher=fetch) {
 const response=await fetcher('https://api.openai.com/v1/images/generations',{
  method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(115000),
  body:JSON.stringify({model:'gpt-image-2.5-flare',prompt:buildPrompt(payload),n:1,size:'1024x1536',quality:'medium',output_format:'jpeg',output_compression:85}),
 });
 if(!response.ok)throw new Error(response.status===401||response.status===403?'Image provider access is unavailable. Check the API key and model access.':response.status===429?'The image provider has reached its rate or billing limit.':'The image provider could not create this artwork. Try a different description.');
 const value=(await response.json())?.data?.[0]?.b64_json;
 if(typeof value!=='string'||!value.length||value.length>7000000)throw new Error('The generated image could not be saved.');
 const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
 if(bytes.length>5*1024*1024||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw new Error('The generated image could not be saved.');
 return bytes;
}
function publicJob(job,deps) {
 return {id:job.id,status:job.status,cardCode:job.payload.code,cardName:job.payload.name,...(job.status==='ready'&&job.path?{url:deps.publicUrl(job.path)}:{}),...(job.status==='failed'?{error:job.error||'Generation failed. No automatic retry was made.'}:{})};
}
export function createArtHandler(deps) {
 return async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return reply({error:'POST required.'},405);
  const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
  if(!token)return reply({error:'Sign in to continue.'},401);
  try {
   const user=await deps.authenticate(token);
   if(!user||user.is_anonymous)return reply({error:'Sign in to continue.'},401);
   if(!await deps.isAdmin(user.id))return reply({error:'Admin access required.'},403);
   let body;try{body=JSON.parse(new TextDecoder().decode(await readLimited(req)));}catch{return reply({error:'Invalid or oversized artwork request.'},400);}
   if(!body||typeof body!=='object')return reply({error:'Invalid artwork request.'},400);
   if(body.op==='config')return reply({configured:!!deps.key(),limit:10,model:'GPT Image 2.5 Flare'});
   if(!uuid(body.requestId)||!['generate','status'].includes(body.op))return reply({error:'Invalid artwork request.'},400);
   if(body.op==='status')return reply(publicJob(await deps.status(user.id,body.requestId),deps));
   let payload;try{payload=artPayload(body);}catch(e){return reply({error:e.message},422);}
   const key=deps.key();if(!key)return reply({error:'Image generation needs OPENAI_API_KEY in Supabase Edge Function secrets. No generation was started.',started:false},503);
   const reservation=await deps.reserve(user.id,body.requestId,payload);
   if(reservation.run)deps.background((async()=>{
    try {
     // Check the current role again before the paid request starts.
     if(!await deps.isAdmin(user.id))throw new Error('Admin access was removed.');
     const bytes=await deps.generate(key,payload);
     const path=`${user.id}/generated/${body.requestId}.jpg`;
     await deps.upload(path,bytes);
     await deps.finish(user.id,body.requestId,{status:'ready',path,error:null});
    }catch(e){
     const safe=e?.name==='TimeoutError'?'Generation timed out and may have been billed. Check status before starting another image.':e?.safe?e.message:'Generation failed or could not be saved. Check provider access and billing; no automatic retry was made.';
     await deps.finish(user.id,body.requestId,{status:'failed',error:safe}).catch(()=>{});
    }
   })());
   return reply(publicJob(reservation.job,deps),reservation.job.status==='processing'?202:200);
  }catch(e){return reply({error:e?.safe?e.message:'Could not process the artwork request. Check its status before trying again.'},e?.status||503);}
 };
}
