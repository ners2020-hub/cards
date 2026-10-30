import { useEffect, useState, useSyncExternalStore } from 'react';
import { getAudioSettings, subscribeAudio, setAudioSettings, unlockAudio, pauseAudio, playSound } from './gameAudio';
import './audio.css';

export default function AudioControls() {
  const settings = useSyncExternalStore(subscribeAudio, getAudioSettings);
  const [open, setOpen] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const resume = () => { if (!document.hidden) void unlockAudio(); };
    const visibility = () => document.hidden ? pauseAudio() : resume();
    window.addEventListener('pointerdown', resume); window.addEventListener('keydown', resume);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('pointerdown', resume); window.removeEventListener('keydown', resume); document.removeEventListener('visibilitychange', visibility); pauseAudio(); };
  }, []);
  async function enable() {
    setAudioSettings({ enabled: true, muted: false });
    setError(await unlockAudio() ? '' : 'Audio could not start. Try again in a supported browser.');
  }
  return <aside className="audio-controls" aria-label="Game audio">
    {open && <div className="audio-panel" id="audio-panel">
      <div className="audio-title"><strong>Sound & music</strong><button aria-label="Close audio settings" onClick={() => setOpen(false)}>×</button></div>
      <p>Lobby music: Babad. Elemental effects in battle.</p>
      {!settings.enabled ? <button onClick={enable}>Enable audio</button> : <button onClick={() => { setAudioSettings({ muted: !settings.muted }); void unlockAudio(); }}>{settings.muted ? 'Unmute all audio' : 'Mute all audio'}</button>}
      <label>Music <output>{settings.music}%</output><input aria-label="Music volume" type="range" min="0" max="100" value={settings.music} onChange={e => setAudioSettings({ music: +e.target.value })} /></label>
      <label>Effects <output>{settings.effects}%</output><input aria-label="Effects volume" type="range" min="0" max="100" value={settings.effects} onChange={e => setAudioSettings({ effects: +e.target.value })} /></label>
      <div className="audio-preview"><button onClick={async () => { await enable(); playSound('impact'); }}>Test attack</button><button onClick={async () => { await enable(); playSound('spell', 'cryo'); }}>Test spell</button></div>
      {error && <p role="alert">{error}</p>}
    </div>}
    <button className="audio-toggle" aria-expanded={open} aria-controls="audio-panel" onClick={() => setOpen(!open)}>{!settings.enabled ? '♫ Enable audio' : settings.muted ? '♫ Audio muted' : '♫ Audio'}</button>
  </aside>;
}
