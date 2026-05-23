import type { SongAppFactory } from "../system/kit/songApp";
import { createSongApp as createTrafficJamApp } from "./traffic-jam/adapter";

export const LOCAL_SONG_ADAPTERS: Record<string, SongAppFactory> = {
  "local:traffic-jam": createTrafficJamApp
};
