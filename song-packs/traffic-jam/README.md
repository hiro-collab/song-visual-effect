# Traffic Jam Song Pack

This is the planning package for 煮ル果実「トラフィック・ジャム」.

It was started from system-neutral project documents only. Existing `song-packs/*`
were not used as templates.

## Contents

- `manifest.json`: minimal entry that the fixture player can load for checks.
- `design/effect-direction.md`: effect direction for the future interactive visual.
- `design/reimplementation-brief.md`: song-specific redo notes for replacing the rejected visual adapter attempt.
- `analysis/*.json`: Songle Widget API data and project-owned visual cue notes.
- `CREDITS.md`: source links and attribution notes.

## Current Handling

- The visual adapter from `codex/traffic-jam-effect` commit `81876a7 Add traffic jam visual adapter` is not adopted.
- If `npm run sync:check` reports that branch/commit, do not merge it for this song.
- The redo constraints and scene direction live in `design/reimplementation-brief.md`.

## Next Work

- Decide simple object assets such as low-poly cars, signals, signs, arrows, or silhouettes.
- Build any Traffic Jam-specific app/adapter as song-owned code, separate from `system/kit`.
- Add manual markers later for strong kick/blow moments, responsibility-shifting lyric pressure, and interlude enter/return points.

## Safety Notes

- Audio files are not included.
- Full lyrics are not included.
- The Songle JSON files are public timing references, not fresh audio analysis.
- Exact kick/blow and lyric-emphasis anchors should be added manually later.

## Local Preview

After starting the dev manager with `npm run dev`, the fixture player can load the
manifest at:

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/traffic-jam/manifest.json
```

The current player renderer is still a fixture renderer, so this preview is only
for validating loading and timing data until a song-specific adapter is created.
