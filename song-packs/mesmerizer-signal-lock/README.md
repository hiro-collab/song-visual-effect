# Mesmerizer Signal Lock

Song-owned effect pack for `mesmerizer-signal-lock`.

## Contents

- `manifest.json`: song-pack manifest for the fixture player.
- `references.json`: URL-only source and reception reference metadata.
- `analysis/`: Songle timing JSON used for song metadata, beat, chord, melody, and chorus.
- `design/visual-brief.md`: visual direction for this song.
- `design/cues.json`: palette, section, and stage-display cues.
- `design/emotion-map.json`: song-owned time map for energy, motion, tension, brightness, release, and inferred vocal gesture cues.
- `design/composition-map.json`: song-owned time map for screen subject, camera distance, subject occupancy, and display mode.
- `adapter.ts`: Three.js 3D live-stage adapter registered as `song:mesmerizer-signal-lock`.
- `credits.md`: source, license, asset, and dependency notes.

## Adapter

The adapter renders a bright daytime outdoor cyber live venue with MV-inspired
vivid contrast: cyan, magenta, acid green, yellow, white display text, and deep
ink outlines. Verse sections move into a close composition built around large
focus/sync cards, hypnosis-eye markings, and a small SOS/no-signal display. Chorus
sections open back out to the live venue with the main rear display, side-wall
sky displays, dark stage/runway geometry, lighting truss, moving-head fixtures,
sunlit haze planes, floor LED grid, signal towers, and audience glow sticks.
Songle beat, melody, and chorus data are available for display cuts, motif
motion, light hits, camera energy, and venue brightness.
`design/emotion-map.json` keeps the next control layer separate: it maps the
timeline into visual energy, motion, tension, brightness, release, and
interpretive vocal-gesture cues without reading or analyzing audio waveform data.
The adapter samples this map at runtime so each beat reacts more strongly or
quietly depending on the section's excitement and tension.
`design/composition-map.json` controls the larger screen layout: close two-motif
verse shots, central hypnotic lock shots, wide chorus venue shots, a distinct
control/signal interlude display, rebuild graphics, and a pulled-back release
outro. This keeps scene identity separate from beat intensity, so each section
can change what the viewer is meant to look at.
The 3D scene also has composition-specific overlay layers: lock rings for the
hypnotic fixation scene, a scan curtain for the interlude control surface,
chorus side ribbons for the wide show, and pale afterimage planes for the drop
and outro.

Same-build local registration is handled through `song-packs/local-adapters.ts`.
Do not add a direct import for this song to `examples/fixture-player/adapters/registry.ts`.

## Safety Notes

This pack does not include audio, full lyrics, images, video, 3D models, external
textures, secrets, symlinks, or junctions. The visual venue is generated in code.
See `credits.md` for Songle data sizes and dependency license notes.
