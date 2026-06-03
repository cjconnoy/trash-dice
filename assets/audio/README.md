# Trash Dice Audio Assets

## trash-dice-ambient-alpha

Standalone render of the Alpha Complete ambient music loop.

- Source: `releases/alpha-complete/index.html`
- Source commit: `dc5a995`
- Generator: `tools/render-trash-dice-ambient.js`
- Render path: headless Chrome `OfflineAudioContext`
- Loop length: 4 bars at 132 BPM, about 7.273 seconds
- Sample rate: 48 kHz stereo
- Randomness: fixed render seed for detune/noise choices

Files:

- `trash-dice-ambient-alpha.wav` - WAV master at the original in-game music mix level.
- `trash-dice-ambient-alpha.mp3` - MP3 web playback candidate.
- `trash-dice-ambient-alpha.ogg` - OGG/Vorbis web playback candidate.
- `trash-dice-ambient-alpha.metadata.json` - generation metadata.

Regenerate:

```powershell
node .\tools\render-trash-dice-ambient.js
```

This asset extraction intentionally does not modify `index.html`, `trash-dice.html`, or the frozen Alpha Complete release files. Any future runtime swap should keep SFX separate, lazy-start music from a real user gesture, and preserve mobile audio unlock behavior.
