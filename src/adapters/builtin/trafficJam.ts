import type { Markers, MusicMap, Range } from "../../types";
import type { SongAdapterContext } from "../../runtime/songAdapterContext";
import { SoftLightRenderer } from "../../renderers/softLightRenderer";
import type { SongApp, SongAppServices } from "../types";

type VisualCueRange = {
  start?: unknown;
  end?: unknown;
  intensity?: unknown;
};

type TrafficJamDirection = {
  id?: unknown;
  candidateRange?: VisualCueRange;
};

type TrafficJamVisualCues = {
  schema?: unknown;
  chorusCandidates?: VisualCueRange[];
  primaryDirections?: TrafficJamDirection[];
};

const asNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const toRange = (range: VisualCueRange): Range | null => {
  const start = asNumber(range.start);
  const end = asNumber(range.end);
  if (start === null || end === null || end <= start) return null;
  const intensity = asNumber(range.intensity) ?? 1;
  return { start, end, intensity };
};

const cueChorus = (cues: TrafficJamVisualCues | null) => {
  if (!Array.isArray(cues?.chorusCandidates)) return [];
  return cues.chorusCandidates.flatMap((candidate) => {
    const range = toRange(candidate);
    return range ? [range] : [];
  });
};

const cueLineEmphasis = (cues: TrafficJamVisualCues | null): NonNullable<Markers["lineEmphasis"]> => {
  if (!Array.isArray(cues?.primaryDirections)) return [];
  return cues.primaryDirections.flatMap((direction) => {
    if (direction.id !== "interlude-freeze" || !direction.candidateRange) return [];
    const range = toRange(direction.candidateRange);
    if (!range) return [];
    return [{ time: range.start, duration: range.end - range.start, intensity: 0.85 }];
  });
};

const createCueAdjustedMap = (musicMap: MusicMap, cues: TrafficJamVisualCues | null): MusicMap => {
  const chorus = cueChorus(cues);
  const lineEmphasis = cueLineEmphasis(cues);

  return {
    ...musicMap,
    chorus: chorus.length ? chorus : musicMap.chorus,
    markers: {
      ...musicMap.markers,
      lineEmphasis: [...(musicMap.markers.lineEmphasis ?? []), ...lineEmphasis]
    }
  };
};

export const createTrafficJamApp = async (
  context: SongAdapterContext,
  services: SongAppServices
): Promise<SongApp> => {
  const cues = await context.assets.readDesignCues<TrafficJamVisualCues>();
  const musicMap = createCueAdjustedMap(context.musicMap, cues);
  const renderer = new SoftLightRenderer(services.canvas, services.ctx, musicMap);
  const cueStatus = cues?.schema === "music-effect.visual-cues.v1" ? "visual cues ready" : "visual cues unavailable";

  return {
    id: "builtin:traffic-jam",
    status: `traffic-jam adapter / ${cueStatus}`,
    resize: () => renderer.resize(),
    render: ({ time, dt, userGlow }) => renderer.render(musicMap, time, dt, userGlow),
    pointerMove: (event) => renderer.pointerMove(event),
    pointerLeave: () => renderer.pointerLeave(),
    pointerDown: (event) => renderer.pointerDown(event),
    pointerUp: () => renderer.pointerUp(),
    resetVisualTiming: () => renderer.resetBeat()
  };
};
