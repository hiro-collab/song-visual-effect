import type { SongAdapterContext, SongApp, SongAppFactory, SongAppServices } from "../../../../system/kit";
import { resolveLocalSongAdapter } from "../../../../song-packs/local-adapters";
import { createFixtureSoftLightApp } from "./fixtureSoftLight";

const BUILTIN_ADAPTERS: Record<string, SongAppFactory> = Object.assign(Object.create(null), {
  "builtin:fixture-soft-light": createFixtureSoftLightApp
});

const fallback = (context: SongAdapterContext, services: SongAppServices, reason: string) =>
  createFixtureSoftLightApp(context, services, `fallback fixture adapter / ${reason}`);

export const createSongApp = async (context: SongAdapterContext, services: SongAppServices): Promise<SongApp> => {
  const adapterId = (context.manifest as { webAdapter?: unknown }).webAdapter ?? "builtin:fixture-soft-light";
  if (!adapterId) return fallback(context, services, "no adapter specified");
  if (typeof adapterId !== "string") return fallback(context, services, "invalid adapter id");

  const songOwnedFactory = resolveLocalSongAdapter(adapterId);
  if (songOwnedFactory) return songOwnedFactory(context, services);

  if (adapterId.startsWith("builtin:")) {
    const factory = Object.hasOwn(BUILTIN_ADAPTERS, adapterId) ? BUILTIN_ADAPTERS[adapterId] : null;
    if (!factory) return fallback(context, services, `unknown ${adapterId}`);
    return factory(context, services);
  }

  return fallback(context, services, "song-owned adapter loading is outside this fixture player");
};
