import type { SongAdapterContext } from "../runtime/songAdapterContext";
import type { SongApp, SongAppFactory, SongAppServices } from "./types";
import { createFixtureSoftLightApp } from "./builtin/fixtureSoftLight";
import { createTrafficJamApp } from "./builtin/trafficJam";

const BUILTIN_ADAPTERS: Record<string, SongAppFactory> = {
  "builtin:fixture-soft-light": createFixtureSoftLightApp,
  "builtin:traffic-jam": createTrafficJamApp
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

  return fallback(context, services, "external adapter loading disabled");
};
