import assert from 'node:assert/strict';
let created = 0, started = 0, stopped = 0;
const values = [];
const param = () => ({ value: 0, setValueAtTime(v) { values.push(v); }, linearRampToValueAtTime(v) { values.push(v); }, exponentialRampToValueAtTime(v) { assert.ok(v > 0); values.push(v); }, setTargetAtTime(v) { values.push(v); }, cancelScheduledValues() {} });
class Node {
  gain = param(); frequency = param(); Q = param(); threshold = param(); ratio = param();
  connect() {} disconnect() {} start() { started++; } stop() { stopped++; }
}
globalThis.localStorage = { getItem: () => '{"music":500,"effects":-5}', setItem() {} };
globalThis.document = { hidden: false };
globalThis.AudioContext = class {
  constructor() { created++; }
  currentTime = 1; sampleRate = 100; state = 'suspended'; destination = new Node();
  createGain() { return new Node(); } createOscillator() { return new Node(); }
  createBufferSource() { return new Node(); } createBiquadFilter() { return new Node(); }
  createDynamicsCompressor() { return new Node(); }
  createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
  async resume() { this.state = 'running'; } async suspend() { this.state = 'suspended'; }
};
const audio = await import('../src/audio/gameAudio.js');
assert.equal(audio.getAudioSettings().music, 100);
assert.equal(audio.getAudioSettings().effects, 0);
assert.equal(await audio.unlockAudio(), false); assert.equal(created, 0);
audio.setAudioSettings({ enabled: true, effects: 65 });
assert.equal(await audio.unlockAudio(), true); assert.equal(created, 1);
for (const kind of ['attack','impact','draw','turn','summon','victory','defeat']) audio.playSound(kind);
for (const element of ['fire','cryo','blood','wind','earth','water','shadow','light','electric']) {
  audio.playSound('spell', element); audio.playSound('spellImpact', element);
}
assert.ok(started > 40); assert.ok(values.every(Number.isFinite));
let before = started;
audio.setAudioSettings({ muted: true }); audio.playSound('impact'); assert.equal(started, before);
audio.setAudioSettings({ muted: false }); document.hidden = true; audio.playSound('impact'); assert.equal(started, before);
document.hidden = false; audio.setBattleAudio(true); audio.stopEffects(); assert.ok(stopped > 0);
audio.pauseAudio(); audio.playSound('impact'); assert.equal(started, before);
console.log('PASS audio opt-in, volume bounds, all effect voices, mute, hidden-tab silence and cancellation.');
