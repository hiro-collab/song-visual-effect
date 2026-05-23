import type { SongAppFactory } from "../system/kit";
import { createSongApp as createTrafficJamApp } from "./traffic-jam/adapter";

const LOCAL_SONG_ADAPTERS: Record<string, SongAppFactory> = {
  "local:traffic-jam": createTrafficJamApp
};

export const resolveLocalSongAdapter = (adapterId: string) => LOCAL_SONG_ADAPTERS[adapterId] ?? null;
