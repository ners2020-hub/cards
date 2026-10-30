import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { tutorialLessons, tutorialScene, tutorialMove, verifyTutorial } from '../practice/tutorialRules';
import { cards } from '../practice/catalog';
import Practice from '../practice/Practice';
import { rewardRequest } from '../store/RewardSummary';
import { supabase } from '../lib/supabaseClient';
import '../practice/practice.css';
import './tutorial.css';
const SAVE='fatebound.tutorial.v1';
function savedProgress(){try{const data=JSON.parse(localStorage.getItem(SAVE));if(data){verifyTutorial(data);return data;}}catch{/* Invalid or incomplete saves restart safely. */}return null;}
export default function Tutorial(){
 const [completed,setCompleted]=useState(savedProgress),[index,setIndex]=useState(0),[game,setGame]=useState(()=>tutorialScene(0));
 const [done,setDone]=useState(false),[notice,setNotice]=useState(''),[version,setVersion]=useState(0),[claim,setClaim]=useState(null),[busy,setBusy]=useState(false);
 const records=useRef([]),actions=useRef([]),lock=useRef(false);
 const lesson=tutorialLessons[index];
 function act(action){
  if(lock.current||done||completed)return;lock.current=true;setNotice('');
  try{const next=tutorialMove(index,game,action);actions.current.push(action);setGame(next);setVersion(v=>v+1);}
  catch(e){setNotice(e.message);lock.current=false;}
 }
 function presented(next){lock.current=false;setDone(!next.pendingChoice);}
 function next(){
  records.current[index]=actions.current;actions.current=[];
  if(index===tutorialLessons.length-1){verifyTutorial(records.current);setCompleted(records.current);try{localStorage.setItem(SAVE,JSON.stringify(records.current));}catch{/* Still claimable this session. */}}
  else{const n=index+1;setIndex(n);setDone(false);setNotice('');setGame(tutorialScene(n));setVersion(0);}
 }
 async function openPack(){
  if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{const {data,error}=await supabase.auth.getSession();if(error)throw error;if(!data.session?.user||data.session.user.is_anonymous){setNotice('Sign in, then return here to claim your pack. Your completed tutorial is saved in this browser.');return;}
   setClaim(await rewardRequest({op:'tutorial',lessons:completed}));
  }catch{setNotice('Your reward is not confirmed yet. Retry safely; your account can receive it only once.');}finally{lock.current=false;setBusy(false);}
 }
 return <main className="tutorial-page tutorial-match" data-lesson={index}><header><Link to="/">← Back to game</Link><span>FATEBOUND · LEARN TO PLAY</span></header>
 {!completed?<><section className="lesson-guide"><small>LESSON {index+1} OF {tutorialLessons.length} · THE REAL BATTLEFIELD</small><progress value={index+(done?1:0)} max={tutorialLessons.length}/><h1>{lesson.title}</h1><p>{index===5?'Click the ✦ ability button on your Flame Emperor below, then choose Flame insight. Pay 2 shards to draw a card; this ability is available once per turn.':lesson.text.replace('the highlighted empty slot','empty slot 01')}</p><p className="lesson-hint">{done?'Well done! Continue when you are ready.':game.pendingChoice?'Choose the lesson target in the effect dialog.':'Use the normal battlefield controls below. Practice scenes have preset resources and turns.'}</p>
 {done&&<button className="primary" onClick={next}>{index===7?'Complete tutorial':'Next lesson →'}</button>}
 <p role="status">{notice}</p></section>
 <Practice key={index} remote={{tutorial:true,game,version,element:'fire',enemy:'fire',busy:done,act,onPresented:presented,leave:()=>{window.location.href='/';}}}/></>:
 <section className="lesson-complete"><small>TUTORIAL COMPLETE</small><h1>Ready to claim dominion.</h1><p>You learned the turn phases, shards, creatures, spells, artifacts, abilities, and combat protection.</p><p>Your reward: one free five-card Starter Pack per account. Replaying does not grant extra packs. Your next AI win earns the normal 10-token win reward when signed in.</p>
 {!claim?<button className="primary" disabled={busy} onClick={openPack}>{busy?'Confirming reward…':'Open free Starter Pack'}</button>:<><h2>{claim.alreadyClaimed?'Your tutorial pack was already claimed':'Your Starter Pack is open!'}</h2><p>These cards are saved in your collection. Wallet: {claim.tokens} tokens.</p><div className="lesson-row">{claim.cards.map((id,i)=>{const c=cards.find(c=>c.id===id);return <article className="lesson-card" key={`${id}-${i}`}><img src={c?.image_url} alt=""/><strong>{c?.name||id}</strong></article>;})}</div></>}
 <p role="status">{notice}</p><nav><Link to="/login">Sign in to claim</Link><Link to="/">Play a practice match →</Link><Link to="/store">View collection</Link></nav><button onClick={()=>{setCompleted(null);setClaim(null);setIndex(0);setDone(false);records.current=[];actions.current=[];setNotice('');setGame(tutorialScene(0));setVersion(0);lock.current=false;}}>Replay tutorial</button></section>}
 </main>;
}
