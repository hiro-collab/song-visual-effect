import type { MusicMap, SongManifest } from "./types";
import { fetchBoundedJson, fetchBoundedText, resolveWithinBaseUrl } from "./safeFetch";

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

const resolveSongAsset = (baseUrl: string, path: string | null | undefined, options: SongAssetReadOptions = {}) => {
  return resolveWithinBaseUrl(baseUrl, path, { allowOutsideBase: options.allowOutsidePackage });
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
    return fetchBoundedJson<T>(url);
  };

  const readText: SongAssetReader["readText"] = async (path, options) => {
    const url = resolve(path, options);
    if (!url) return "";
    return (await fetchBoundedText(url)) ?? "";
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
