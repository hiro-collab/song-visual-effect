export type VisualSequencerMode = "followRaw" | "freeRun";

export type VisualSequencerOptions = {
  initialTime?: number;
  offsetMs?: number;
  rate?: number;
  mode?: VisualSequencerMode;
  paused?: boolean;
};

export type VisualSequencerState = {
  schemaVersion: 1;
  rawTime: number;
  visualTime: number;
  offsetMs: number;
  rate: number;
  paused: boolean;
  mode: VisualSequencerMode;
  lastUpdatedAt: number | null;
};

export type VisualSequencerSnapshot = VisualSequencerState;

export type VisualSequencer = {
  update: (rawTime: number, nowMs: number) => VisualSequencerState;
  getState: () => VisualSequencerState;
  snapshot: () => VisualSequencerSnapshot;
  restore: (snapshot: VisualSequencerSnapshot) => VisualSequencerState;
  reset: () => VisualSequencerState;
  pause: () => VisualSequencerState;
  resume: () => VisualSequencerState;
  scrubTo: (time: number) => VisualSequencerState;
  nudge: (ms: number) => VisualSequencerState;
  setOffsetMs: (offsetMs: number) => VisualSequencerState;
  setRate: (nextRate: number) => VisualSequencerState;
  setMode: (nextMode: VisualSequencerMode) => VisualSequencerState;
  syncToRaw: (rawTime?: number, nowMs?: number) => VisualSequencerState;
};

const DEFAULT_MODE: VisualSequencerMode = "followRaw";

const finiteOr = (value: number | undefined | null, fallback: number) => (
  typeof value === "number" && Number.isFinite(value) ? value : fallback
);

const normalizeMode = (mode: VisualSequencerMode | undefined) => mode ?? DEFAULT_MODE;

export const createVisualSequencer = (options: VisualSequencerOptions = {}): VisualSequencer => {
  const hasExplicitInitialTime = Number.isFinite(options.initialTime);
  const initialTime = finiteOr(options.initialTime, 0);
  const initialOffsetMs = finiteOr(options.offsetMs, 0);
  const initialRate = finiteOr(options.rate, 1);
  const initialMode = normalizeMode(options.mode);
  const initialPaused = Boolean(options.paused);

  let rawTime = 0;
  let visualTime = hasExplicitInitialTime ? initialTime : initialOffsetMs / 1000;
  let rate = initialRate;
  let mode = initialMode;
  let paused = initialPaused;
  let lastUpdatedAt: number | null = null;
  let hasAnchor = false;

  const makeState = (): VisualSequencerState => ({
    schemaVersion: 1,
    rawTime,
    visualTime,
    offsetMs: (visualTime - rawTime) * 1000,
    rate,
    paused,
    mode,
    lastUpdatedAt
  });

  const setRawAnchor = (nextRawTime: number, nextNowMs?: number) => {
    rawTime = finiteOr(nextRawTime, rawTime);
    if (nextNowMs !== undefined) lastUpdatedAt = finiteOr(nextNowMs, lastUpdatedAt ?? 0);
    hasAnchor = true;
  };

  const restoreInitialState = () => {
    rawTime = 0;
    visualTime = hasExplicitInitialTime ? initialTime : initialOffsetMs / 1000;
    rate = initialRate;
    mode = initialMode;
    paused = initialPaused;
    lastUpdatedAt = null;
    hasAnchor = false;
  };

  return {
    update(nextRawTime: number, nowMs: number) {
      const resolvedRawTime = finiteOr(nextRawTime, rawTime);
      const resolvedNowMs = finiteOr(nowMs, lastUpdatedAt ?? 0);

      if (!hasAnchor) {
        rawTime = resolvedRawTime;
        if (!hasExplicitInitialTime) {
          visualTime = rawTime + initialOffsetMs / 1000;
        }
        lastUpdatedAt = resolvedNowMs;
        hasAnchor = true;
        return makeState();
      }

      if (!paused) {
        const delta =
          mode === "followRaw"
            ? resolvedRawTime - rawTime
            : Math.max(0, (resolvedNowMs - (lastUpdatedAt ?? resolvedNowMs)) / 1000);
        visualTime += delta * rate;
      }

      rawTime = resolvedRawTime;
      lastUpdatedAt = resolvedNowMs;
      return makeState();
    },

    getState: makeState,

    snapshot: makeState,

    restore(snapshot: VisualSequencerSnapshot) {
      rawTime = finiteOr(snapshot.rawTime, rawTime);
      visualTime = finiteOr(snapshot.visualTime, visualTime);
      rate = finiteOr(snapshot.rate, rate);
      paused = Boolean(snapshot.paused);
      mode = normalizeMode(snapshot.mode);
      lastUpdatedAt = snapshot.lastUpdatedAt === null ? null : finiteOr(snapshot.lastUpdatedAt, lastUpdatedAt ?? 0);
      hasAnchor = true;
      return makeState();
    },

    reset() {
      restoreInitialState();
      return makeState();
    },

    pause() {
      paused = true;
      return makeState();
    },

    resume() {
      paused = false;
      return makeState();
    },

    scrubTo(time: number) {
      visualTime = finiteOr(time, visualTime);
      return makeState();
    },

    nudge(ms: number) {
      visualTime += finiteOr(ms, 0) / 1000;
      return makeState();
    },

    setOffsetMs(offsetMs: number) {
      visualTime = rawTime + finiteOr(offsetMs, 0) / 1000;
      return makeState();
    },

    setRate(nextRate: number) {
      rate = finiteOr(nextRate, rate);
      return makeState();
    },

    setMode(nextMode: VisualSequencerMode) {
      mode = nextMode;
      return makeState();
    },

    syncToRaw(nextRawTime?: number, nowMs?: number) {
      if (nextRawTime !== undefined) setRawAnchor(nextRawTime, nowMs);
      visualTime = rawTime;
      return makeState();
    }
  };
};
