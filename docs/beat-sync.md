# Beat Sync Kit

Beat sync is a system-kit helper for reading beat state from a normalized beat
grid. It is not a song renderer, tap-alignment controller, DOM widget, or
Songle JSON parser.

The goal is to let a song app opt into beat-aware behavior without making the
system host decide how that song should look.

## Responsibilities

`system/kit/beatSync.ts` does:

- accept a current time source
- accept normalized beat objects
- apply an optional offset in seconds
- return current beat state
- report source metadata such as `Analysis beats` or `Fallback beats`

It does not:

- fetch external URLs
- parse a specific service's JSON shape
- analyze audio files or waveforms
- save files
- touch DOM, Canvas, or song-specific renderer code

## Basic Use

```ts
import { createBeatSyncReader } from "../../system/kit";

const beatSync = createBeatSyncReader({
  getTime: () => transport.currentTime(),
  beats: musicMap.beats,
  offset: 0,
  source: {
    label: musicMap.warnings.includes("beat fallback") ? "Fallback beats" : "Analysis beats",
    isFallback: musicMap.warnings.includes("beat fallback")
  }
});

const state = beatSync.update();
```

`state` contains:

- `beatIndex`
- `beat`
- `nextBeat`
- `phase` from `0..1`
- `beatHit`
- `estimatedBpm`
- `source`
- `rawTime`, `time`, and `offset`

Use `getBeatSyncState()` directly when a pure function is easier than a
stateful reader.

## Beat Input

The kit expects beat objects that are already normalized into the project beat
shape:

```ts
type Beat = {
  time: number;
  duration: number;
  position?: number;
  bpm?: number;
};
```

Times are seconds. Beat arrays should be sorted by `time`, although
`normalizeBeatGrid()` can sanitize and sort a copy.

Song-specific JSON formats remain outside this module. A song package or thin
adapter should map Songle, hand-authored, or other beat data into `Beat[]`
before calling the kit.

## Fixture Player Tool

The fixture player mounts a minimal optional monitor from
`examples/fixture-player/tools/beatStateTool.ts`. It shows:

- source label
- current beat
- next beat
- phase
- estimated BPM
- hit/listening state

The tool is diagnostic only. It does not alter playback, lyrics, visual timing,
or song renderer behavior.

## Safety

- Do not analyze audio waveform data.
- Do not use music files for AI training.
- Pass beat data from existing JSON, manual input, or song-owned adapters.
- Keep tap alignment and feedback control as a separate optional layer.
