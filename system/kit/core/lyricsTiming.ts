import type { LyricCue } from "./types";

export const LYRIC_TIMING_EXPORT_SCHEMA_V2 = "music-effect.lyrics-timing.v2";
const LYRIC_TIMING_EDITOR_PROJECT_SCHEMA = "lyric-timing-editor.project.v1";

type TimeUnit = "seconds" | "milliseconds";

type LyricsTimingImportOptions = {
  lyricLines?: string[];
  duration?: number;
  warnings?: string[];
};

const MIN_LYRIC_DURATION = 0.8;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const warn = (warnings: string[] | undefined, message: string) => {
  warnings?.push(message);
};

const normalizeTimeUnit = (value: unknown): TimeUnit | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (["s", "sec", "secs", "second", "seconds"].includes(normalized)) return "seconds";
  if (["ms", "msec", "msecs", "millisecond", "milliseconds"].includes(normalized)) return "milliseconds";
  return null;
};

const objectTimeUnit = (object: Record<string, unknown>) => {
  return normalizeTimeUnit(object.timeUnit ?? object.time_unit ?? object.unit ?? object.units);
};

const toSnakeCase = (value: string) => value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

const explicitTimeKeys = (key: string, unit: TimeUnit) => {
  const snakeKey = toSnakeCase(key);
  return unit === "seconds"
    ? [`${key}Sec`, `${key}Secs`, `${key}Seconds`, `${snakeKey}_sec`, `${snakeKey}_secs`, `${snakeKey}_seconds`]
    : [
        `${key}Ms`,
        `${key}Msec`,
        `${key}Millis`,
        `${key}Milliseconds`,
        `${snakeKey}_ms`,
        `${snakeKey}_msec`,
        `${snakeKey}_millis`,
        `${snakeKey}_milliseconds`
      ];
};

const numericValue = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

const toSeconds = (value: unknown, unit: TimeUnit): number | null => {
  const number = numericValue(value);
  if (number === null) return null;
  return unit === "milliseconds" ? number / 1000 : number;
};

const legacyAsSeconds = (value: unknown): number | null => {
  const number = numericValue(value);
  if (number === null) return null;
  return number > 1000 ? number / 1000 : number;
};

const readNumber = (object: Record<string, unknown>, keys: string[], inheritedUnit?: TimeUnit | null) => {
  for (const key of keys) {
    for (const candidate of explicitTimeKeys(key, "seconds")) {
      const value = toSeconds(object[candidate], "seconds");
      if (value !== null) return value;
    }
    for (const candidate of explicitTimeKeys(key, "milliseconds")) {
      const value = toSeconds(object[candidate], "milliseconds");
      if (value !== null) return value;
    }
  }

  const timeUnit = objectTimeUnit(object) ?? inheritedUnit ?? null;
  if (timeUnit) {
    for (const key of keys) {
      const value = toSeconds(object[key], timeUnit);
      if (value !== null) return value;
    }
  }

  for (const key of keys) {
    const value = legacyAsSeconds(object[key]);
    if (value !== null) return value;
  }
  return null;
};

const walkObjects = (
  value: unknown,
  callback: (object: Record<string, unknown>, inheritedUnit: TimeUnit | null) => void,
  inheritedUnit: TimeUnit | null = null
) => {
  if (Array.isArray(value)) {
    for (const child of value) walkObjects(child, callback, inheritedUnit);
    return;
  }
  if (isRecord(value)) {
    const timeUnit = objectTimeUnit(value) ?? inheritedUnit;
    callback(value, timeUnit);
    for (const child of Object.values(value)) walkObjects(child, callback, timeUnit);
  }
};

const uniqueSorted = <T>(items: T[], pick: (item: T) => number) => {
  const sorted = [...items].sort((a, b) => pick(a) - pick(b));
  return sorted.filter((item, index) => index === 0 || Math.abs(pick(item) - pick(sorted[index - 1])) > 0.015);
};

const coerceIndex = (value: unknown, fallback: number) => {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
};

const nonNegativeInteger = (value: unknown) => {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
};

const integerMilliseconds = (value: unknown) => {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
};

const embeddedLyricText = (phrase: Record<string, unknown>) => {
  const embedded = typeof phrase.text === "string" ? phrase.text.trim() : "";
  if (embedded) return embedded;
  return "";
};

const lyricTextForPhrase = (
  phrase: Record<string, unknown>,
  index: number,
  arrayIndex: number,
  lyricLines: string[]
) => {
  const embedded = embeddedLyricText(phrase);
  if (embedded) return embedded;
  return lyricLines[index] ?? lyricLines[arrayIndex] ?? "";
};

const collectLyricsTimingV2 = (json: Record<string, unknown>, options: LyricsTimingImportOptions): LyricCue[] => {
  const warnings = options.warnings;
  const lyricLines = options.lyricLines ?? [];
  const phrases = Array.isArray(json.phrases) ? json.phrases : [];
  const rootUnit = objectTimeUnit(json);
  const exportDuration = readNumber(json, ["duration"], rootUnit);
  const duration = options.duration ?? exportDuration ?? null;
  const includesLyrics = json.includesLyrics === true;

  if (json.timeUnit !== "ms") {
    warn(warnings, "lyrics timing v2 warning: timeUnit should be ms");
  }
  if ("slug" in json && (typeof json.slug !== "string" || !SLUG_PATTERN.test(json.slug))) {
    warn(warnings, "lyrics timing v2 warning: slug should use lowercase letters, numbers, and hyphens");
  }
  if ("songle" in json && json.songle !== null && !isRecord(json.songle)) {
    warn(warnings, "lyrics timing v2 warning: songle should be an object or null");
  }
  if ("includesLyrics" in json && typeof json.includesLyrics !== "boolean") {
    warn(warnings, "lyrics timing v2 warning: includesLyrics should be boolean");
  }
  if (typeof json.rightsNotice !== "string" || !json.rightsNotice.trim()) {
    warn(warnings, "lyrics timing v2 warning: rightsNotice is missing");
  }
  if (
    "sourceProjectSchema" in json &&
    json.sourceProjectSchema !== LYRIC_TIMING_EDITOR_PROJECT_SCHEMA
  ) {
    warn(warnings, "lyrics timing v2 warning: sourceProjectSchema should be lyric-timing-editor.project.v1");
  }
  if ("durationMs" in json && json.durationMs !== null && integerMilliseconds(json.durationMs) === null) {
    warn(warnings, "lyrics timing v2 warning: durationMs should be integer milliseconds or null");
  }
  if (!Array.isArray(json.phrases)) {
    warn(warnings, "lyrics timing v2 warning: phrases array is missing");
    return [];
  }

  const cues: LyricCue[] = [];
  phrases.forEach((phraseValue, arrayIndex) => {
    if (!isRecord(phraseValue)) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}] is not an object`);
      return;
    }

    const id = typeof phraseValue.id === "string" && phraseValue.id.trim() ? phraseValue.id.trim() : "";
    if (!id) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].id is missing`);
    }

    const index = coerceIndex(phraseValue.index, arrayIndex);
    if (index !== phraseValue.index) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].index is invalid; using array order`);
    }

    const sourceLine = nonNegativeInteger(phraseValue.sourceLine);
    if (!("sourceLine" in phraseValue)) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].sourceLine is missing`);
    } else if (sourceLine === null) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].sourceLine is invalid`);
    }

    const timeUnit = objectTimeUnit(phraseValue) ?? rootUnit ?? "milliseconds";
    if ("startTimeMs" in phraseValue && integerMilliseconds(phraseValue.startTimeMs) === null) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].startTimeMs should be integer milliseconds`);
    }
    if ("endTimeMs" in phraseValue && integerMilliseconds(phraseValue.endTimeMs) === null) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].endTimeMs should be integer milliseconds`);
    }
    const time = readNumber(phraseValue, ["startTime", "start", "time"], timeUnit);
    const end = readNumber(phraseValue, ["endTime", "end"], timeUnit);
    if (time === null) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].startTimeMs is missing`);
      return;
    }
    if (end === null) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].endTimeMs is missing`);
      return;
    }
    if (end <= time) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}] has endTimeMs before startTimeMs`);
      return;
    }

    const embeddedText = embeddedLyricText(phraseValue);
    if (includesLyrics && !embeddedText) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].text is missing; using lyric line fallback`);
    }
    const text = embeddedText || lyricTextForPhrase(phraseValue, index, arrayIndex, lyricLines);
    if (!text) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}] has no text and no matching lyric line`);
      return;
    }

    let cueEnd = end;
    if (duration !== null && cueEnd > duration + 0.05) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].endTimeMs exceeds duration`);
      cueEnd = Math.max(time + MIN_LYRIC_DURATION, duration);
    }
    if (duration !== null && time > duration + 0.05) {
      warn(warnings, `lyrics timing v2 warning: phrases[${arrayIndex}].startTimeMs exceeds duration`);
    }

    cues.push({
      ...(id ? { id } : {}),
      index,
      ...(sourceLine !== null ? { sourceLine } : {}),
      time,
      end: Math.max(time + MIN_LYRIC_DURATION, cueEnd),
      text
    });
  });

  return uniqueSorted(cues, (cue) => cue.time);
};

const collectLegacyTimedLyrics = (json: unknown): LyricCue[] => {
  const cues: LyricCue[] = [];
  walkObjects(json, (object, timeUnit) => {
    const text = typeof object.text === "string" ? object.text : typeof object.word === "string" ? object.word : "";
    const time = readNumber(object, ["start", "startTime", "time"], timeUnit);
    if (!text || time === null) return;
    const end =
      readNumber(object, ["end", "endTime"], timeUnit) ??
      time + (readNumber(object, ["duration", "length"], timeUnit) ?? 3.5);
    const index = typeof object.index === "number" ? object.index : undefined;
    cues.push({ index, time, end: Math.max(time + MIN_LYRIC_DURATION, end), text });
  });
  return uniqueSorted(cues, (cue) => cue.time);
};

export const collectTimedLyrics = (json: unknown, options: LyricsTimingImportOptions = {}): LyricCue[] => {
  if (isRecord(json) && json.schema === LYRIC_TIMING_EXPORT_SCHEMA_V2) {
    return collectLyricsTimingV2(json, options);
  }
  return collectLegacyTimedLyrics(json);
};
