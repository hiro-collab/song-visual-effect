# Shared Note

## Project Intent

Build a web-based interactive music effect for MaouDamashii "Shining Star" using local music assets, lyrics, and Songle/TextAlive-style analysis data.

## Current Material Status

- Workspace: `C:\Users\kawai\works\music-effect`
- Existing source folder: `music_src`
- New portable song package folder: `song-packs/shining-star`
- Existing lyrics file: `music_src/Lyrics.txt`
- The lyrics text is UTF-8. Be careful not to corrupt Japanese text when reading or editing.
- Songle JSON has been downloaded into `music_src/analysis` and copied into `song-packs/shining-star/analysis`.
- Current adjusted lyric timing data is committed at `music_src/analysis/lyrics_timing.json`.

## Songle Source

Songle page:

https://songle.jp/songs/www.youtube.com%2Fwatch%3Fv=Qd01-6xVSHk

Likely REST JSON endpoints via Songle Widget API:

- `https://widget.songle.jp/api/v1/song.json?url=www.youtube.com%2Fwatch%3Fv%3DQd01-6xVSHk`
- `https://widget.songle.jp/api/v1/song/beat.json?url=www.youtube.com%2Fwatch%3Fv%3DQd01-6xVSHk`
- `https://widget.songle.jp/api/v1/song/chord.json?url=www.youtube.com%2Fwatch%3Fv%3DQd01-6xVSHk`
- `https://widget.songle.jp/api/v1/song/melody.json?url=www.youtube.com%2Fwatch%3Fv%3DQd01-6xVSHk`
- `https://widget.songle.jp/api/v1/song/chorus.json?url=www.youtube.com%2Fwatch%3Fv%3DQd01-6xVSHk`

Use downloaded JSON as timing input. Do not analyze the audio file itself.

Important license safety note from user:

- MaouDamashii music must not be used for AI training.
- Do not ask Codex or code to analyze the audio waveform.
- The app may play the audio in the browser, but timing should be driven by downloaded Songle/TextAlive JSON, lyrics text, and manual markers.

## Visual Direction

- Soft, warm, bright light.
- Avoid hard, high-contrast binary cyber visuals.
- Use grayscale/midtones, gradients, blur, damping, and ramped color filters.
- Use moving points connected by timed lines as soft light rays.
- Let color and light follow music events with damping instead of exact hard jumps.

## Cyber Basic Techniques In This Example

- Control: continuous values, damping, brightness/particle/line/blur control.
- Parallel: layered rendering for background glow, ramp color filter, points/lines, particles, lyrics.
- Wiring: connect dynamic points with lines at musical or timed triggers.

## Live Performance Direction

The user wants this to become usable in live/event contexts:

- Sequence bar and song position overview.
- BPM display/control.
- Fine timing adjustment for live performance drift.
- Keyboard operation to switch effect mood during the event.
- Color options/presets to match the venue mood.

Current priority: build the base system first, then add those live controls iteratively.

## Runtime / Song Package Separation

Design principle from user:

- The system server must not constrain each song's application or performance design.
- It should provide helpers only: transport, frame loop, input, asset loading, storage, fullscreen, and optional timing tools.
- Song-specific meaning, materials, timing, credits, and effect intent belong to the song package.
- If another runtime is better for a song, the package should allow that. Web, TouchDesigner, Unity, OBS, or another system should be possible through adapters.

Current implementation direction:

- `manifest.json` is the song package entrypoint.
- The system can load a song with `?song=<manifest-url>`.
- `song-packs` can be served separately with CORS by `npm run dev:songs`.
- Existing `music_src` remains as a compatibility public directory for the current Vite app.
- Next architectural step after manifest loading: move Shining Star specific effect wiring into a web adapter, leaving the system host thinner.

## Manual Lyric Timing

- Manual lyric timing is captured from keyboard input only. It must not analyze the audio waveform.
- The `Lyric Timing` panel toggles capture mode on/off.
- In capture mode, `A` stamps the current lyric line boundary; `D` stamps the next lyric line boundary.
- Manual keyframes autosave to `localStorage`, apply immediately, support undo/clear, and export as `lyrics_timing.manual.json`.
- Lyric timing adjustments now have a visual sequence bar. Pale ghost dots show raw timing; bright stones show adjusted timing. Lyrics switch from the adjusted stone positions immediately, without reloading JSON.
- Shift controls are button-based: `All` moves every lyric stone, and `From #n` moves the current lyric line and later stones.
- The sequence bar is also a playback scrubber: click or drag it to seek the current playback/internal clock without reloading.
- Space toggles playback except while a text/input control is focused.
- For bundled reuse, place the exported JSON at `music_src/analysis/lyrics_timing.json`.
