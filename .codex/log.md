# Log

## 2026-05-10

- User wants to test a PoC using MaouDamashii "Shining Star".
- Current workspace only contains `music_src/Lyrics.txt` at the start.
- User noted that Songle JSON is not downloaded yet and should be downloadable from the related Songle URL.
- Confirmed via web docs that Songle Widget API exposes REST endpoints for song metadata and music maps such as beat, chord, melody, and chorus.
- Need to preserve UTF-8 when handling the existing lyrics text file.
- Next implementation direction:
  - Scaffold a Vite + TypeScript web app.
  - Keep `music_src` as source material and copy or expose assets under `public/music_src`.
  - Add scripts/docs for downloading Songle JSON into an analysis folder.
  - Build a local JSON-first timing loader.
  - Implement soft layered Canvas/Pixi-style visual effects with damping, ramps, moving nodes, light lines, particles, lyrics, and pointer/click interaction.
- User clarified live-use goals:
  - sequence bar, BPM, timing micro-adjustment for live performance,
  - keyboard mood switching,
  - optional color changes.
- Agreed to build the base system first, then layer those controls on top.
- User warned that music AI training is prohibited by license. Added explicit project note: do not analyze audio or use it for AI training; use JSON/text/manual markers only for timing.
- Implemented base system:
  - Vite + TypeScript app.
  - Canvas2D layered soft light renderer.
  - Songle JSON download script.
  - UTF-8 lyrics loader.
  - Songle beat/chorus parser with fallbacks.
  - Pointer attraction and click ripples.
  - Internal clock fallback when no audio file is present.
  - Projector-friendly minimal playback UI.
- Downloaded Songle JSON files into `music_src/analysis`.
- Verified `npm run build` passes.
- Started Vite dev server on `http://127.0.0.1:5173`.
- Browser verification:
  - Page renders nonblank.
  - Lyrics and controls are visible.
  - Play button works with internal clock when audio is not present.
  - `audio` element has no `src` when no valid audio content type is found.
  - Status currently says `rough lyrics` because timed lyric JSON is not present yet.
- Added manual lyric keyframe adjustment mode:
  - `Lyric Timing` panel toggles capture on/off.
  - `A` records the current lyric line's start time.
  - `D` records the next lyric line's start time.
  - Keyframes are saved to `localStorage`, applied immediately to the lyric display, undoable, clearable, and exportable as JSON.
  - The implementation uses playback time and lyric text only; it does not analyze audio or use music for AI learning.
- Added visual lyric sequence bar and button-based offset controls:
  - Pale ghost dots show pre-adjustment lyric switching times.
  - Bright stones show adjusted lyric switching times.
  - `All` moves every stone; `From #n` moves the current lyric line and later stones.
  - The active lyric display reads from adjusted stone timing immediately, so live adjustment does not require reloading JSON.
- Added sequence-bar seeking. Clicking or dragging the lyric sequence bar updates `audio.currentTime` when audio is loaded, or the internal playback clock when no audio source is present.
- Added Space key playback toggle, while preserving normal typing behavior when form controls are focused.

## 2026-05-20

- User asked to separate reusable system code from song-specific application code.
- Clarified design principle: the system server must be a helper runtime, not a controller that forces a song into one model. Other runtimes and adapters must remain possible.
- Before refactor, committed current adjusted lyric timing data:
  - `87c4c25 Add adjusted lyric timing data`
- Started manifest/song-package separation:
  - Added `music_src/manifest.json` for backward-compatible single-server use.
  - Added `song-packs/shining-star/manifest.json` for separate song-pack server use.
  - Copied lyrics and analysis JSON into `song-packs/shining-star`.
  - Added `CREDITS.md` and `design/cues.json`.
  - Added a Node static song-pack server with CORS support: `scripts/serve-song-packs.mjs`.
  - Added `npm run dev:system` and `npm run dev:songs`.
- Added workflow documentation inspired by JSON-driven app-flow maps:
  - `docs/workflows.html`
  - `docs/workflows.json`
- Added agent context documentation:
  - `AGENTS.md`
  - `docs/architecture.md`
  - `docs/module-map.md`
  - `docs/decisions.md`
  - `docs/plans.md`
  - `docs/known-issues.md`
  - `docs/handoff.md`
- Updated `README.md` with Workflow Map and Agent Context sections.

## 2026-05-20 Later

- The repository was shifted from a Shining Star-centered PoC toward a
  system-neutral host.
- New song authoring must start from `docs/system-overview.md` and
  `docs/song-authoring.md`, not from existing `song-packs/*`.
- `music_src` is obsolete; song package data lives under `song-packs/`.
- The dev manager starts/stops the system app and song-pack server together.
- `song-packs/traffic-jam/` was added as a planning package for 煮ル果実
  「トラフィック・ジャム」. It should not become a template for later songs.
