import { createClient } from 'npm:@supabase/supabase-js@2.94.0';
import { validateSolo, replaySolo } from '../_shared/rules/soloRewards.js';
import { BALANCE_VERSION } from '../_shared/rules/balancePatch.js';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status=200) => new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
function check(r: any) { if(r.error) throw new Error('Could not save rewards. Retry safely.'); return r.data; }
Deno.serve(async req=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 if(req.method!=='POST') return reply({error:'POST required.'},405);
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 const {data,error}=await db.auth.getUser(token||'');
 if(error||!data.user||data.user.is_anonymous) return reply({error:'Sign in before starting a match to earn rewards.'},401);
 const actor=data.user.id;
 try {
  const raw=await req.text(); if(raw.length>200000) return reply({error:'Replay too large.'},413);
  const b=JSON.parse(raw);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id)) return reply({error:'Invalid match.'},400);
  if(b.op==='match') {
   const reward=check(await db.from('match_rewards').select('result,tokens').eq('user_id',actor).eq('match_id',b.id).maybeSingle());
   const wallet=check(await db.rpc('store_request',{p_actor:actor,p_email:data.user.email}));
   return reply({reward,rewards:wallet.rewards,tokens:wallet.tokens});
  }
  if(b.op==='start') {
   const config=validateSolo(b.config);
   const row=check(await db.rpc('solo_reward_start',{p_id:b.id,p_actor:actor,p_config:config,p_seed:crypto.getRandomValues(new Uint32Array(1))[0],p_balance:BALANCE_VERSION}));
   return reply({id:row.id,seed:row.seed,config:row.config});
  }
  if(b.op!=='finish') return reply({error:'Invalid request.'},400);
  const row=check(await db.from('solo_reward_sessions').select('*').eq('id',b.id).eq('user_id',actor).maybeSingle());
  if(!row||row.balance_version!==BALANCE_VERSION) return reply({error:'This match cannot be verified with the current rules.'},422);
  let reward=check(await db.from('match_rewards').select('result,tokens').eq('user_id',actor).eq('match_id',b.id).maybeSingle());
  if(!reward) {
   const verified=await replaySolo(row.config,row.seed,b.actions);
   check(await db.rpc('solo_reward_finish',{p_id:b.id,p_actor:actor,p_result:verified.result,p_perfect:verified.perfect}));
   reward=check(await db.from('match_rewards').select('result,tokens').eq('user_id',actor).eq('match_id',b.id).single());
  }
  const wallet=check(await db.rpc('store_request',{p_actor:actor,p_email:data.user.email}));
  return reply({reward,rewards:wallet.rewards,tokens:wallet.tokens});
 } catch {return reply({error:'Rewards could not be verified or saved. Retry to check this match.'},422);}
});
