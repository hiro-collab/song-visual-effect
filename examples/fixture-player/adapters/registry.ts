import type { SongAdapterContext } from "../../../system/kit/songAdapterContext";
import type { SongApp, SongAppFactory, SongAppServices } from "../../../system/kit/songApp";
import { LOCAL_SONG_ADAPTERS } from "../../../song-packs/local-adapters";
import { createFixtureSoftLightApp } from "./fixtureSoftLight";

const BUILTIN_ADAPTERS: Record<string, SongAppFactory> = {
  "builtin:fixture-soft-light": createFixtureSoftLightApp
};

const fallback = (context: SongAdapterContext, services: SongAppServices, reason: string) =>
  createFixtureSoftLightApp(context, services, `fallback fixture adapter / ${reason}`);

export const createSongApp = async (context: SongAdapterContext, services: SongAppServices): Promise<SongApp> => {
  const adapterId = context.manifest.webAdapter ?? "builtin:fixture-soft-light";
  if (!adapterId) return fallback(context, services, "no adapter specified");

  if (adapterId.startsWith("builtin:")) {
    const factory = BUILTIN_ADAPTERS[adapterId];
    if (!factory) return fallback(context, services, `unknown ${adapterId}`);
    return factory(context, services);
  }

  const localFactory = LOCAL_SONG_ADAPTERS[adapterId];
  if (localFactory) return localFactory(context, services);

  return fallback(context, services, `local adapter is not registered: ${adapterId}`);
};
