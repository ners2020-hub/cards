import { useEffect, useRef, useState } from 'react';
import { Diamond, ArrowLeft, Sparkles, Layers, Lock, Check, Gift } from 'lucide-react';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { cards, elements, hasElement } from '../practice/catalog';
import { PACKS, UNLOCKS, ELEMENT_COLORS } from './catalog';
import '../practice/practice.css';
import './store.css';
import RewardsPanel from './RewardsPanel';
const byId=Object.fromEntries(cards.map(c=>[c.id,c]));
async function request(body) {
 const {data,error}=await supabase.functions.invoke('store',{body});
 if(error){let response;try{response=await error.context?.json();}catch{/* A lost response can be retried with the same ID. */}
  const e=new Error(response?.error||'Connection interrupted. Retry to check your purchase.');
  e.definitive=!!error.context&&error.context.status>=400&&error.context.status<500;throw e;}
 return data;
}
function CollectionCard({card,quantity,rarity}) {
 const [failed,setFailed]=useState(false);
 return <article className="store-card" style={{'--card-accent':ELEMENT_COLORS[card.element]}}>
  <div className="store-card-art"><Diamond aria-hidden="true" />{card.image_url&&!failed&&<img src={card.image_url} alt="" loading="lazy" onError={()=>setFailed(true)}/>}<span>{card.cost} shards</span>{quantity!==undefined&&<b>×{quantity}</b>}</div>
  <div className="store-card-copy"><small>{card.element} · {card.card_type} · {rarity||'common'}</small><h3>{card.name}</h3>{['controller','creature'].includes(card.card_type)&&<p className="store-stats">{card.ap} attack <span> / </span> {card.ch} health</p>}<p>{card.description}</p></div>
 </article>;
}
function Store() {
 const {user,loading,signInWithGoogle,signInWithEmailAndPassword,signUpWithEmailAndPassword,signOut}=useAuth();
 const [account,setAccount]=useState(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[tab,setTab]=useState(new URLSearchParams(location.search).get('tab') === 'rewards' ? 'rewards' : 'packs');
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[promo,setPromo]=useState(''),[query,setQuery]=useState(''),[element,setElement]=useState('all');
 const [reveal,setReveal]=useState(null),[pending,setPending]=useState(null);
 const lock=useRef(false),generation=useRef(0);
 const pendingKey=user?`fatebound.store.pending.${user.id}`:null;
 useEffect(()=>{
  const current=++generation.current;setAccount(null);setReveal(null);setNotice('');setPending(null);
  if(!user)return;
  try{const saved=JSON.parse(sessionStorage.getItem(`fatebound.store.pending.${user.id}`)||'null');if(saved&&['pack','unlock','promo'].includes(saved.op)&&typeof saved.requestId==='string'&&typeof saved.item==='string')setPending(saved);}catch{/* Ignore invalid local pending state. */}
  request({op:'get'}).then(data=>{if(current===generation.current)setAccount(data);}).catch(e=>{if(current===generation.current)setNotice(e.message);});
  return ()=>{generation.current++;};
 },[user?.id]);
 async function run(fn){if(lock.current)return;lock.current=true;setBusy(true);setNotice('');try{await fn();}catch(e){setNotice(e.message);}finally{lock.current=false;setBusy(false);}}
 async function buy(op,item,retry=null){await run(async()=>{
  const body=retry||{op,item,requestId:crypto.randomUUID()};
  setPending(body);sessionStorage.setItem(pendingKey,JSON.stringify(body));
  try {const next=await request(body);setAccount(next);if(next.adminUnlocked)setPromo('');setPending(null);sessionStorage.removeItem(pendingKey);
   if(next.cards.length)setReveal({cards:next.cards,title:op==='promo'?'Your rewards':'Your new cards'});
   setNotice(next.adminUnlocked?'Admin tools unlocked for your account. Open Admin tools above.':op==='unlock'?'Deck unlocked.':op==='promo'?`Promo redeemed. ${Math.max(0,-next.cost)} tokens added.`:'Five cards added to your collection.');
  }catch(e){if(e.definitive){setPending(null);sessionStorage.removeItem(pendingKey);}throw e;}
 });}
 const ownedCount=Object.values(account?.owned||{}).reduce((sum,n)=>sum+n,0);
 const collection=cards.filter(c=>(account?.owned?.[c.id]||0)>0&&(element==='all'||hasElement(c,element))&&`${c.name} ${c.description}`.toLowerCase().includes(query.toLowerCase()));
 return <div className="fate-app store-app">
  <header className="fate-header"><a className="brand" href="/"><Diamond size={28}/><span>FATEBOUND<small>SHARDS OF DOMINION</small></span></a><nav className="header-tools" aria-label="Game navigation"><a href="/">Arena</a><a href="/multiplayer">Multiplayer</a>{account?.isAdmin&&<a href="/admin">Admin tools</a>}{user&&<button disabled={busy||!!pending} onClick={()=>run(signOut)}>Sign out</button>}</nav></header>
  <main className="store-main"><a className="store-back" href="/"><ArrowLeft size={15}/> Back to the arena</a>
   <section className="store-intro"><div><p className="eyebrow">THE CARD STORE · BALANCE 0.4</p><h1>A little chance.<br/><em>A new possibility.</em></h1><p>Open a pack. Discover a favorite. Build your collection across the nine dominions.</p></div><div className="store-wallet"><Sparkles size={24}/><small>YOUR TOKENS</small><strong>{account?account.tokens.toLocaleString():'—'}</strong><span>{user?`${ownedCount} cards collected`:'100 starting tokens for new players'}</span></div></section>
   {loading?<p role="status">Opening your account…</p>:!user?<section className="store-login"><div><h2>Your collection starts here.</h2><p>Sign in to save cards and open packs. Tokens are in-game currency; this store does not charge real money.</p></div><form onSubmit={e=>{e.preventDefault();void run(()=>signInWithEmailAndPassword(email,password));}}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label><div className="store-actions"><button disabled={busy}>Sign in</button><button type="button" disabled={busy||!email||password.length<8} onClick={()=>run(async()=>{const r=await signUpWithEmailAndPassword(email,password);if(!r.session)setNotice('Check your email to confirm your account, then return here.');})}>Create account</button><button type="button" disabled={busy} onClick={()=>run(async()=>{sessionStorage.setItem('fatebound.afterAuth','/store');await signInWithGoogle();})}>Continue with Google</button></div></form></section>:!account?<section className="store-login"><p>Loading your tokens and collection…</p><button disabled={busy} onClick={()=>run(async()=>setAccount(await request({op:'get'})))}>Reload store</button></section>:null}
   <p className="store-notice" role="status" aria-live="polite">{notice}</p>
   {pending&&<section className="store-retry"><p>A purchase needs confirmation. Retry safely to retrieve its result without buying twice.</p><button disabled={busy} onClick={()=>buy(pending.op,pending.item,pending)}>Check purchase</button></section>}
   {reveal&&<section className="store-reveal" aria-label="Pack contents"><div className="store-section-heading"><div><p className="eyebrow">ADDED TO YOUR COLLECTION</p><h2>{reveal.title}</h2></div><button onClick={()=>setReveal(null)}>Done</button></div><div className="store-card-grid">{reveal.cards.map((id,i)=>byId[id]&&<CollectionCard key={`${id}-${i}`} card={byId[id]} rarity={account?.rarities[id]}/>)}</div></section>}
   <nav className="store-tabs" aria-label="Store sections">{[['packs','Packs'],['collection','My collection'],['decks','Deck unlocks'],['rewards','Rewards']].map(([id,label])=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>{id==='collection'&&<Layers size={16}/>}{label}</button>)}</nav>
   {tab==='rewards'&&<RewardsPanel rewards={account?.rewards} userId={user?.id} refresh={async()=>setAccount(await request({op:'get'}))}/>}
   {tab==='packs'&&<><div className="store-section-heading"><h2>Choose your grimoire</h2><span>5 random cards per pack · Duplicates possible</span></div><section className="store-packs">{PACKS.map((pack,i)=><article key={pack.id} className={`store-pack store-pack-${pack.id}`}><span className="store-pack-number">0{i+1}</span><div className="store-grimoire" aria-hidden="true"><div><Diamond size={64}/><Sparkles size={26}/></div><span>FATEBOUND</span></div><p className="eyebrow">{pack.tag}</p><h3>{pack.name}</h3><p>{pack.description}</p><button disabled={!account||busy||!!pending||account.tokens<pack.cost} onClick={()=>buy('pack',pack.id)}><Sparkles size={16}/>{busy?'Working…':`Open for ${pack.cost} tokens`}</button><details><summary>Card rarity odds</summary><ul>{Object.entries(pack.odds).map(([rarity,chance])=><li key={rarity}><span>{rarity}</span><b>{chance}%</b></li>)}</ul><p>Odds apply independently to each card. No rarity is guaranteed.</p></details></article>)}</section><section className="store-promo"><Gift size={28}/><div><h2>A gift from the dominions.</h2><p>Have a promo code? Redeem it for tokens or cards.</p></div><form onSubmit={e=>{e.preventDefault();void buy('promo',promo.trim().toUpperCase());}}><label className="sr-only" htmlFor="promo">Promo code</label><input id="promo" maxLength={80} placeholder="Enter promo code" value={promo} onChange={e=>setPromo(e.target.value)}/><button disabled={!account||busy||!!pending||!promo.trim()}>Redeem</button></form></section></>}
   {tab==='collection'&&<section><div className="store-section-heading"><h2>Your collection <small>{collection.length} unique cards</small></h2><div className="store-filters"><label className="sr-only" htmlFor="card-search">Search owned cards</label><input id="card-search" placeholder="Search your cards…" value={query} onChange={e=>setQuery(e.target.value)}/><label className="sr-only" htmlFor="card-element">Element</label><select id="card-element" value={element} onChange={e=>setElement(e.target.value)}><option value="all">All elements</option>{elements.map(el=><option key={el}>{el}</option>)}</select></div></div>{!collection.length&&<p className="store-empty">{account?'No cards match. Open a pack or change your filters.':'Sign in to view your saved collection.'}</p>}<div className="store-card-grid">{collection.map(card=><CollectionCard key={card.id} card={card} quantity={account.owned[card.id]} rarity={account.rarities[card.id]}/>)}</div>{account?.unmappedLegacyCount>0&&<p>{account.unmappedLegacyCount} legacy collection entries are preserved and awaiting a current card match.</p>}</section>}
   {tab==='decks'&&<section><div className="store-section-heading"><h2>Explore another dominion</h2><span>500 tokens + 5 qualifying wins</span></div><p className="store-subtle">Fire, Water, Earth and Wind are the starting dominions. Unlocks are saved to your collection. Solo practice and fixed multiplayer test decks remain available for every element.</p><div className="store-unlocks">{UNLOCKS.map(deck=>{const unlocked=account?.unlocked?.includes(deck.element);const wins=deck.requires?(account?.deckWins?.[deck.requires]||0):(account?.wins||0);return <article key={deck.element} style={{'--card-accent':ELEMENT_COLORS[deck.element]}}><Diamond size={28}/><h3>{deck.element}</h3><p>{deck.requires?`Win with ${deck.requires}`:'Win with any element'} · {Math.min(wins,5)}/5</p><progress value={Math.min(wins,5)} max={5}/><button disabled={!account||busy||!!pending||unlocked||wins<5||account.tokens<500} onClick={()=>buy('unlock',deck.element)}>{unlocked?<><Check size={15}/>Unlocked</>:<><Lock size={15}/>500 tokens</>}</button></article>;})}</div></section>}
   {account?.receipts?.length>0&&<details className="store-history"><summary>Recent purchases & rewards</summary><ul>{account.receipts.map(r=><li key={r.request_id}><span>{r.operation==='promo'?'Promo reward':`${r.item} ${r.operation==='pack'?'pack':'deck'}`}</span><time>{new Date(r.created_at).toLocaleString()}</time><b>{r.cost>0?'−':'+'}{Math.abs(r.cost)} tokens</b></li>)}</ul></details>}
   <footer className="store-footer"><Diamond size={14}/><span>Current balanced cards. Saved to your account.</span><a href="/multiplayer">Find your next duel →</a></footer>
  </main></div>;
}
export default function StoreApp(){return <AuthProvider><Store/></AuthProvider>;}
