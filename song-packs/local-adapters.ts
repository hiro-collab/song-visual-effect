import type { SongAppFactory } from "../system/kit";
import { createSongApp as createIssenKounenApp } from "./issen-kounen/adapter";
import { createSongApp as createMonitoringApp } from "./monitoring/adapter";
import { createSongApp as createTrafficJamApp } from "./traffic-jam/adapter";

const SONG_ADAPTER_ID_PATTERN = /^song:[a-z0-9][a-z0-9._-]{0,63}$/;

const LOCAL_SONG_ADAPTERS: Record<string, SongAppFactory> = Object.assign(Object.create(null), {
  "song:issen-kounen": createIssenKounenApp,
  "song:monitoring": createMonitoringApp,
  "song:traffic-jam": createTrafficJamApp
});

export const resolveLocalSongAdapter = (adapterId: unknown) => {
  if (typeof adapterId !== "string") return null;
  if (!SONG_ADAPTER_ID_PATTERN.test(adapterId)) return null;
  return Object.hasOwn(LOCAL_SONG_ADAPTERS, adapterId) ? LOCAL_SONG_ADAPTERS[adapterId] : null;
};
