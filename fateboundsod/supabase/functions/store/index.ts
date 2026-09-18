import { createClient } from 'npm:@supabase/supabase-js@2.94.0';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors});
 if(req.method!=='POST') return reply({error:'POST required.'},405);
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token) return reply({error:'Sign in to use the store.'},401);
 const {data:auth,error:authError}=await db.auth.getUser(token);
 if(authError||!auth.user||auth.user.is_anonymous) return reply({error:'Sign in to use the store.'},401);
 try {
  const raw=await req.text();
  if(raw.length>1024) return reply({error:'Request too large.'},413);
  const b=JSON.parse(raw);
  if(!['get','pack','unlock','promo'].includes(b.op)||typeof (b.item??'')!=='string'||(b.item??'').length>80|| (b.op!=='get'&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.requestId))) return reply({error:'Invalid store request.'},400);
  const {data,error}=await db.rpc('store_request',{p_actor:auth.user.id,p_operation:b.op,p_item:b.item??'',p_request:b.requestId??null,p_email:auth.user.email});
  if(error) return reply({error:error.code==='P0001'?error.message:'Store unavailable. Please retry.'},error.code==='P0001'?422:503);
  return reply(data);
 } catch {return reply({error:'Invalid store request.'},400);}
});
