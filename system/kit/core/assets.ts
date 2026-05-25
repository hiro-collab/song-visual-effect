import type { Beat, LyricCue, Markers, MusicMap, Palette, Range, SongManifest } from "./types";
import { DEFAULT_PALETTE } from "../render/palette";
import {
  DEFAULT_MAX_TEXT_BYTES,
  fetchBoundedJson,
  fetchBoundedText,
  resolveHttpUrl,
  resolveWithinBaseUrl
} from "./safeFetch";
import { collectTimedLyrics } from "./lyricsTiming";

const compactPaths = (paths: Array<string | null | undefined>) => paths.filter((path): path is string => Boolean(path));

const fetchText = async (paths: Array<string | null | undefined>) => {
  for (const path of compactPaths(paths)) {
    try {
      const text = await fetchBoundedText(path, { maxBytes: DEFAULT_MAX_TEXT_BYTES });
      if (text !== null) return text;
    } catch {
      // Try the next path.
    }
  }
  return "";
};

const fetchJson = async <T>(paths: Array<string | null | undefined>): Promise<T | null> => {
  for (const path of compactPaths(paths)) {
    try {
      const json = await fetchBoundedJson<T>(path);
      if (json !== null) return json;
    } catch {
      // Try the next path.
    }
  }
  return null;
};

const absoluteUrl = (path: string) => resolveHttpUrl(path, window.location.href);

const sourceBaseUrl = (manifestUrl: string) => new URL(".", manifestUrl).toString();

export const resolveSourcePath = (baseUrl: string, path: string | null | undefined) => {
  return resolveWithinBaseUrl(baseUrl, path);
};

const isSongManifest = (value: unknown): value is SongManifest => {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<SongManifest>;
  return typeof manifest.id === "string" && typeof manifest.title === "string" && typeof manifest.artist === "string";
};

export const getSongManifestUrl = () => {
  const queryValue = new URLSearchParams(window.location.search).get("song");
  return queryValue ? absoluteUrl(queryValue) : null;
};

const manifestLoadHint =
  "Check the manifest URL, song-pack server status, and SONG_PACK_CORS_ORIGINS when using custom ports.";

const loadManifest = async (manifestUrl: string) => {
  try {
    const manifest = await fetchBoundedJson<unknown>(manifestUrl);
    return isSongManifest(manifest) ? manifest : null;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Song manifest could not be loaded: ${manifestUrl}. ${manifestLoadHint} ${detail}`);
  }
};

type TimeUnit = "seconds" | "milliseconds";

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
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    const timeUnit = objectTimeUnit(object) ?? inheritedUnit;
    callback(object, timeUnit);
    for (const child of Object.values(object)) walkObjects(child, callback, timeUnit);
  }
};

const collectBeats = (json: unknown): Beat[] => {
  const beats: Beat[] = [];
  walkObjects(json, (object, timeUnit) => {
    const time = readNumber(object, ["start", "time", "startTime", "timestamp"], timeUnit);
    if (time === null) return;
    const duration = readNumber(object, ["duration", "length"], timeUnit) ?? 0.48;
    const position =
      typeof object.position === "number"
        ? object.position
        : typeof object.index === "number"
          ? object.index
          : undefined;
    const bpm = typeof object.bpm === "number" ? object.bpm : undefined;
    beats.push({ time, duration: Math.max(0.08, duration), position, bpm });
  });
  const sorted = uniqueSorted(beats, (beat) => beat.time).slice(0, 2000);
  return sorted.map((beat, index) => ({
    ...beat,
    duration: Math.max(0.08, sorted[index + 1] ? sorted[index + 1].time - beat.time : beat.duration)
  }));
};

const collectRanges = (json: unknown): Range[] => {
  const songleChorus = collectSongleChorus(json);
  if (songleChorus.length) return songleChorus;

  const ranges: Range[] = [];
  walkObjects(json, (object, timeUnit) => {
    const start = readNumber(object, ["start", "startTime", "time"], timeUnit);
    if (start === null) return;
    const duration = readNumber(object, ["duration", "length"], timeUnit);
    const end = readNumber(object, ["end", "endTime"], timeUnit);
    const finish = end ?? (duration !== null ? start + duration : null);
    if (finish === null || finish <= start) return;
    if (finish - start < 3) return;
    ranges.push({ start, end: finish, intensity: 1 });
  });
  return uniqueSorted(ranges, (range) => range.start).slice(0, 64);
};

const collectSongleChorus = (json: unknown): Range[] => {
  if (!json || typeof json !== "object") return [];
  const root = json as { chorusSegments?: unknown };
  const rootUnit = objectTimeUnit(root as Record<string, unknown>);
  if (!Array.isArray(root.chorusSegments)) return [];
  const ranges: Range[] = [];
  for (const segment of root.chorusSegments) {
    if (!segment || typeof segment !== "object") continue;
    const typedSegment = segment as { isChorus?: unknown; repeats?: unknown };
    if (typedSegment.isChorus === false || !Array.isArray(typedSegment.repeats)) continue;
    for (const repeat of typedSegment.repeats) {
      if (!repeat || typeof repeat !== "object") continue;
      const object = repeat as Record<string, unknown>;
      const timeUnit = objectTimeUnit(object) ?? rootUnit;
      const start = readNumber(object, ["start", "startTime", "time"], timeUnit);
      const duration = readNumber(object, ["duration", "length"], timeUnit);
      if (start === null || duration === null) continue;
      ranges.push({ start, end: start + duration, intensity: 1 });
    }
  }
  return uniqueSorted(ranges, (range) => range.start).slice(0, 32);
};

const uniqueSorted = <T>(items: T[], pick: (item: T) => number) => {
  const sorted = [...items].sort((a, b) => pick(a) - pick(b));
  return sorted.filter((item, index) => index === 0 || Math.abs(pick(item) - pick(sorted[index - 1])) > 0.015);
};

const parseLyricLines = (text: string, title: string) => {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("作詞作曲"));
  return lines[0] === title ? lines.slice(1) : lines;
};

const parseLyrics = (lyricLines: string[], duration: number): LyricCue[] => {
  if (!lyricLines.length) return [];
  const start = 7;
  const span = Math.max(90, duration - 18);
  const step = span / lyricLines.length;
  return lyricLines.map((line, index) => ({
    index,
    time: start + index * step,
    end: start + (index + 1) * step,
    text: line
  }));
};

const generatedBeats = (duration: number): Beat[] => {
  const bpm = 128;
  const interval = 60 / bpm;
  const beats: Beat[] = [];
  for (let time = 0; time < duration; time += interval) {
    beats.push({ time, duration: interval, position: (beats.length % 4) + 1 });
  }
  return beats;
};

const generatedChorus = (markers: Markers, duration: number): Range[] => {
  if (markers.warmSections?.length) {
    return markers.warmSections.filter((section) => (section.intensity ?? 0) > 0.75);
  }
  return [
    { start: duration * 0.18, end: duration * 0.32, intensity: 0.85 },
    { start: duration * 0.52, end: duration * 0.66, intensity: 0.95 },
    { start: duration * 0.76, end: duration * 0.95, intensity: 1 }
  ];
};

export const loadMusicMap = async (manifestUrl: string | null = getSongManifestUrl()): Promise<MusicMap> => {
  const warnings: string[] = [];
  if (!manifestUrl) {
    throw new Error("Song manifest URL is required. Open the app with ?song=<manifest-url>.");
  }
  const resolvedManifestUrl = absoluteUrl(manifestUrl);
  const manifest = await loadManifest(resolvedManifestUrl);
  if (!manifest) {
    throw new Error(`Song manifest could not be loaded: ${resolvedManifestUrl}. ${manifestLoadHint}`);
  }
  const baseUrl = sourceBaseUrl(resolvedManifestUrl);
  const analysis = manifest?.analysis ?? {};

  const [markers, palette, songJson, beatJson, chorusJson, lyricJson, lyricText] = await Promise.all([
    fetchJson<Markers>([resolveSourcePath(baseUrl, analysis.markers)]),
    fetchJson<Palette>([resolveSourcePath(baseUrl, analysis.palette)]),
    fetchJson<Record<string, unknown>>([resolveSourcePath(baseUrl, analysis.song)]),
    fetchJson<unknown>([resolveSourcePath(baseUrl, analysis.beat)]),
    fetchJson<unknown>([resolveSourcePath(baseUrl, analysis.chorus)]),
    fetchJson<unknown>([resolveSourcePath(baseUrl, analysis.timing)]),
    fetchText([resolveSourcePath(baseUrl, manifest.lyrics)])
  ]);

  const usableMarkers = markers ?? {};
  const manifestDuration = readNumber(manifest as unknown as Record<string, unknown>, ["duration", "length"]);
  const songDuration = songJson ? readNumber(songJson, ["duration", "length"]) : null;
  const duration = songDuration ?? manifestDuration ?? usableMarkers.estimatedDuration ?? 318;
  const title = manifest.title;
  const artist = manifest.artist;
  const lyricLines = parseLyricLines(lyricText, title);
  const beats = beatJson ? collectBeats(beatJson) : [];
  const chorus = chorusJson ? collectRanges(chorusJson) : [];
  const timedLyrics = lyricJson ? collectTimedLyrics(lyricJson, { lyricLines, duration, warnings }) : [];

  if (!beatJson || beats.length < 8) warnings.push("beat fallback");
  if (!chorusJson || chorus.length === 0) warnings.push("chorus fallback");
  if (!timedLyrics.length && lyricLines.length) warnings.push("rough lyrics");

  return {
    title,
    artist,
    duration,
    beats: beats.length >= 8 ? beats : generatedBeats(duration),
    chorus: chorus.length ? chorus : generatedChorus(usableMarkers, duration),
    lyrics: timedLyrics.length ? timedLyrics : parseLyrics(lyricLines, duration),
    lyricLines,
    markers: usableMarkers,
    palette: palette ?? DEFAULT_PALETTE,
    warnings,
    source: {
      manifestUrl: resolvedManifestUrl,
      baseUrl,
      manifest,
      audioUrl: resolveSourcePath(baseUrl, manifest?.audio) ?? undefined,
      creditsUrl: resolveSourcePath(baseUrl, manifest?.credits) ?? undefined,
      effectDesignUrl: resolveSourcePath(baseUrl, manifest?.design?.effect) ?? undefined,
      designCuesUrl: resolveSourcePath(baseUrl, manifest?.design?.cues) ?? undefined
    }
  };
};

export const findBundledAudio = async (musicMap?: MusicMap) => {
  const paths = [
    musicMap?.source.audioUrl,
  ];
  for (const path of compactPaths(paths)) {
    try {
      const headResponse = await fetch(path, { method: "HEAD", cache: "no-store" });
      const headType = headResponse.headers.get("content-type") ?? "";
      if (headResponse.ok && headType.startsWith("audio/")) return path;
      if (headResponse.ok) continue;

      const rangeResponse = await fetch(path, {
        headers: { Range: "bytes=0-0" },
        cache: "no-store"
      });
      const rangeType = rangeResponse.headers.get("content-type") ?? "";
      await rangeResponse.body?.cancel();
      if ((rangeResponse.ok || rangeResponse.status === 206) && rangeType.startsWith("audio/")) return path;
    } catch {
      // Keep looking.
    }
  }
  return "";
};
