import { createClient } from 'npm:@supabase/supabase-js@2.94.0';
import { readLimited } from '../admin-art/handler.js';
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
  if(req.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data')){
   const access=await db.from('game_admins').select('user_id').eq('user_id',auth.user.id).maybeSingle();if(access.error||!access.data)return reply({error:'Admin access required.'},403);
   const bytes=await readLimited(req,5*1024*1024+16384);
   const form=await new Response(bytes,{headers:{'Content-Type':req.headers.get('content-type')!}}).formData();const file=form.get('file');
   if(!(file instanceof File)||!/^image\/(png|jpeg|webp|gif)$/.test(file.type)||file.size>5*1024*1024)return reply({error:'Upload a PNG, JPEG, WEBP or GIF up to 5 MB.'},422);
   const head=new Uint8Array(await file.slice(0,12).arrayBuffer());const ascii=new TextDecoder().decode(head);
   const actual=head[0]===255&&head[1]===216&&head[2]===255?'image/jpeg':head.slice(0,8).join(',')==='137,80,78,71,13,10,26,10'?'image/png':/^GIF8[79]a/.test(ascii)?'image/gif':ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP'?'image/webp':null;
   if(actual!==file.type)return reply({error:'The file contents must match its image type.'},422);
   const ext=file.type.split('/')[1].replace('jpeg','jpg');const path=`${auth.user.id}/${crypto.randomUUID()}.${ext}`;
   const uploaded=await db.storage.from('card-art').upload(path,file,{contentType:file.type,cacheControl:'31536000',upsert:false});
   if(uploaded.error)return reply({error:'Artwork storage is unavailable. Try again.'},503);
   return reply({url:db.storage.from('card-art').getPublicUrl(path).data.publicUrl,path});
  }
  const raw=new TextDecoder().decode(await readLimited(req,50000));
  const body=JSON.parse(raw);
  if(!['list','save_card','archive_card','save_promo'].includes(body.op))return reply({error:'Invalid operation.'},400);
  const {data,error}=await db.rpc('admin_request',{p_actor:auth.user.id,p_body:body});
  if(error)return reply({error:error.code==='P0001'?error.message:'Could not save. Check the form and retry.'},error.message==='Admin access required.'?403:422);
  return reply(data);
 }catch{return reply({error:'Invalid admin request.'},400);}
});
