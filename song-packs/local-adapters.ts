import type { SongAppFactory } from "../system/kit";

const LOCAL_SONG_ADAPTERS: Record<string, SongAppFactory> = {};

export const resolveLocalSongAdapter = (adapterId: string) => LOCAL_SONG_ADAPTERS[adapterId] ?? null;
