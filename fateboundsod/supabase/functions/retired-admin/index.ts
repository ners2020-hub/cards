// Legacy card editors used mutable profile roles. Authoring now uses /admin.
Deno.serve(req=>new Response(req.method==='OPTIONS'?'ok':JSON.stringify({error:'This editor has moved. Open /admin in Fatebound.'}),{
 status:req.method==='OPTIONS'?200:410,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'}
}));
