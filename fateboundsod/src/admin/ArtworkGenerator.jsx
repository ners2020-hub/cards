import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import './artwork.css';

async function request(body) {
 const {data,error}=await supabase.functions.invoke('admin-art',{body});
 if(error){let payload;try{payload=await error.context.json();}catch{/* interrupted request */}const failure=new Error(payload?.error||'Connection interrupted. Check the existing request status before generating again.');failure.definitive=payload?.started===false||[400,401,403,409,422].includes(error.context?.status);throw failure;}
 return data;
}
export default function ArtworkGenerator({card,userId,disabled,onUse}) {
 const storageKey=`fatebound.artwork.${userId}`;
 const [config,setConfig]=useState(null),[direction,setDirection]=useState(''),[job,setJob]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),mounted=useRef(true);
 function remember(next){setJob(next);sessionStorage.setItem(storageKey,JSON.stringify(next));}
 async function checkConfig(){try{const next=await request({op:'config'});if(mounted.current){setConfig(next);setMessage('');}}catch(e){if(mounted.current)setMessage(e.message);}}
 useEffect(()=>{mounted.current=true;try{const saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');if(saved?.id)setJob(saved);}catch{/* damaged saved request */}void checkConfig();return()=>{mounted.current=false;};},[storageKey]);
 async function checkStatus(){if(!job?.id||lock.current)return;lock.current=true;setBusy(true);try{const next=await request({op:'status',requestId:job.id});if(mounted.current){remember(next);setMessage(next.error||'');}}catch(e){if(mounted.current){setMessage(e.message);if(e.message==='Artwork request not found.')remember({...job,status:'failed',error:'No generation was recorded. You can start a new request.'});}}finally{lock.current=false;if(mounted.current)setBusy(false);}}
 useEffect(()=>{
  if(job?.status!=='processing')return;
  let cancelled=false,attempts=0,timer;
  const poll=async()=>{
   try{const next=await request({op:'status',requestId:job.id});if(cancelled)return;remember(next);if(next.status!=='processing'){setMessage(next.error||'Artwork is ready to preview.');return;}}
   catch(e){if(cancelled)return;setMessage(e.message);if(e.message==='Artwork request not found.'){remember({...job,status:'failed',error:'No generation was recorded. You can start a new request.'});return;}}
   if(++attempts<45)timer=setTimeout(poll,3000);else setMessage('Still waiting. Use Check status to recover this request; starting a new generation may incur another charge.');
  };
  timer=setTimeout(poll,3000);return()=>{cancelled=true;clearTimeout(timer);};
 },[job?.id,job?.status]);
 async function generate(){
  if(lock.current||disabled||job?.status==='processing')return;
  lock.current=true;setBusy(true);setMessage('Starting your artwork…');
  const requestId=crypto.randomUUID();const pending={id:requestId,status:'processing',cardCode:card.code,cardName:card.name};remember(pending);
  try{const next=await request({op:'generate',requestId,card:{code:card.code,name:card.name,element:card.element,card_type:card.card_type,description:card.description},direction});if(mounted.current){remember(next);setMessage(next.error||'Generating artwork. You can leave this page and check this request when you return.');}}
  catch(e){if(mounted.current){setMessage(e.message);if(e.definitive)remember({...pending,status:'failed',error:e.message});}}
  finally{lock.current=false;if(mounted.current)setBusy(false);}
 }
 const processing=job?.status==='processing';
 return <section className="admin-artwork" aria-label="AI artwork generator">
  <h3>Generate card artwork</h3>
  <p>Uses this card’s name, element and rules. Preview the result, then choose whether to use it.</p>
  <small>Uses your configured OpenAI API billing. One portrait per request · 10 attempts per admin per 24 hours. Regenerating starts another paid request.</small>
  <label>Art direction (optional)<textarea maxLength={1000} value={direction} disabled={busy||processing||disabled} placeholder="Appearance, pose, setting, colors…" onChange={e=>setDirection(e.target.value)}/></label>
  {config&&!config.configured&&<p role="status">Generation is not connected yet. Add OPENAI_API_KEY in Supabase’s Edge Function secrets, then check the connection. Never put the key in a card or artwork prompt.</p>}
  <button type="button" disabled={busy||disabled||processing||!config?.configured||!card.name.trim()} onClick={generate}>{processing?'Generating…':job?.status==='ready'?'Generate another image':'Generate artwork'}</button>
  {!config?.configured&&<button type="button" disabled={busy} onClick={checkConfig}>Check connection</button>}
  {job&&<button type="button" disabled={busy} onClick={checkStatus}>Check status</button>}
  <p role="status" aria-live="polite">{message||job?.error}</p>
  {job?.status==='ready'&&job.url&&<div className="admin-generated-preview"><img src={job.url} alt={`Generated artwork for ${job.cardName}`}/><p>{job.cardName}</p><button type="button" disabled={disabled||busy||job.cardCode!==card.code} onClick={()=>onUse(job.url)}>Use this artwork</button><small>{job.cardCode===card.code?'Then save the card draft to keep your selection.':'Open the original card draft to use this artwork.'}</small></div>}
  {job?.status==='failed'&&<small>This request will not automatically run again. Generate artwork starts a new attempt.</small>}
 </section>;
}
