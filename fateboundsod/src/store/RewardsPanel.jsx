import { useState } from 'react';
import { rewardRequest } from './RewardSummary';
const milestones = [[0,1,'Fatebound Initiate'],[100,2,'Fatebound Initiate'],[250,3,'Fatebound Initiate'],[500,4,'Fatebound Initiate'],[800,5,'Shard Seeker'],[2000,10,'Shard Seeker'],[4000,15,'Destiny Weaver'],[7000,20,'Fate Champion'],[12000,25,'Legend of Dominion']];
export default function RewardsPanel({ rewards, userId, refresh }) {
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const level=milestones.filter(m=>m[0]<=(rewards?.xp||0)).at(-1);
 async function retry(){setBusy(true);try{const body=JSON.parse(localStorage.getItem(`fatebound.pendingReward.${userId}`)||'null');if(body){await rewardRequest(body);localStorage.removeItem(`fatebound.pendingReward.${userId}`);}await refresh();setNotice('Your rewards are up to date.');}catch{setNotice('Could not confirm rewards. Please try again.');}finally{setBusy(false);}}
 return <section className="rewards-panel"><div className="store-section-heading"><div><p className="eyebrow">YOUR JOURNEY</p><h2>Play. Win. Grow.</h2></div><button disabled={busy||!userId} onClick={retry}>{busy?'Checking…':'Refresh rewards'}</button></div>
  <p>AI victory: <strong>10 tokens</strong> · Multiplayer victory: <strong>30 tokens</strong>. AI loss: <strong>3 tokens</strong> · Multiplayer loss: <strong>5 tokens</strong>. Completed wins, losses and draws count toward play quests. Rewards are saved automatically.</p>
  <p>Sign in before starting a solo match. Leaving or restarting a solo match does not complete it.</p>
  {rewards&&<><div className="reward-stats"><strong>{rewards.games} matches</strong><strong>{rewards.wins} wins</strong><strong>{rewards.xp} quest XP</strong><strong>Level {level[1]} · {level[2]}</strong></div>
   <h3>Your daily & weekly quests</h3><p>One of each, using the original rewards. Daily reset: midnight UTC. Weekly reset: Monday midnight UTC.</p><div className="reward-quests">{rewards.quests.map(q=><article key={q.period}><p className="eyebrow">{q.period==='day'?'DAILY':'WEEKLY'}</p><h3>{q.title}</h3><p>{q.metric==='elements'?'Win with different elements':q.title==='Flawless Victory'?'Win without losing a controller':q.title==='Duelist'?'Win multiplayer matches':q.title==='Devoted Player'?'Complete matches':'Win matches'}</p><progress max={q.target} value={q.progress}/><p>{q.progress}/{q.target} · {q.credited?'Reward received':'In progress'}</p><strong>+{q.tokens} tokens · +{q.xp} XP</strong><p>Resets {new Date(q.ends_at).toLocaleString()}</p></article>)}</div>
   <h3>Recent match rewards</h3>{rewards.recent.length?<ul>{rewards.recent.map(r=><li key={r.match_id}>{r.mode==='ai'?'Solo':'Multiplayer'} · {r.result} · +{r.tokens} tokens <small>{new Date(r.occurred_at).toLocaleString()}</small></li>)}</ul>:<p>Finish your first match to start your reward history.</p>}</>}
  {!rewards&&<p>Sign in to view your quests and match history.</p>}<p role="status">{notice}</p>
 </section>;
}
