import { createClient } from 'npm:@supabase/supabase-js@2.94.0';
import { createArtHandler, generateImage } from './handler.js';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
function checked(result:any){
 if(result.error){const error:any=new Error(result.error.code==='P0001'?result.error.message:'Artwork storage is unavailable.');error.safe=true;error.status=result.error.code==='P0001'?409:503;throw error;}return result.data;
}
Deno.serve(createArtHandler({
 key:()=>Deno.env.get('OPENAI_API_KEY'),
 authenticate:async(token:string)=>{const {data,error}=await db.auth.getUser(token);return error?null:data.user;},
 isAdmin:async(id:string)=>!!checked(await db.from('game_admins').select('user_id').eq('user_id',id).maybeSingle()),
 reserve:async(actor:string,id:string,payload:unknown)=>checked(await db.rpc('admin_art_reserve',{p_actor:actor,p_id:id,p_payload:payload})),
 status:async(actor:string,id:string)=>checked(await db.rpc('admin_art_status',{p_actor:actor,p_id:id})),
 finish:async(actor:string,id:string,values:unknown)=>checked(await db.from('admin_art_jobs').update(values).eq('id',id).eq('user_id',actor).eq('status','processing')),
 upload:async(path:string,bytes:Uint8Array)=>checked(await db.storage.from('card-art').upload(path,bytes,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false})),
 publicUrl:(path:string)=>db.storage.from('card-art').getPublicUrl(path).data.publicUrl,
 generate:generateImage,
 background:(promise:Promise<unknown>)=>EdgeRuntime.waitUntil(promise),
}));
