import { createClient } from 'npm:@supabase/supabase-js@2.94.0';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'POST required.'},405);
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)return reply({error:'Sign in to continue.'},401);
 const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth.user||auth.user.is_anonymous)return reply({error:'Sign in to continue.'},401);
 try{
  const raw=await req.text();if(raw.length>50000)return reply({error:'Request too large.'},413);
  const body=JSON.parse(raw);
  if(!['list','save_card','archive_card','save_promo'].includes(body.op))return reply({error:'Invalid operation.'},400);
  const {data,error}=await db.rpc('admin_request',{p_actor:auth.user.id,p_body:body});
  if(error)return reply({error:error.code==='P0001'?error.message:'Could not save. Check the form and retry.'},error.message==='Admin access required.'?403:422);
  return reply(data);
 }catch{return reply({error:'Invalid admin request.'},400);}
});
