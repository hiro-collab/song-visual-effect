# Traffic Jam Redo

`traffic-jam` is a song-owned visual app for "トラフィック・ジャム" by 煮ル果実.
This redo replaces the earlier placeholder analysis/design bundle with a
projector-oriented 3D traffic scene.

## Runtime

- Manifest: `manifest.json`
- Visual adapter: `adapter.ts`
- Effect timing/design: `design/effect.json`
- Lightweight analysis used by the effect: `analysis/markers.json`,
  `analysis/palette.json`
- Vehicle model list: `assets/vehicle-proxies.json`

The fixture player loads this adapter through the same-build registry in
`song-packs/local-adapters.ts`. The adapter asks the host for Three.js through
`SongAppServices.loadThree` and falls back to Canvas-drawn vehicles if WebGL or
GLB loading is unavailable.

## Preview

Use the fixture player with this song manifest:

```text
http://127.0.0.1:5273/?song=http://127.0.0.1:5274/traffic-jam/manifest.json&previewTime=45
```

`previewTime` is optional. It is useful for checking the first chorus quickly.

## Beat Data

This package currently does not include `analysis/beat.json`.

Any beat-related host UI or debug state is therefore using fallback beats only.
That is enough to check wiring, rendering, and loop behavior, but it is not a
quality signal for musical synchronization. Add a traffic-jam-specific beat grid
before judging timing feel. Do not derive that grid by analyzing the audio
waveform in this repository.

## Assets

Vehicle models are a curated subset of Kenney Car Kit 3.1:

- Source: https://kenney.nl/assets/car-kit
- Creator: Kenney
- License: Creative Commons Zero (CC0)
- Local source archive: `_asset_sources/kenney_car-kit.zip`
- Commit policy: the source archive is ignored; only the curated GLB subset,
  texture, README, and license text are committed.

The committed Kenney subset is 11 GLB vehicle models plus one shared texture and
license/source notes. Unused GLBs from the downloaded kit were removed before
commit.

## Dependency And Audit Notes

The GLB vehicle layer uses:

- `three` 0.184.0, MIT license
- `@types/three` 0.184.1, MIT license

Audit command run on 2026-05-23 JST:

```text
npm audit --audit-level=moderate
found 0 vulnerabilities
```

## Removed Placeholder Analysis

The earlier `analysis/beat.json`, `analysis/chord.json`, `analysis/chorus.json`,
`analysis/melody.json`, `analysis/song.json`, `analysis/visual-cues.json`, and
`design/effect-direction.md` were placeholder/brief-era files from before the
song-owned adapter existed. They are intentionally not referenced by the new
manifest. The redo keeps only the analysis files consumed by the adapter and the
structured `design/effect.json`.
