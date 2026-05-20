# Effect Design

## Concept

This effect treats the song as a soft field of light. It should feel warm, bright, and gently expanding, not like a hard high-contrast cyberpunk display.

## Cyber Basic Techniques

Control:

- Use continuous values for brightness, color, line width, blur, particle count, and lyric emphasis.
- Make changes follow targets through damping instead of jumping immediately.

Parallel:

- Draw independent layers for background glow, ramp color filters, moving nodes, light lines, particles, lyrics, and UI.
- Let the layers overlap through alpha and additive blending.

Wiring:

- Move points through the scene.
- Connect selected pairs at musical timing points.
- Treat these connections as soft light rays.

## Timing

- Beat events raise glow targets and trigger short light-line emphasis.
- Chorus sections increase brightness, density, and motion range.
- Lyrics are read from the UTF-8 text file and distributed over the song duration when no timed lyric JSON is present.
- The audio file itself must not be analyzed or used for AI training. The browser may play the audio, but visual timing should come from JSON/text/manual markers.

## Palette

Use warm white, pale gold, soft rose, pale blue, and quiet gray-violet shadow. Avoid saturated neon blue as the main color.
