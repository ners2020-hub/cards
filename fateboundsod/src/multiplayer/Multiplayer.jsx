import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { cards, elements } from '../practice/catalog';
import Practice from '../practice/Practice';
import '../practice/practice.css';
import './multiplayer.css';

async function call(body) {
  const { data, error } = await supabase.functions.invoke('multiplayer', { body });
  if (error) {
    let payload;
    try { payload = await error.context?.json(); } catch { /* Network errors have no response. */ }
    const failure = new Error(payload?.error || 'Connection interrupted. Retry the request.');
    failure.current = payload?.current;
    failure.definitive = error.context?.status >= 400 && error.context?.status < 500;
    throw failure;
  }
  return data;
}
function Multiplayer() {
  const { user, loading, signInWithEmailAndPassword, signUpWithEmailAndPassword, signInWithGoogle, signOut } = useAuth();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [element, setElement] = useState('fire'), [controller, setController] = useState('Draco Alec');
  const [invite, setInvite] = useState(() => new URLSearchParams(location.hash.slice(1)).get('invite') || sessionStorage.getItem('fatebound.oauthInvite') || '');
  const [share, setShare] = useState(''), [room, setRoom] = useState(null), [matches, setMatches] = useState([]);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [connected, setConnected] = useState(false);
  const [opponentOnline, setOpponentOnline] = useState(false), [report, setReport] = useState(''), [reportOpen, setReportOpen] = useState(false);
  const pending = useRef(null), lock = useRef(false), currentId = useRef(null);
  const accept = useCallback(next => {
    if (currentId.current && next.id !== currentId.current) return;
    setRoom(old => old?.id === next.id && old.version > next.version ? old : next);
  }, []);
  const refresh = useCallback(async () => {
    if (!currentId.current) return;
    accept(await call({ op: 'get', id: currentId.current }));
  }, [accept]);
  const list = useCallback(async () => { const r = await call({ op: 'list' }); setMatches(r.matches); }, []);
  useEffect(() => { if (user) list().catch(e => setNotice(e.message)); else { currentId.current = null; setRoom(null); setMatches([]); pending.current = null; } }, [user?.id, list]);
  useEffect(() => {
    if (!room?.id || !user) return;
    let disposed = false;
    const channel = supabase.channel(`match:${room.id}`, { config: { private: true, presence: { key: user.id } } });
    const update = () => refresh().catch(e => { if (!disposed) setNotice(e.message); });
    channel.on('broadcast', { event: 'changed' }, update)
      .on('presence', { event: 'sync' }, () => setOpponentOnline(Object.keys(channel.presenceState()).some(id => id !== user.id)));
    void supabase.realtime.setAuth().then(() => {
      if (disposed) return;
      channel.subscribe(async status => {
        if (disposed) return;
        setConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') { await channel.track({ online: true }); update(); }
      });
    }).catch(() => { if (!disposed) setConnected(false); });
    // Recovery when background tabs or interrupted sockets miss a notification.
    const timer = setInterval(update, 15000);
    window.addEventListener('online', update); window.addEventListener('focus', update);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener('online', update); window.removeEventListener('focus', update); void supabase.removeChannel(channel); };
  }, [room?.id, user?.id, refresh]);
  useEffect(() => {
    if (!user) return;
    const id = new URLSearchParams(location.search).get('match') || sessionStorage.getItem('fatebound.oauthMatch');
    sessionStorage.removeItem('fatebound.oauthInvite');
    sessionStorage.removeItem('fatebound.oauthMatch');
    if (id) { currentId.current = id; refresh().catch(e => { currentId.current = null; setNotice(e.message); }); }
  }, [user?.id, refresh]);
  async function run(fn) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setNotice('');
    try { await fn(); } catch (e) { if (e.current) accept(e.current); if (e.current || e.definitive) pending.current = null; setNotice(e.message); }
    finally { lock.current = false; setBusy(false); }
  }
  async function googleSignIn() {
    sessionStorage.setItem('fatebound.oauthInvite', invite);
    sessionStorage.setItem('fatebound.oauthMatch', new URLSearchParams(location.search).get('match') || '');
    await signInWithGoogle();
  }
  function open(next) {
    currentId.current = next.id; pending.current = null; setRoom(next);
    history.replaceState(null, '', `/multiplayer?match=${next.id}`);
  }
  function leave() { currentId.current = null; setRoom(null); pending.current = null; setShare(''); setConnected(false); history.replaceState(null, '', '/multiplayer'); void list().catch(e => setNotice(e.message)); }
  async function act(action) {
    await run(async () => {
      // Keep the exact envelope after a lost response so retries cannot apply twice.
      pending.current ||= { op: 'action', id: room.id, expectedVersion: room.version, actionId: crypto.randomUUID(), action };
      const next = await call(pending.current); pending.current = null; accept(next);
    });
  }
  if (loading) return <main className="mp-shell">Opening your account…</main>;
  if (!user) return <main className="mp-shell"><a href="/">← Solo arena</a><h1>Invite a rival.</h1><p>Sign in to create a private duel or use a friend’s invite.</p><form onSubmit={e => { e.preventDefault(); void run(() => signInWithEmailAndPassword(email, password)); }}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" autoComplete="current-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /></label><button disabled={busy}>Sign in</button><button type="button" disabled={busy || !email || password.length < 8} onClick={() => run(async () => { const result = await signUpWithEmailAndPassword(email, password); if (!result.session) setNotice('Check your email to confirm your account, then return here to sign in.'); })}>Create account</button></form><button type="button" disabled={busy} onClick={() => run(googleSignIn)}>Continue with Google</button><p role="status">{notice}</p></main>;
  const mine = room?.seat === 'playerState' ? room?.hostDeck : room?.guestDeck;
  const theirs = room?.seat === 'playerState' ? room?.guestDeck : room?.hostDeck;
  return <>
    {room?.game && <Practice remote={{ matchId: room.id, game: { ...room.game, log: room.history.map(e => `Turn ${e.turn} · ${e.actor === room.seat ? 'You' : 'Rival'}: ${e.type}${e.pending ? ' (choosing)' : ''}`) }, version: room.version, busy: busy || !!pending.current, element: mine.element, enemy: theirs.element, act, leave }} />}
    <section className={room?.game ? 'mp-status' : 'mp-shell'}>
      {!room?.game && <><a href="/">← Solo arena</a><a href="/store">Card store →</a><h1>Invite-only multiplayer</h1><p>Balanced rules 0.4 · Fixed test decks · Private two-player rooms</p><button onClick={() => run(signOut)}>Sign out</button></>}
      {room && <p>{connected ? 'Live updates connected' : 'Reconnecting; checking for updates'} · {opponentOnline ? 'Rival online' : 'Rival offline'} · Version {room.version}</p>}
      <p role="status">{notice}</p>
      {pending.current && <button disabled={busy} onClick={() => act(pending.current.action)}>Retry last action</button>}
      {!room && <><div className="mp-deck"><label>Element<select value={element} onChange={e => { setElement(e.target.value); setController(cards.find(c => c.element === e.target.value && c.card_type === 'controller').name); }}>{elements.map(e => <option key={e}>{e}</option>)}</select></label><label>Controller<select value={controller} onChange={e => setController(e.target.value)}>{cards.filter(c => c.element === element && c.card_type === 'controller').map(c => <option key={c.id}>{c.name}</option>)}</select></label></div>
        <button disabled={busy} onClick={() => run(async () => { const code = crypto.randomUUID().replaceAll('-', ''); const next = await call({ op: 'create', id: crypto.randomUUID(), invite: code, deck: { element, controller } }); setShare(`${location.origin}/multiplayer#invite=${code}`); open(next); })}>Create invite room</button>
        <form onSubmit={e => { e.preventDefault(); void run(async () => { const code = invite.includes('#invite=') ? invite.split('#invite=')[1] : invite.trim(); open(await call({ op: 'join', invite: code, deck: { element, controller } })); }); }}><label>Friend’s invite link or code<input required value={invite} onChange={e => setInvite(e.target.value)} /></label><button disabled={busy}>Join duel</button></form>
        <h2>Your recent rooms</h2>{matches.map(m => <button className="mp-room" key={m.id} disabled={busy} onClick={() => run(async () => open(await call({ op: 'get', id: m.id })))}>{m.host_deck.element} / {m.guest_deck?.element || 'waiting'} · {m.status} · {m.id.slice(0, 8)}</button>)}</>}
      {room?.status === 'waiting' && <><h2>Waiting for your rival</h2><p>Your selected deck: {room.hostDeck.element} / {room.hostDeck.controller}. Invites expire after 24 hours.</p>{share ? <><label>Private invite<input readOnly value={share} /></label><button onClick={() => run(async () => { await navigator.clipboard.writeText(share); setNotice('Invite copied.'); })}>Copy invite</button><p>Save this link now. The server stores only its hash.</p></> : <p>Use the invite you saved when creating this room, or create a new room.</p>}<button onClick={leave}>Back to rooms</button></>}
      {room && <><button onClick={() => setReportOpen(!reportOpen)}>Report a bug</button>{reportOpen && <form onSubmit={e => { e.preventDefault(); void run(async () => { await call({ op: 'report', id: room.id, reportId: crypto.randomUUID(), description: report }); setReport(''); setReportOpen(false); setNotice('Report saved with match version and public history.'); }); }}><label>What happened?<textarea required maxLength={2000} value={report} onChange={e => setReport(e.target.value)} /></label><button disabled={busy}>Send report</button></form>}</>}
    </section>
  </>;
}
export default function MultiplayerApp() { return <AuthProvider><Multiplayer /></AuthProvider>; }
