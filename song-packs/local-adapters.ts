import type { SongAppFactory } from "../system/kit";
import { createSongApp as createTrafficJamApp } from "./traffic-jam/adapter";

const ADAPTER_ID_PATTERN = /^(song|builtin):[a-z0-9][a-z0-9._-]{0,63}$/;

const LOCAL_SONG_ADAPTERS: Record<string, SongAppFactory> = Object.assign(Object.create(null), {
  "song:traffic-jam": createTrafficJamApp
});

export const resolveLocalSongAdapter = (adapterId: string) => {
  if (!ADAPTER_ID_PATTERN.test(adapterId)) return null;
  return Object.hasOwn(LOCAL_SONG_ADAPTERS, adapterId) ? LOCAL_SONG_ADAPTERS[adapterId] : null;
};
