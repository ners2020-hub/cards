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
   }else if(effect?.kind==='spell' && effect.targets?.length){
    await pause(reduced?300:600);
    if(token!==epoch.current)return;
    const source=root.current?.querySelector(`[data-unit="${effect.source}"]`);
    const origin=source?.getBoundingClientRect() || root.current?.getBoundingClientRect();
    await Promise.all(effect.targets.map(async hit=>{
     const target=root.current?.querySelector(`[data-unit="${hit.uid}"]`);
     if(!target||!origin)return;
     const end=target.getBoundingClientRect();
     if(!reduced){
      const orb=document.createElement('div');orb.className='spell-projectile';orb.setAttribute('aria-hidden','true');
      const x=origin.left+origin.width/2,y=origin.top+origin.height/2;
      orb.style.left=`${x}px`;orb.style.top=`${y}px`;document.body.appendChild(orb);
      const flight=orb.animate([{transform:'translate(-50%,-50%) scale(.5)',opacity:0},{opacity:1,offset:.2},{transform:`translate(${end.left+end.width/2-x}px,${end.top+end.height/2-y}px) scale(1.5)`,opacity:1}],{duration:900,easing:'ease-in-out'});
      animations.current.add(flight);await flight.finished.catch(()=>{});animations.current.delete(flight);orb.remove();
     }
     if(token!==epoch.current)return;
     const glow=target.animate([{boxShadow:'0 0 0 3px #d8bbff, 0 0 45px #ab78ff'},{boxShadow:'0 0 0 1px #d8bbff, 0 0 12px #ab78ff'}],{duration:450});
     animations.current.add(glow);await glow.finished.catch(()=>{});animations.current.delete(glow);
    }));
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
