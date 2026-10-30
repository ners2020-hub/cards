import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { tutorialLessons, tutorialScene, tutorialAction, tutorialMove, verifyTutorial } from '../practice/tutorialRules';
import { cards } from '../practice/catalog';
import { useBattlePlayback } from '../practice/useBattlePlayback';
import { setBattleAudio } from '../audio/gameAudio';
import { rewardRequest } from '../store/RewardSummary';
import { supabase } from '../lib/supabaseClient';
import '../practice/practice.css';
import './tutorial.css';
const SAVE='fatebound.tutorial.v1';
function savedProgress(){try{const data=JSON.parse(localStorage.getItem(SAVE));if(data){verifyTutorial(data);return data;}}catch{/* Invalid or incomplete saves restart safely. */}return null;}
export default function Tutorial(){
 const [completed,setCompleted]=useState(savedProgress),[index,setIndex]=useState(0),[game,setGame]=useState(()=>tutorialScene(0));
 const [done,setDone]=useState(false),[notice,setNotice]=useState(''),[selection,setSelection]=useState(null),[claim,setClaim]=useState(null),[busy,setBusy]=useState(false);
 const records=useRef([]),actions=useRef([]),lock=useRef(false),mounted=useRef(true);
 const playback=useBattlePlayback(setGame,setNotice),lesson=tutorialLessons[index];
 useEffect(()=>{mounted.current=true;playback.reset(game);setBattleAudio(true);return()=>{mounted.current=false;setBattleAudio(false);};},[]);
 const expected=!done&&!completed?tutorialAction(index,game):null;
 async function act(action){
  if(lock.current||done||completed)return;lock.current=true;setNotice('');
  try{const next=tutorialMove(index,game,action);actions.current.push(action);setSelection(null);await playback.present(next);if(mounted.current)setDone(!next.pendingChoice);}
  catch(e){setNotice(e.message);}finally{lock.current=false;}
 }
 function next(){
  records.current[index]=actions.current;actions.current=[];
  if(index===tutorialLessons.length-1){verifyTutorial(records.current);setCompleted(records.current);try{localStorage.setItem(SAVE,JSON.stringify(records.current));}catch{/* Still claimable this session. */}setBattleAudio(false);}
  else{const n=index+1;setIndex(n);setDone(false);setNotice('');playback.reset(tutorialScene(n));}
 }
 async function openPack(){
  if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session?.user||data.session.user.is_anonymous){setNotice('Sign in, then return here to claim your pack. Your completed tutorial is saved in this browser.');return;}
   setClaim(await rewardRequest({op:'tutorial',lessons:completed}));
  }catch{setNotice('Your reward is not confirmed yet. Retry safely; your account can receive it only once.');}finally{lock.current=false;setBusy(false);}
 }
 function cardButton(card,u,area){
  const highlight=!!expected&&(area==='hand'&&expected.type==='play'||u&&(expected.source===u.uid||expected.target===u.uid||expected.id===u.uid));
  const click=()=>{
   if(!expected)return;
   if(area==='hand'&&expected.type==='play'){if(card.card_type==='creature')setSelection('summon');else void act(expected);}
   else if(u&&expected.type==='attack'&&u.uid===expected.source)setSelection(u.uid);
   else if(u&&expected.type==='attack'&&u.uid===expected.target&&selection===expected.source)void act(expected);
   else if(u&&expected.type==='choice'&&u.uid===expected.id)void act(expected);
   else setNotice('Follow the lesson: choose the highlighted card or action. Select your attacker before its target.');
  };
  return <button key={u?.uid||card.id} data-unit={u?.uid} className={`lesson-card ${highlight?'lesson-highlight':''} ${selection===u?.uid?'lesson-selected':''}`} disabled={playback.playing||done} onClick={click} aria-label={`${card.name}${u?`, ${u.currentAP} attack, ${u.currentCH} health`:`, ${card.cost} shards`}`}>
   <img src={card.image_url} alt=""/><strong>{card.name}</strong><small>{u?`${u.currentAP} attack · ${u.currentCH} health`:`${card.cost} shards · ${card.card_type}`}</small><span>{card.description}</span>
  </button>;
 }
 return <main className="tutorial-page" ref={playback.root}><header><Link to="/">← Back to game</Link><span>FATEBOUND · LEARN TO PLAY</span></header>
 {!completed?<><section className="lesson-guide"><small>LESSON {index+1} OF {tutorialLessons.length} · GUIDED PRACTICE</small><progress value={index+(done?1:0)} max={tutorialLessons.length}/><h1>{lesson.title}</h1><p>{lesson.text}</p><p className="lesson-hint">{done?'Well done! Continue when you are ready.':game.pendingChoice?'Choose the highlighted target below.':selection==='summon'?'Now choose the empty creature slot.':selection?'Now choose the highlighted enemy.':'Highlighted cards and buttons show your next action.'}</p>
 {done?<button className="primary" onClick={next}>{index===7?'Complete tutorial':'Next lesson →'}</button>:expected?.type==='advance'?<button className="primary lesson-highlight" disabled={playback.playing} onClick={()=>act(expected)}>{index===0?'Draw card':'Gain 2 shards'}</button>:expected?.type==='ability'?<button className="primary lesson-highlight" disabled={playback.playing} onClick={()=>act(expected)}>Flame Emperor: Flame Insight · 2 shards</button>:null}
 <p role="status">{notice||playback.cue?.text}</p></section>
 <section className="lesson-board" aria-label="Training battlefield">{['opponentState','playerState'].map(side=><section key={side}><h2>{side==='playerState'?'Your side':'Training opponent'} <small>{game[side].shards} shards</small></h2><div className="lesson-row">{[...game[side].controllers,...game[side].creatures].filter(Boolean).map(u=>cardButton(u.card,u,'field'))}{side==='playerState'&&index===2&&!game.playerState.creatures[0]&&<button className={`lesson-slot ${selection==='summon'?'lesson-highlight':''}`} disabled={selection!=='summon'||playback.playing} onClick={()=>act(expected)}>Summon here</button>}</div><p>{game[side].artifacts.filter(Boolean).map(u=>`Equipped: ${u.card.name}`).join(' · ')}</p></section>)}<h2>Your hand</h2><div className="lesson-row">{game.playerState.hand.map(c=>cardButton(c,null,'hand'))}</div><p>Phase: {game.phase} · Turn {game.turnNumber} · Practice scenes are preset; normal matches start on turn 1.</p></section></>:
 <section className="lesson-complete"><small>TUTORIAL COMPLETE</small><h1>Ready to claim dominion.</h1><p>You learned the turn phases, shards, creatures, spells, artifacts, abilities, and combat protection.</p><p>Your reward: one free five-card Starter Pack per account. Replaying does not grant extra packs. Your next AI win earns the normal 10-token win reward when signed in.</p>
 {!claim?<button className="primary" disabled={busy} onClick={openPack}>{busy?'Confirming reward…':'Open free Starter Pack'}</button>:<><h2>{claim.alreadyClaimed?'Your tutorial pack was already claimed':'Your Starter Pack is open!'}</h2><p>These cards are saved in your collection. Wallet: {claim.tokens} tokens.</p><div className="lesson-row">{claim.cards.map((id,i)=>{const c=cards.find(c=>c.id===id);return <article className="lesson-card" key={`${id}-${i}`}><img src={c?.image_url} alt=""/><strong>{c?.name||id}</strong></article>;})}</div></>}
 <p role="status">{notice}</p><nav><Link to="/login">Sign in to claim</Link><Link to="/">Play a practice match →</Link><Link to="/store">View collection</Link></nav><button onClick={()=>{setCompleted(null);setClaim(null);setIndex(0);setDone(false);records.current=[];actions.current=[];setNotice('');playback.reset(tutorialScene(0));setBattleAudio(true);}}>Replay tutorial</button></section>}
 </main>;
}
