import type { MusicMap, SongManifest } from "../types";

const JSON_HEADERS = { Accept: "application/json" };

type SongAssetReadOptions = {
  allowOutsidePackage?: boolean;
};

export type SongAssetReader = {
  baseUrl: string;
  manifest: SongManifest;
  designCuesUrl?: string;
  effectDesignUrl?: string;
  resolve: (path: string | null | undefined, options?: SongAssetReadOptions) => string | null;
  readJson: <T = unknown>(path: string | null | undefined, options?: SongAssetReadOptions) => Promise<T | null>;
  readText: (path: string | null | undefined, options?: SongAssetReadOptions) => Promise<string>;
  readDesignCues: <T = unknown>() => Promise<T | null>;
};

export type SongAdapterContext = {
  musicMap: MusicMap;
  manifest: SongManifest;
  baseUrl: string;
  assets: SongAssetReader;
};

const isWithinPackage = (baseUrl: string, candidateUrl: string) => {
  const base = new URL(baseUrl);
  const candidate = new URL(candidateUrl);
  return candidate.origin === base.origin && candidate.href.startsWith(base.href);
};

const resolveSongAsset = (baseUrl: string, path: string | null | undefined, options: SongAssetReadOptions = {}) => {
  if (!path) return null;
  const url = new URL(path, baseUrl).toString();
  if (!options.allowOutsidePackage && !isWithinPackage(baseUrl, url)) {
    throw new Error(`Song asset path escapes its package: ${path}`);
  }
  return url;
};

export const createSongAdapterContext = (musicMap: MusicMap): SongAdapterContext => {
  const { baseUrl, manifest, designCuesUrl, effectDesignUrl } = musicMap.source;

  const resolve: SongAssetReader["resolve"] = (path, options) => resolveSongAsset(baseUrl, path, options);

  const readJson = async <T = unknown>(
    path: string | null | undefined,
    options?: SongAssetReadOptions
  ): Promise<T | null> => {
    const url = resolve(path, options);
    if (!url) return null;
    const response = await fetch(url, { headers: JSON_HEADERS, cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as T;
  };

  const readText: SongAssetReader["readText"] = async (path, options) => {
    const url = resolve(path, options);
    if (!url) return "";
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return "";
    return response.text();
  };

  const readDesignCues = async <T = unknown>(): Promise<T | null> => {
    const cuesPath = manifest.design?.cues;
    return readJson<T>(cuesPath);
  };

  return {
    musicMap,
    manifest,
    baseUrl,
    assets: {
      baseUrl,
      manifest,
      designCuesUrl,
      effectDesignUrl,
      resolve,
      readJson,
      readText,
      readDesignCues
    }
  };
};
