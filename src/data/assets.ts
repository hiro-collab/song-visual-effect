import type { Beat, LyricCue, Markers, MusicMap, Palette, Range } from "../types";
import { DEFAULT_PALETTE } from "../effects/palette";

const JSON_HEADERS = { Accept: "application/json" };

const fetchText = async (paths: string[]) => {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (response.ok) return await response.text();
    } catch {
      // Try the next path.
    }
  }
  return "";
};

const fetchJson = async <T>(paths: string[]): Promise<T | null> => {
  for (const path of paths) {
    try {
      const response = await fetch(path, { headers: JSON_HEADERS, cache: "no-store" });
      if (response.ok) return (await response.json()) as T;
    } catch {
      // Try the next path.
    }
  }
  return null;
};

const asSeconds = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value > 1000 ? value / 1000 : value;
};

const readNumber = (object: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = asSeconds(object[key]);
    if (value !== null) return value;
  }
  return null;
};

const walkObjects = (value: unknown, callback: (object: Record<string, unknown>) => void) => {
  if (Array.isArray(value)) {
    for (const child of value) walkObjects(child, callback);
    return;
  }
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    callback(object);
    for (const child of Object.values(object)) walkObjects(child, callback);
  }
};

const collectBeats = (json: unknown): Beat[] => {
  const beats: Beat[] = [];
  walkObjects(json, (object) => {
    const time = readNumber(object, ["start", "time", "startTime", "timestamp"]);
    if (time === null) return;
    const duration = readNumber(object, ["duration", "length"]) ?? 0.48;
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
  walkObjects(json, (object) => {
    const start = readNumber(object, ["start", "startTime", "time"]);
    if (start === null) return;
    const duration = readNumber(object, ["duration", "length"]);
    const end = readNumber(object, ["end", "endTime"]);
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
  if (!Array.isArray(root.chorusSegments)) return [];
  const ranges: Range[] = [];
  for (const segment of root.chorusSegments) {
    if (!segment || typeof segment !== "object") continue;
    const typedSegment = segment as { isChorus?: unknown; repeats?: unknown };
    if (typedSegment.isChorus === false || !Array.isArray(typedSegment.repeats)) continue;
    for (const repeat of typedSegment.repeats) {
      if (!repeat || typeof repeat !== "object") continue;
      const object = repeat as Record<string, unknown>;
      const start = readNumber(object, ["start", "startTime", "time"]);
      const duration = readNumber(object, ["duration", "length"]);
      if (start === null || duration === null) continue;
      ranges.push({ start, end: start + duration, intensity: 1 });
    }
  }
  return uniqueSorted(ranges, (range) => range.start).slice(0, 32);
};

const collectTimedLyrics = (json: unknown): LyricCue[] => {
  const cues: LyricCue[] = [];
  walkObjects(json, (object) => {
    const text = typeof object.text === "string" ? object.text : typeof object.word === "string" ? object.word : "";
    const time = readNumber(object, ["start", "startTime", "time"]);
    if (!text || time === null) return;
    const end = readNumber(object, ["end", "endTime"]) ?? time + (readNumber(object, ["duration", "length"]) ?? 3.5);
    const index = typeof object.index === "number" ? object.index : undefined;
    cues.push({ index, time, end: Math.max(time + 0.8, end), text });
  });
  return uniqueSorted(cues, (cue) => cue.time);
};

const uniqueSorted = <T>(items: T[], pick: (item: T) => number) => {
  const sorted = [...items].sort((a, b) => pick(a) - pick(b));
  return sorted.filter((item, index) => index === 0 || Math.abs(pick(item) - pick(sorted[index - 1])) > 0.015);
};

const parseLyricLines = (text: string) => {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("作詞作曲"));
  return lines[0] === "シャイニングスター" ? lines.slice(1) : lines;
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

export const loadMusicMap = async (): Promise<MusicMap> => {
  const warnings: string[] = [];
  const [markers, palette, songJson, beatJson, chorusJson, lyricJson, lyricText] = await Promise.all([
    fetchJson<Markers>(["/analysis/markers.json"]),
    fetchJson<Palette>(["/analysis/palette.json"]),
    fetchJson<Record<string, unknown>>(["/analysis/song.json"]),
    fetchJson<unknown>(["/analysis/beat.json", "/analysis/songle_beat.json"]),
    fetchJson<unknown>(["/analysis/chorus.json", "/analysis/songle_chorus.json"]),
    fetchJson<unknown>(["/analysis/lyrics_timing.json"]),
    fetchText(["/Lyrics.txt", "/lyrics/Lyrics.txt"])
  ]);

  const usableMarkers = markers ?? {};
  const songDuration = songJson ? readNumber(songJson, ["duration", "length"]) : null;
  const duration = songDuration ?? usableMarkers.estimatedDuration ?? 318;
  const beats = beatJson ? collectBeats(beatJson) : [];
  const chorus = chorusJson ? collectRanges(chorusJson) : [];
  const timedLyrics = lyricJson ? collectTimedLyrics(lyricJson) : [];
  const lyricLines = parseLyricLines(lyricText);

  if (!beatJson || beats.length < 8) warnings.push("beat fallback");
  if (!chorusJson || chorus.length === 0) warnings.push("chorus fallback");
  if (!timedLyrics.length) warnings.push("rough lyrics");

  return {
    title: "Shining Star",
    artist: "MaouDamashii / Koichi Morita",
    duration,
    beats: beats.length >= 8 ? beats : generatedBeats(duration),
    chorus: chorus.length ? chorus : generatedChorus(usableMarkers, duration),
    lyrics: timedLyrics.length ? timedLyrics : parseLyrics(lyricLines, duration),
    lyricLines,
    markers: usableMarkers,
    palette: palette ?? DEFAULT_PALETTE,
    warnings
  };
};

export const findBundledAudio = async () => {
  const paths = [
    "/audio/shining_star.mp3",
    "/audio/ShiningStar.mp3",
    "/shining_star.mp3",
    "/ShiningStar.mp3"
  ];
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && contentType.startsWith("audio/")) return path;
    } catch {
      // Keep looking.
    }
  }
  return "";
};
