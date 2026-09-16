import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Diamond, Swords, BookOpen, Volume2, VolumeX, X, Sparkles } from 'lucide-react';
import { cards, elements, newMatch, outcome, performMove, resolveChoice, cancelChoice, abilityList, cardCost, runAITurn } from './rulesEngine.js';
import { definitions, interpretations } from './cardAbilities.js';
import { DEFAULT_RULES } from './catalog.js';
import './practice.css';

const colors = { fire: '#f4a261', cryo: '#88d9f5', blood: '#ec708c', wind: '#89d4bb', earth: '#b4bd7f', water: '#82aaff', shadow: '#bf9ee8', light: '#edda97', electric: '#e5cd66' };
function Card({ card, instance, onClick, selected, ready, onInspect, onAbility, cost }) {
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const [damage, setDamage] = useState(0);
  const previousHealth = useRef(instance?.currentCH);
  useEffect(() => {
    const lost = (previousHealth.current ?? instance?.currentCH) - instance?.currentCH;
    previousHealth.current = instance?.currentCH;
    if (!(lost > 0)) return;
    setDamage(lost);
    const timer = setTimeout(() => setDamage(0), 800);
    return () => clearTimeout(timer);
  }, [instance?.currentCH]);
  const isUnit = ['creature', 'controller'].includes(card.card_type);
  const statuses = Object.keys(instance?.statuses || {});
  return <motion.div layout={!reduced} initial={reduced ? false : { opacity: 0, y: 25, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className={`duel-card ${selected ? 'selected' : ''} ${ready ? 'ready' : ''}`} style={{ '--element': colors[card.element] || '#d1c6ad' }}>
    <button className="card-face" onClick={onClick} aria-label={`${card.name}, ${cost ?? card.cost} shards${isUnit ? `, ${instance?.currentAP ?? card.ap} attack, ${instance?.currentCH ?? card.ch} health` : `, ${card.card_type}`}`}>
      {!failed && card.image_url && <img src={card.image_url} alt="" onError={() => setFailed(true)} />}
      <span className="card-fallback"><Diamond size={42} /></span><span className="card-cost">{cost ?? card.cost}</span>
      <span className="card-caption"><strong>{card.name}</strong><span>{isUnit ? <b>⚔ {instance?.currentAP ?? card.ap}</b> : <b>✦</b>}<small>{card.card_type === 'creature' ? card.element : card.card_type}</small>{isUnit && <b>♥ {instance?.currentCH ?? card.ch}</b>}</span></span>
    </button>
    <button className="card-info" aria-label={`Inspect ${card.name}`} onClick={() => onInspect(cards.find(c => c.id === card.id) || card)}>i</button>
    {onAbility && <button className="ability-button" onClick={onAbility} aria-label={`Abilities of ${card.name}`}><Sparkles size={13} /></button>}
    {statuses.length > 0 && <span className="unit-statuses" title={statuses.join(', ')}>{statuses.slice(0, 2).join(' · ')}</span>}
    {damage > 0 && <span className="damage-number">−{damage}</span>}
  </motion.div>;
}
function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const previous = document.activeElement; ref.current?.focus(); return () => previous?.focus?.(); }, []);
  function keydown(e) {
    if (e.key === 'Escape') { e.stopPropagation(); onClose?.(); }
    if (e.key !== 'Tab') return;
    const items = [...ref.current.querySelectorAll('button:not(:disabled), input, select, a[href]')];
    if (!items.length) { e.preventDefault(); return; }
    if (e.shiftKey && (document.activeElement === items[0] || document.activeElement === ref.current)) { e.preventDefault(); items.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
  }
  return <div className="modal-backdrop"><section ref={ref} tabIndex={-1} onKeyDown={keydown} className={`fate-modal ${wide ? 'wide-modal' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
    {onClose && <button className="modal-close" aria-label="Close" onClick={onClose}><X /></button>}{children}
  </section></div>;
}
export default function Practice({ remote = null }) {
  const [element, setElement] = useState('fire');
  const [enemy, setEnemy] = useState('cryo');
  const [controller, setController] = useState('Draco Alec');
  const [enemyController, setEnemyController] = useState('CyRelli Princess');
  const [game, setGame] = useState(null);
  const [selection, setSelection] = useState(null);
  const [inspect, setInspect] = useState(null);
  const [abilityUnit, setAbilityUnit] = useState(null);
  const [help, setHelp] = useState(false);
  const [library, setLibrary] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [notice, setNotice] = useState('');
  const [effect, setEffect] = useState(null);
  const [sound, setSound] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [localBusy, setBusy] = useState(false);
  const busy = remote ? remote.busy || !game?.isMyTurn : localBusy;
  useEffect(() => {
    if (!remote?.game) return;
    setGame(remote.game); setSelection(null); setAbilityUnit(null);
    setElement(remote.element); setEnemy(remote.enemy);
    setNotice(remote.game.pendingChoice?.prompt || (remote.game.waitingForChoice ? "Waiting for a choice…" : remote.game.isMyTurn ? "Your move." : "Rival’s turn."));
    if (remote.game.lastEffect) setEffect({ ...remote.game.lastEffect, id: remote.version });
  }, [remote?.game, remote?.version]);
  const generation = useRef(0);
  const audio = useRef(null);
  const winner = game ? remote ? game.result : outcome(game) : null;
  useEffect(() => () => { generation.current++; audio.current?.close(); }, []);
  useEffect(() => { if (!effect) return; const timer = setTimeout(() => setEffect(null), 850); return () => clearTimeout(timer); }, [effect]);
  function pulse(text, kind = 'summon') {
    setEffect({ text, kind, id: Date.now() });
    if (!sound) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    audio.current ||= new Audio(); const ctx = audio.current; void ctx.resume();
    const tone = ctx.createOscillator(); const gain = ctx.createGain(); tone.connect(gain); gain.connect(ctx.destination);
    tone.frequency.setValueAtTime(kind === 'attack' ? 150 : 440, ctx.currentTime); tone.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + .25);
    gain.gain.setValueAtTime(.06, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .3); tone.start(); tone.stop(ctx.currentTime + .3);
  }
  function begin() { if (remote) { remote.leave(); return; } generation.current++; setBusy(false); setGame(newMatch(element, enemy, controller, enemyController)); setSelection(null); setInspect(null); setAbilityUnit(null); setNotice('Draw a card to begin your turn.'); pulse('The duel begins'); }
  function leave() { if (remote) { remote.leave(); return; } generation.current++; setBusy(false); setGame(null); setSelection(null); setAbilityUnit(null); }
  async function runOpponent(state) {
    if (state.isMyTurn || state.pendingChoice || outcome(state)) return;
    const token = ++generation.current; setBusy(true);
    try {
      const result = await runAITurn(state, { delayMs: 450, difficulty, cancelled: () => generation.current !== token, onStep(next) {
        if (generation.current !== token) return;
        setGame(next); setNotice(next.log.at(-1) || 'Opponent is thinking…');
        if (next.lastEffect) pulse(next.lastEffect.text || 'Effect resolved', next.lastEffect.kind);
      } });
      if (generation.current !== token) return;
      setGame(result.nextState);
      setNotice(result.nextState.pendingChoice ? 'Choose how to resolve the reaction.' : 'Your turn. Draw a card.');
    } catch (error) { if (generation.current === token) setNotice(`Could not resolve the opponent’s move: ${error.message}`); }
    finally { if (generation.current === token) setBusy(false); }
  }
  function accept(next) {
    setGame(next); setSelection(null); setAbilityUnit(null);
    if (next.pendingChoice) { setNotice(next.pendingChoice.prompt); return; }
    setNotice(next.log.at(-1) || 'Action resolved.');
    if (next.lastEffect) pulse(next.lastEffect.text || 'Effect resolved', next.lastEffect.kind);
    void runOpponent(next);
  }
  function move(action) {
    if (!game || busy || winner || !game.isMyTurn || game.pendingChoice || game.waitingForChoice) return;
    if (remote) { void remote.act(action); return; }
    try { accept(performMove(game, action)); } catch (error) { setNotice(error.message); }
  }
  function choose(id) { if (remote) { if (!remote.busy) void remote.act({ type: "choice", id }); return; } try { accept(resolveChoice(game, id)); } catch (error) { setGame(cancelChoice(game)); setNotice(error.message); } }
  function unitClick(unit) {
    if (busy || winner || game.pendingChoice) return;
    if (selection?.type === 'attack') { move({ type: 'attack', source: selection.uid, target: unit.uid }); return; }
    if (unit.side === 'playerState' && game.phase === 'combat') { setSelection({ type: 'attack', uid: unit.uid }); setNotice('Choose an enemy unit to attack.'); }
    else if (unit.side === 'playerState' && abilityList(unit).length && game.phase === 'main') setAbilityUnit(unit);
    else setInspect(unit.card);
  }
  function selectCard(card, index) {
    if (busy || winner || game.pendingChoice) return;
    if (game.phase !== 'main') { setNotice('Play cards during the main phase.'); return; }
    if (card.card_type === 'creature') { setSelection({ type: 'hand', index }); setNotice('Choose an empty creature slot. Entry abilities resolve next.'); }
    else move({ type: 'play', index });
  }
  const hero = cards.find(c => c.name === controller) || cards.find(c => c.element === element && c.card_type === 'controller');
  const shown = cards.filter(c => (filter === 'all' || c.element === filter) && `${c.name} ${c.description} ${c.card_type}`.toLowerCase().includes(query.toLowerCase()));
  const panel = unit => <Card key={unit.uid} card={unit.card} instance={unit} onInspect={setInspect}
    ready={unit.side === 'playerState' && game.phase === 'combat' && unit.canAttack && !busy}
    selected={selection?.uid === unit.uid} onClick={() => unitClick(unit)}
    onAbility={unit.side === 'playerState' && abilityList(unit).length ? () => setAbilityUnit(unit) : null} />;
  return <div className="fate-app" style={{ '--accent': colors[element] }}>
    <header className="fate-header"><button className="brand" onClick={leave}><Diamond /><span>FATEBOUND<small>SHARDS OF DOMINION</small></span></button>
      <div className="header-tools"><span className="practice-badge">{remote ? "INVITE DUEL" : "SOLO ARENA"}</span><button aria-label={sound ? 'Mute effects' : 'Enable sound effects'} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={19} /> : <VolumeX size={19} />}</button><button onClick={() => setLibrary(true)}><BookOpen size={18} /><span> Card library</span></button><button onClick={() => setHelp(true)}>Rules</button><a href="/multiplayer">Multiplayer</a><a href="/login">Account</a></div>
    </header>
    {!game ? <main className="lobby"><section className="lobby-copy"><div className="eyebrow">THE ARENA AWAITS</div><h1>Choose your fate.<br /><em>Claim dominion.</em></h1><p>Command your creatures. Cast your spells. Equip powerful artifacts and claim the battlefield.</p>
      <div className="mode-summary"><Swords /><div><strong>A duel of elements</strong><span>187 cards · Spells, artifacts & special abilities</span></div></div>
      <div className="deck-label">01 <span>CHOOSE YOUR ELEMENT</span></div><div className="element-grid">{elements.map(e => <button key={e} aria-pressed={e === element} className={e === element ? 'active' : ''} style={{ '--choice': colors[e] }} onClick={() => { setElement(e); setController(cards.find(c => c.element === e && c.card_type === 'controller').name); }}><Diamond size={15} />{e}</button>)}</div>
      <div className="lobby-options"><label>Your controller<select value={controller} onChange={e => setController(e.target.value)}>{cards.filter(c => c.element === element && c.card_type === 'controller').map(c => <option key={c.id}>{c.name}</option>)}</select></label></div>
      <div className="lobby-options"><label>Opponent<select value={enemy} onChange={e => { setEnemy(e.target.value); setEnemyController(cards.find(c => c.element === e.target.value && c.card_type === 'controller').name); }}>{elements.map(e => <option key={e}>{e}</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={e => setDifficulty(e.target.value)}>{['easy', 'medium', 'hard'].map(e => <option key={e}>{e}</option>)}</select></label></div>
      <div className="lobby-options"><label>Opponent controller<select value={enemyController} onChange={e => setEnemyController(e.target.value)}>{cards.filter(c => c.element === enemy && c.card_type === 'controller').map(c => <option key={c.id}>{c.name}</option>)}</select></label></div>
      <button className="primary enter" onClick={begin}>Enter the arena <ArrowRight size={20} /></button><p className="scope-note">Solo rules preview. Review the Rules guide and each card’s interpretation notes for timing defaults and reaction handling.</p>
    </section><section className="hero-display"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-card"><Card key={hero.id} card={hero} onClick={() => setInspect(hero)} onInspect={setInspect} /></div><div className="hero-caption"><span>YOUR CONTROLLER</span><h2>{hero.name}</h2><p>{element} dominion</p></div></section></main> :
    <main className="arena-layout"><section className="arena ability-arena"><div className="arena-top"><button onClick={leave}><ArrowLeft size={16} /> Leave duel</button><span>THE SHATTERED SANCTUM</span>{remote ? <button disabled={remote.busy || !!winner} onClick={() => remote.act({ type: "concede" })}>Concede</button> : <button onClick={begin}>Restart</button>}</div>
      {['opponentState', 'playerState'].map(side => { const state = game[side]; const mine = side === 'playerState'; return <section className={`army ${mine ? 'friendly' : 'enemy'}`} key={side}>
        <div className="army-header"><strong>{mine ? 'You' : 'The challenger'} <small>{mine ? element : enemy}</small></strong><span><Diamond size={14} /> {state.shards} shards <span className="muted">· {state.deckCount ?? state.deck.length} in deck · {state.handCount ?? state.hand.length} in hand · {state.graveyard.length} fallen</span></span></div>
        <div className="battle-row"><div className="controller-zone">{state.controllers.filter(Boolean).map(panel)}<small>CONTROLLER</small></div><div className="creature-row"><AnimatePresence>{state.creatures.map((unit, i) => unit ? panel(unit) : <button key={`empty-${i}`} className={`empty-slot ${mine && selection?.type === 'hand' ? 'available' : ''}`} aria-label={`${mine ? 'Summon to' : 'Enemy empty'} slot ${i + 1}`} onClick={() => mine && selection?.type === 'hand' && move({ type: 'play', index: selection.index, slot: i })}><Diamond /><span>{mine && selection?.type === 'hand' ? 'SUMMON' : `0${i + 1}`}</span></button>)}</AnimatePresence></div></div>
        <div className="support-row"><span>ARTIFACTS</span>{state.artifacts.map((unit, i) => unit ? <button key={unit.uid} className="support-card" onClick={() => setInspect(unit.card)}><span>◆ {unit.card.name}</span><small>{unit.target ? [...state.creatures, ...state.controllers].find(u => u?.uid === unit.target)?.card.name || 'Marked' : 'Field artifact'}</small></button> : <span className="support-empty" key={i}>◇</span>)}</div>
        <div className="support-row"><span>SPELLS</span>{state.spells.map((unit, i) => unit ? <button key={unit.uid} className="support-card spell" onClick={() => setInspect(unit.card)}><span>✦ {unit.card.name}</span><small>Persistent</small></button> : <span className="support-empty" key={i}>·</span>)}{state.reaction && <span className="reaction-label">↩ {state.reaction.name} ready</span>}</div>
        {mine && state.controllers.some(u => u?.card.name === 'Shadow Master') && state.graveyard.some(c => c.element === 'shadow' && c.card_type === 'spell') && <div className="graveyard-casts">Cast from discard (+1 shard): {state.graveyard.map((card, index) => card.element === 'shadow' && card.card_type === 'spell' && <button key={`${card.id}-${index}`} onClick={() => move({ type: 'play', index, fromGraveyard: true })}>{card.name}</button>)}</div>}
      </section>; })}
      <div className="turn-strip">{busy ? 'OPPONENT’S TURN' : 'YOUR TURN'} · {game.turnNumber} <span>{game.phase.toUpperCase()} PHASE</span></div>
      <AnimatePresence>{effect && <motion.div key={effect.id} className={`battle-effect ${effect.kind}`} initial={{ opacity: 0, scale: .7 }} animate={{ opacity: [0, 1, 0], scale: [.7, 1, 1.1] }} transition={{ duration: .85 }}><Sparkles /><span>{effect.text}</span></motion.div>}</AnimatePresence>
      <section className="hand-zone"><div className="hand-title">YOUR HAND <span>{game.playerState.hand.length} CARDS · CLICK SPELLS / ARTIFACTS TO PLAY</span></div><div className="hand-cards"><AnimatePresence>{game.playerState.hand.map((card, i) => <Card key={card.instanceId || `${i}-${card.id}`} card={card} cost={(remote ? card.displayCost : cardCost(game, 'playerState', card))} onInspect={setInspect} selected={selection?.type === 'hand' && selection.index === i} ready={!busy && game.phase === 'main' && game.playerState.shards >= (remote ? card.displayCost : cardCost(game, 'playerState', card))} onClick={() => selectCard(card, i)} />)}</AnimatePresence></div></section>
    </section><aside className="duel-sidebar"><div className="eyebrow">DUEL STATUS</div><h2>{winner || (busy ? 'Rival’s turn' : 'Your move')}</h2><div className="phase-list">{['draw', 'energy', 'main', 'combat'].map((phase, i) => <div className={game.phase === phase ? 'current' : ''} key={phase}><span>0{i + 1}</span>{phase}<Diamond size={12} /></div>)}</div>
      <button className="primary" disabled={busy || !!winner || !!game.pendingChoice || game.waitingForChoice || !game.isMyTurn} onClick={() => move({ type: 'advance' })}>{({ draw: 'Draw card', energy: 'Gain a shard', main: 'Begin combat', combat: 'End turn' })[game.phase]}<ArrowRight size={17} /></button><p className="notice" role="status">{notice}</p>{selection && <button onClick={() => setSelection(null)}>Cancel selection</button>}<div className="log-heading">BATTLE LOG</div><div className="battle-log">{game.log.slice(-15).reverse().map((line, i) => <p key={`${i}-${line}`}>{line}</p>)}</div><p className="scope-note">✦ on a unit opens its activated abilities. Inspect cards for printed text and rule notes.</p>
    </aside></main>}
    {game?.pendingChoice && !winner && <Modal title={game.pendingChoice.prompt} wide onClose={(remote || game.pendingChoice.auto) ? undefined : () => { setGame(cancelChoice(game)); setNotice('Action cancelled; no costs paid.'); }}><div className="eyebrow">RESOLVE EFFECT</div><h2>{game.pendingChoice.prompt}</h2><p>Choose below. Costs are committed only when the whole action resolves.</p><div className="choice-grid">{game.pendingChoice.options.map(option => <button key={option.id} onClick={() => choose(option.id)}>{option.card?.image_url && <img src={option.card.image_url} alt="" />}<span>{option.label}</span></button>)}</div></Modal>}
    {abilityUnit && !game?.pendingChoice && <Modal title={`${abilityUnit.card.name} abilities`} onClose={() => setAbilityUnit(null)}><div className="eyebrow">ACTIVATED ABILITIES</div><h2>{abilityUnit.card.name}</h2><p>{abilityUnit.card.description}</p>{abilityList(abilityUnit).map((ab, index) => <button className="ability-action" disabled={busy || game.phase !== 'main' || !game.isMyTurn || abilityUnit.used[index]} key={ab.label} onClick={() => move({ type: 'ability', source: abilityUnit.uid, index })}><strong>{ab.label}</strong><span>{ab.cost || 0} shards{ab.ch ? ` + ${ab.ch} controller CH` : ''} · {abilityUnit.used[index] ? 'Used this turn' : 'Once per turn'}</span></button>)}</Modal>}
    {winner && <Modal title={winner} onClose={leave}><div className="eyebrow">DUEL COMPLETE</div><h2>{winner}</h2><p>{winner === 'Victory' ? 'Your opponent’s controller has fallen.' : winner === 'Draw' ? 'Both controllers fell in battle.' : 'Your controller has fallen. Try a different strategy.'}</p><button className="primary" onClick={begin}>Play again</button><button onClick={leave}>Choose another deck</button></Modal>}
    {library && !inspect && <Modal title="Card ability library" wide onClose={() => setLibrary(false)}><div className="eyebrow">THE COMPLETE COLLECTION</div><h2>Card ability library</h2><div className="library-filters"><input aria-label="Search cards and abilities" placeholder="Search names, abilities, or card types…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter by element" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All elements</option>{elements.map(e => <option key={e}>{e}</option>)}</select></div><p>{shown.length} of {cards.length} cards</p><div className="library-list">{shown.map(card => <button key={card.id} onClick={() => setInspect(card)}><strong>{card.name}<small>{card.element} · {card.card_type} · {card.cost} shards</small></strong><span>{card.description}</span></button>)}</div></Modal>}
    {inspect && <Modal title={inspect.name} onClose={() => setInspect(null)}><div className="eyebrow">{inspect.id}</div><h2>{inspect.name}</h2><p>{inspect.element} · {inspect.card_type} · {inspect.cost} shards</p>{inspect.image_url && <img className="inspect-image" src={inspect.image_url} alt={inspect.name} />}<p>{inspect.description}</p>{definitions[inspect.name]?.active?.map(ab => <p key={ab.label}><strong>{ab.label}</strong> — {ab.cost || 0} shards{ab.ch ? `, ${ab.ch} CH` : ''}; once per turn.</p>)}{interpretations[inspect.name] && <p className="interpretation-note">Rule interpretation: {interpretations[inspect.name]}</p>}</Modal>}
    {help && <Modal title="How to play" onClose={() => setHelp(false)}><div className="eyebrow">QUICK START</div><h2>A shard of strategy.</h2><ol><li>Draw a card, then gain one shard. Unspent shards carry over.</li><li>In main phase, select a creature and an empty slot. Click spells or artifacts to cast or equip, then choose targets in the effect dialog.</li><li>Click the ✦ button on your units to activate abilities. Each activated ability can be used once per owner turn.</li><li>In combat, select your unit and an enemy. Glowing units can attack. Attack shield creatures first, then other creatures, then controllers. Only creatures with Stealth can bypass this order. Attacks unlock on turn 3.</li><li>Artifacts and persistent spells remain in their own rows. Status badges show affected units. Destroy every enemy controller to win.</li></ol><h3>Approved rule defaults</h3>{DEFAULT_RULES.map(rule => <p key={rule}>{rule}</p>)}<h3>Reaction timing in this preview</h3><p>Wind Mirage and Ink Cloud are prepared during main phase, then intercept the next qualifying attack. There is no general instant-speed response stack yet.</p><button className="primary" onClick={() => setHelp(false)}>Understood</button></Modal>}
  </div>;
}

