import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

// Present received snapshots in order; commit damage only after the attack lands.
export function useBattlePlayback(setGame, setNotice) {
 const root=useRef(null), current=useRef(null), tail=useRef(Promise.resolve()), epoch=useRef(0), locked=useRef(false);
 const animations=useRef(new Set());
 const [playing,setPlaying]=useState(false),[cue,setCue]=useState(null);
 const reduced=useReducedMotion();
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function reset(next=null){epoch.current++;tail.current=Promise.resolve();animations.current.forEach(a=>a.cancel());animations.current.clear();locked.current=false;current.current=next;setPlaying(false);setCue(null);setGame(next);}
 useEffect(()=>()=>{epoch.current++;animations.current.forEach(a=>a.cancel());},[]);
 function present(next,{initial=false}={}){
  if(initial||!current.current){reset(next);return Promise.resolve();}
  const token=epoch.current;locked.current=true;setPlaying(true);
  const work=async()=>{
   if(token!==epoch.current)return;
   const effect=next.pendingChoice?null:next.lastEffect;
   const text=effect?.text||next.log?.at(-1)||(next.isMyTurn?'Your turn.':'Rival’s turn.');
   setNotice(text);setCue(effect?.text?effect:null);
   if(effect?.kind==='attack'){
    const source=root.current?.querySelector(`[data-unit="${effect.source}"]`);
    const target=root.current?.querySelector(`[data-unit="${effect.uid}"]`);
    await pause(reduced?250:450);
    if(token!==epoch.current)return;
    if(source&&target&&!reduced){
     const a=source.getBoundingClientRect(),b=target.getBoundingClientRect();
     const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2;
     const anim=source.animate([{transform:'translate(0,0) scale(1)',zIndex:30},{transform:'translate(0,0) scale(1.12)',zIndex:30,offset:.2},{transform:`translate(${dx*.85}px,${dy*.85}px) scale(1.07)`,zIndex:30,offset:.65},{transform:'translate(0,0) scale(1)',zIndex:30}],{duration:1000,easing:'ease-in-out'});
     animations.current.add(anim);await anim.finished.catch(()=>{});animations.current.delete(anim);
    }else await pause(reduced?350:1000);
   }else if(effect)await pause(reduced?300:650);
   if(token!==epoch.current)return;
   current.current=next;setGame(next);
   await pause(next.pendingChoice?0:effect?.kind==='attack'?850:effect?750:450);
   if(token!==epoch.current)return;
   setCue(null);
  };
  const job=tail.current.then(work);tail.current=job.catch(()=>{});
  void job.finally(()=>{if(token===epoch.current&&tail.current===safe){locked.current=false;setPlaying(false);}}).catch(()=>{});
  const safe=tail.current;
  return job;
 }
 return {root,playing,cue,present,reset,locked};
}
