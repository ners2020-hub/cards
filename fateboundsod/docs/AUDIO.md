# Fatebound audio

The first soundtrack is an original procedural ambient composition: eight slow bars in D minor with layered pads and sparse bells, repeating every 38.4 seconds. It is synthesized locally with Web Audio; no external music service, samples, or audio downloads are used.

Open **Enable audio** at the bottom left, then enable sound. Music and effects have independent volume controls and a master mute. Preferences persist on this browser. Audio requires a player gesture, pauses in hidden tabs, and music fades out during matches. Test buttons preview an attack impact and an ice spell.

Playback cues include attack movement and impact, elemental spell casts and impacts, summons/artifacts, drawing, your turn, victory, and defeat. Spell cards use their declared element; abilities without element metadata use the neutral magic cue. Multitarget spells play one impact cue to avoid excessive layering. Effects respect reduced-motion playback and cancel when a match is left.

Implementation: `src/audio/gameAudio.js`, `AudioControls.jsx`, and the battle playback hook. No gameplay rules or server protocols changed. Validate synthesis scheduling and preferences with `node scripts/test-audio.mjs`. Sound character and mix still benefit from player listening feedback across speakers and headphones.
