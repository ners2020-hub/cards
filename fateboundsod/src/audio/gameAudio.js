// Original procedural score and effects. No downloaded samples or audio service.
const KEY = 'fatebound.audio.v1';
const defaults = { enabled: false, muted: false, music: 35, effects: 65 };
let settings = { ...defaults };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
  for (const key of ['enabled', 'muted']) if (typeof saved[key] === 'boolean') settings[key] = saved[key];
  for (const key of ['music', 'effects']) if (Number.isFinite(saved[key])) settings[key] = Math.max(0, Math.min(100, saved[key]));
} catch { /* Storage can be unavailable in private browsing. */ }
let ctx, master, music, effects, timer, nextBar = 0, bar = 0, battle = false;
const listeners = new Set(), voices = new Set();
export const getAudioSettings = () => settings;
export function subscribeAudio(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function gains() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(settings.enabled && !settings.muted ? 0.7 : 0, t, .04);
  music.gain.setTargetAtTime(battle ? 0 : settings.music / 100, t, .35);
  effects.gain.setTargetAtTime(settings.effects / 100, t, .03);
}
export function setAudioSettings(patch) {
  settings = { ...settings, ...patch };
  for (const key of ['music', 'effects']) settings[key] = Math.max(0, Math.min(100, Number(settings[key]) || 0));
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Optional persistence. */ }
  gains(); listeners.forEach(fn => fn());
}
export function setBattleAudio(active) { battle = active; gains(); }
function voice(source, gain, bus, start, duration, level, attack = .008) {
  source.connect(gain); gain.connect(bus);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(level, start + attack);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  voices.add(source);
  source.onended = () => { voices.delete(source); source.disconnect(); gain.disconnect(); };
  source.start(start); source.stop(start + duration + .02);
}
function tone(freq, duration, level, start, bus = effects, type = 'sine', end = freq, attack = .008) {
  const osc = ctx.createOscillator(); osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), start + duration);
  voice(osc, ctx.createGain(), bus, start, duration, level, attack);
}
let noiseBuffer;
function noise(duration, level, start, frequency = 1200, end = 300) {
  const source = ctx.createBufferSource(); source.buffer = noiseBuffer; source.loop = true;
  const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = .8;
  filter.frequency.setValueAtTime(frequency, start); filter.frequency.exponentialRampToValueAtTime(end, start + duration);
  source.connect(filter);
  const gain = ctx.createGain(); filter.connect(gain); gain.connect(effects);
  gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(level, start + .008);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  voices.add(source); source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  source.start(start); source.stop(start + duration);
}
// Eight slow bars in D minor, with a suspended pad and sparse bell melody.
const chords = [[146.83,220,293.66],[130.81,196,261.63],[116.54,174.61,233.08],[130.81,196,293.66]];
const melody = [587.33,440,523.25,392,466.16,349.23,392,440];
function scheduleMusic() {
  if (!ctx || ctx.state !== 'running') return;
  if (nextBar < ctx.currentTime) nextBar = ctx.currentTime + .1;
  while (nextBar < ctx.currentTime + 1) {
    const t = nextBar, chord = chords[Math.floor(bar / 2) % chords.length];
    chord.forEach((f, i) => {
      tone(f, 5.6, .045, t, music, 'sine', f, 1.3);
      tone(f * 1.002, 5.4, .018, t, music, 'triangle', f * 1.002, 1.5);
      if (i === 0) tone(f / 2, 5.7, .05, t, music, 'sine', f / 2, 1);
    });
    tone(melody[bar % 8], 2.8, .045, t + 1.2, music);
    tone(melody[(bar + 3) % 8], 2.4, .022, t + 3.2, music);
    nextBar += 4.8; bar++;
  }
}
export async function unlockAudio() {
  if (!settings.enabled) return false;
  try {
    if (!ctx) {
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return false;
      ctx = new Audio(); master = ctx.createGain(); music = ctx.createGain(); effects = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12; limiter.ratio.value = 8;
      music.connect(master); effects.connect(master); master.connect(limiter); limiter.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      gains();
    }
    await ctx.resume();
    if (!timer) { nextBar = ctx.currentTime + .08; scheduleMusic(); timer = setInterval(scheduleMusic, 250); }
    return ctx.state === 'running';
  } catch { return false; }
}
export function stopEffects() {
  // Cancel queued voices when leaving a match; the lobby score restarts gently.
  if (!ctx) return;
  effects.gain.cancelScheduledValues(ctx.currentTime); effects.gain.setValueAtTime(0, ctx.currentTime);
  for (const source of voices) { try { source.stop(); } catch { /* Already ended. */ } }
  nextBar = ctx.currentTime + .1; gains();
}
export function pauseAudio() { if (timer) clearInterval(timer); timer = null; stopEffects(); if (ctx) void ctx.suspend().catch(() => {}); }
export function playSound(kind, element = '') {
  if (!ctx || ctx.state !== 'running' || !settings.enabled || settings.muted || !settings.effects || globalThis.document?.hidden) return;
  const t = ctx.currentTime + .005;
  if (kind === 'attack') { noise(.45, .2, t, 600, 2400); return; }
  if (kind === 'impact') { tone(110, .3, .25, t, effects, 'sine', 38); noise(.18, .2, t, 1300, 180); return; }
  if (kind === 'draw') { noise(.16, .09, t, 2800, 900); tone(660, .2, .045, t + .06); return; }
  if (kind === 'turn') { [392,523.25].forEach((f,i) => tone(f,.6,.07,t+i*.18)); return; }
  if (kind === 'victory' || kind === 'defeat') {
    (kind === 'victory' ? [293.66,369.99,440,587.33] : [293.66,261.63,220,146.83]).forEach((f,i) => tone(f,1.4,.1,t+i*.22,effects,'triangle')); return;
  }
  if (kind === 'spell' || kind === 'spellImpact') {
    const hit = kind === 'spellImpact', d = hit ? .5 : .85;
    if (['fire','blood'].includes(element)) { noise(d,.22,t,hit?1600:400,hit?200:2200); tone(90,d,.12,t,effects,'triangle',45); }
    else if (['cryo','water'].includes(element)) { [880,1174,1760].forEach((f,i)=>tone(f,d,.06,t+i*.06,effects,'sine',f*(hit?.7:1.2))); noise(.2,.07,t,4000,1800); }
    else if (element === 'electric') { for(let i=0;i<4;i++) noise(.07,.17,t+i*.07,4000,900); tone(180,.4,.07,t,effects,'sawtooth',70); }
    else if (element === 'earth') { tone(75,d,.2,t,effects,'triangle',35); noise(d,.17,t,500,90); }
    else if (element === 'wind') noise(d,.2,t,hit?2400:500,hit?500:3000);
    else if (element === 'shadow') { tone(146.83,d,.1,t,effects,'triangle',55); tone(155.56,d,.08,t,effects,'sine',60); }
    else [440,659.25,880].forEach((f,i)=>tone(f,1,.065,t+i*.08,effects,'sine',hit?f:f*1.5));
    return;
  }
  // Summons and artifacts have a warm, ascending resonance.
  [146.83,293.66,440].forEach((f,i)=>tone(f,.7,.07,t+i*.1,effects,'triangle'));
}
