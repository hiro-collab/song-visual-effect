import type { Beat } from "./types";

export type BeatSyncSource = {
  label: string;
  isFallback?: boolean;
  detail?: string;
};

export type BeatSyncFrameInput = {
  time: number;
  beats: readonly Beat[];
  offset?: number;
  source?: string | BeatSyncSource;
  previousBeatIndex?: number | null;
  hitWindow?: number;
};

export type BeatSyncReaderOptions = {
  getTime: () => number;
  beats: readonly Beat[];
  offset?: number | (() => number);
  source?: string | BeatSyncSource;
  hitWindow?: number;
};

export type BeatSyncState = {
  rawTime: number;
  time: number;
  offset: number;
  beatIndex: number;
  beat: Beat | null;
  nextBeat: Beat | null;
  phase: number;
  isNearBeat: boolean;
  didEnterBeat: boolean;
  estimatedBpm: number | null;
  source: BeatSyncSource;
};

const DEFAULT_HIT_WINDOW = 0.08;
const DEFAULT_SOURCE: BeatSyncSource = { label: "beats" };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const finiteOr = (value: number | undefined, fallback: number) => (
  typeof value === "number" && Number.isFinite(value) ? value : fallback
);

export const normalizeBeatSyncSource = (source: string | BeatSyncSource | undefined): BeatSyncSource => {
  if (!source) return { ...DEFAULT_SOURCE };
  return typeof source === "string" ? { label: source } : { ...source };
};

export const normalizeBeatGrid = (beats: readonly Beat[]) => {
  const sorted = beats
    .filter((beat) => Number.isFinite(beat.time))
    .map((beat) => ({
      ...beat,
      duration: Math.max(0.001, finiteOr(beat.duration, 0.48))
    }))
    .sort((a, b) => a.time - b.time);

  return sorted.map((beat, index) => {
    const next = sorted[index + 1];
    const previous = sorted[index - 1];
    const inferredDuration = next
      ? next.time - beat.time
      : previous
        ? beat.time - previous.time
        : beat.duration;
    return {
      ...beat,
      duration: Math.max(0.001, finiteOr(inferredDuration, beat.duration))
    };
  });
};

export const estimateBeatBpm = (beat: Beat | null, nextBeat: Beat | null) => {
  if (beat?.bpm && Number.isFinite(beat.bpm)) return beat.bpm;
  const interval = nextBeat ? nextBeat.time - (beat?.time ?? 0) : beat?.duration;
  return interval && interval > 0 ? 60 / interval : null;
};

export const getBeatSyncState = (input: BeatSyncFrameInput): BeatSyncState => {
  const rawTime = finiteOr(input.time, 0);
  const offset = finiteOr(input.offset, 0);
  const time = rawTime + offset;
  const beats = normalizeBeatGrid(input.beats);
  const source = normalizeBeatSyncSource(input.source);
  const hitWindow = Math.max(0, finiteOr(input.hitWindow, DEFAULT_HIT_WINDOW));

  if (!beats.length) {
    return {
      rawTime,
      time,
      offset,
      beatIndex: -1,
      beat: null,
      nextBeat: null,
      phase: 0,
      isNearBeat: false,
      didEnterBeat: false,
      estimatedBpm: null,
      source
    };
  }

  let lo = 0;
  let hi = beats.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (beats[mid].time <= time) lo = mid + 1;
    else hi = mid - 1;
  }

  const beatIndex = Math.max(-1, hi);
  const beat = beatIndex >= 0 ? beats[beatIndex] : null;
  const nextBeat = beats[beatIndex + 1] ?? null;
  const interval = beat
    ? Math.max(0.001, nextBeat ? nextBeat.time - beat.time : beat.duration)
    : Math.max(0.001, nextBeat.time);
  const phase = beat ? clamp01((time - beat.time) / interval) : 0;
  const timeSinceBeat = beat ? time - beat.time : Number.POSITIVE_INFINITY;
  const enteredBeat =
    typeof input.previousBeatIndex === "number" &&
    beatIndex >= 0 &&
    beatIndex > input.previousBeatIndex;

  return {
    rawTime,
    time,
    offset,
    beatIndex,
    beat,
    nextBeat,
    phase,
    isNearBeat: timeSinceBeat >= 0 && timeSinceBeat <= hitWindow,
    didEnterBeat: enteredBeat,
    estimatedBpm: estimateBeatBpm(beat, nextBeat),
    source
  };
};

export const createBeatSyncReader = (options: BeatSyncReaderOptions) => {
  let previousBeatIndex: number | null = null;

  return {
    update(): BeatSyncState {
      const offset = typeof options.offset === "function" ? options.offset() : options.offset;
      const state = getBeatSyncState({
        time: options.getTime(),
        beats: options.beats,
        offset,
        source: options.source,
        previousBeatIndex,
        hitWindow: options.hitWindow
      });
      previousBeatIndex = state.beatIndex;
      return state;
    },
    reset() {
      previousBeatIndex = null;
    }
  };
};
