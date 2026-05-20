export const JSON_HEADERS = { Accept: "application/json" };

export const DEFAULT_MAX_JSON_BYTES = 5_000_000;
export const DEFAULT_MAX_TEXT_BYTES = 1_000_000;

type FetchTextOptions = {
  headers?: HeadersInit;
  maxBytes?: number;
};

type ResolveOptions = {
  allowOutsideBase?: boolean;
};

const allowedFetchProtocols = new Set(["http:", "https:"]);

const assertFetchableUrl = (url: URL, label: string) => {
  if (!allowedFetchProtocols.has(url.protocol)) {
    throw new Error(`${label} must use http or https: ${url.toString()}`);
  }
};

export const resolveHttpUrl = (path: string, baseUrl: string, label = "URL") => {
  const url = new URL(path, baseUrl);
  assertFetchableUrl(url, label);
  return url.toString();
};

export const isWithinBaseUrl = (baseUrl: string, candidateUrl: string) => {
  const base = new URL(baseUrl);
  const candidate = new URL(candidateUrl);
  return candidate.origin === base.origin && candidate.href.startsWith(base.href);
};

export const resolveWithinBaseUrl = (
  baseUrl: string,
  path: string | null | undefined,
  options: ResolveOptions = {}
) => {
  if (!path) return null;
  const url = resolveHttpUrl(path, baseUrl, "Song asset URL");
  if (!options.allowOutsideBase && !isWithinBaseUrl(baseUrl, url)) {
    throw new Error(`Song asset path escapes its package: ${path}`);
  }
  return url;
};

const readBoundedResponseText = async (response: Response, maxBytes: number) => {
  if (!response.body) {
    const text = await response.text();
    return new TextEncoder().encode(text).length <= maxBytes ? text : null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

export const fetchBoundedText = async (url: string, options: FetchTextOptions = {}) => {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_TEXT_BYTES;
  const response = await fetch(url, {
    headers: options.headers,
    cache: "no-store"
  });
  if (!response.ok) return null;

  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;

  return readBoundedResponseText(response, maxBytes);
};

export const fetchBoundedJson = async <T>(url: string, maxBytes = DEFAULT_MAX_JSON_BYTES): Promise<T | null> => {
  const text = await fetchBoundedText(url, { headers: JSON_HEADERS, maxBytes });
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};
