import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { get } from "node:http";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const runtimeRoot = resolve(repoRoot, ".codex", "runtime", "preview-snapshots");

const defaultPlayerPort = Number(process.env.PLAYER_PORT ?? 5173);
const defaultSongPackPort = Number(process.env.SONG_PACK_PORT ?? 5174);

const usage = `Usage:
  npm run preview:snapshot -- --song <song-id|manifest-url> [--time <seconds>]

Examples:
  npm run preview:snapshot -- --song shining-star --time 48
  npm run preview:snapshot -- --song http://127.0.0.1:5174/shining-star/manifest.json --time 48

Options:
  --song <id|url>             Song pack id or loopback manifest URL. Default: shining-star
  --time <seconds>            Preview time passed as ?previewTime=. Default: 0
  --player-port <port>        Fixture player port. Default: PLAYER_PORT or 5173
  --song-port <port>          Song pack server port. Default: SONG_PACK_PORT or 5174
  --player-url <url>          Existing loopback player origin. Default: http://127.0.0.1:<player-port>/
  --song-base-url <url>       Existing loopback song-pack origin. Default: http://127.0.0.1:<song-port>/
  --width <px>                Viewport width. Default: 1280
  --height <px>               Viewport height. Default: 720
  --settle-ms <ms>            Wait after load before capture. Default: 1400
  --out-dir <path>            Output directory. Default: .codex/runtime/preview-snapshots
  --no-start                  Do not auto-start missing local servers
  --allow-console-errors      Record console errors but exit 0
`;

const parseArgs = (argv) => {
  const options = {
    song: "shining-star",
    time: 0,
    playerPort: defaultPlayerPort,
    songPort: defaultSongPackPort,
    width: 1280,
    height: 720,
    settleMs: 1400,
    outDir: runtimeRoot,
    noStart: false,
    allowConsoleErrors: false
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--help" || arg === "-h") {
      console.log(usage);
      process.exit(0);
    } else if (arg === "--song" || arg === "--manifest") {
      options.song = next();
    } else if (arg === "--time") {
      options.time = Number(next());
    } else if (arg === "--player-port") {
      options.playerPort = Number(next());
    } else if (arg === "--song-port") {
      options.songPort = Number(next());
    } else if (arg === "--player-url") {
      options.playerUrl = next();
    } else if (arg === "--song-base-url") {
      options.songBaseUrl = next();
    } else if (arg === "--width") {
      options.width = Number(next());
    } else if (arg === "--height") {
      options.height = Number(next());
    } else if (arg === "--settle-ms") {
      options.settleMs = Number(next());
    } else if (arg === "--out-dir") {
      options.outDir = resolve(repoRoot, next());
    } else if (arg === "--no-start") {
      options.noStart = true;
    } else if (arg === "--allow-console-errors") {
      options.allowConsoleErrors = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  for (const [key, value] of [
    ["time", options.time],
    ["playerPort", options.playerPort],
    ["songPort", options.songPort],
    ["width", options.width],
    ["height", options.height],
    ["settleMs", options.settleMs]
  ]) {
    if (!Number.isFinite(value)) throw new Error(`${key} must be a finite number.`);
  }
  for (const [key, value] of [
    ["playerPort", options.playerPort],
    ["songPort", options.songPort]
  ]) {
    if (!Number.isInteger(value) || value <= 0 || value > 65535) {
      throw new Error(`${key} must be a TCP port number.`);
    }
  }
  if (options.width < 320 || options.height < 240) throw new Error("Viewport is too small.");
  if (options.settleMs < 0 || options.settleMs > 30000) throw new Error("settle-ms must be between 0 and 30000.");
  return options;
};

const assertLoopbackUrl = (value, label) => {
  const url = new URL(value);
  const hostname = url.hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`${label} must use http or https.`);
  if (!["127.0.0.1", "localhost", "::1"].includes(hostname)) {
    throw new Error(`${label} must be a loopback URL. Refusing ${url.href}`);
  }
  return url;
};

const normalizeOriginUrl = (value, label) => {
  const url = assertLoopbackUrl(value, label);
  url.pathname = url.pathname || "/";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  url.search = "";
  url.hash = "";
  return url;
};

const resolveSnapshotConfig = (options) => {
  const playerUrl = normalizeOriginUrl(
    options.playerUrl ?? `http://127.0.0.1:${options.playerPort}/`,
    "player-url"
  );
  const songBaseUrl = normalizeOriginUrl(
    options.songBaseUrl ?? `http://127.0.0.1:${options.songPort}/`,
    "song-base-url"
  );
  const rawSong = options.song.trim();
  const manifestUrl = /^https?:\/\//i.test(rawSong)
    ? assertLoopbackUrl(rawSong, "song manifest URL")
    : new URL(`${encodeURIComponent(rawSong)}/manifest.json`, songBaseUrl);
  assertLoopbackUrl(manifestUrl.href, "song manifest URL");

  const targetUrl = new URL(playerUrl);
  targetUrl.searchParams.set("song", manifestUrl.href);
  targetUrl.searchParams.set("previewTime", String(Math.max(0, options.time)));

  return {
    playerUrl,
    songBaseUrl,
    manifestUrl,
    targetUrl
  };
};

const timestampSlug = () => new Date().toISOString().replace(/[:.]/g, "-");

const safeSlug = (value) => value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "song";

const delay = (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms));

const fetchOk = async (url, timeoutMs = 1200) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    await response.body?.cancel();
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
};

const waitForHttpOk = async (url, label, timeoutMs = 15000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await fetchOk(url)) return;
    await delay(250);
  }
  throw new Error(`${label} did not become ready: ${url}`);
};

const openLogFd = (dir, name) => {
  mkdirSync(dir, { recursive: true });
  return openSync(join(dir, name), "a");
};

const spawnManaged = (label, command, args, env, logDir) => {
  const stdout = openLogFd(logDir, `${label}.stdout.log`);
  const stderr = openLogFd(logDir, `${label}.stderr.log`);
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: { ...process.env, ...env },
    stdio: ["ignore", stdout, stderr],
    windowsHide: true
  });
  child.once("exit", () => {
    closeSync(stdout);
    closeSync(stderr);
  });
  return { label, child };
};

const killChild = async (managed) => {
  if (!managed || managed.child.killed) return;
  if (managed.child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(managed.child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
  } else {
    managed.child.kill();
  }
  await delay(350);
  if (managed.child.exitCode === null) managed.child.kill("SIGKILL");
};

const ensureServers = async ({ options, config, logDir }) => {
  const spawned = [];
  const playerReady = await fetchOk(config.playerUrl.href);
  const songServerReady = await fetchOk(config.songBaseUrl.href);

  if (!songServerReady) {
    if (options.noStart) throw new Error(`Song pack server is not running: ${config.songBaseUrl.href}`);
    spawned.push(spawnManaged(
      "song-pack-server",
      process.execPath,
      [join(repoRoot, "scripts", "serve-song-packs.mjs")],
      {
        SONG_PACK_HOST: "127.0.0.1",
        SONG_PACK_PORT: String(config.songBaseUrl.port),
        SONG_PACK_CORS_ORIGINS: `${config.playerUrl.origin},http://localhost:${config.playerUrl.port}`
      },
      logDir
    ));
    await waitForHttpOk(config.songBaseUrl.href, "song pack server");
  }

  if (!playerReady) {
    if (options.noStart) throw new Error(`Fixture player is not running: ${config.playerUrl.href}`);
    spawned.push(spawnManaged(
      "fixture-player",
      process.execPath,
      [join(repoRoot, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", config.playerUrl.port],
      {
        PLAYER_PORT: config.playerUrl.port,
        SONG_PACK_PORT: config.songBaseUrl.port
      },
      logDir
    ));
    await waitForHttpOk(config.playerUrl.href, "fixture player");
  }

  return spawned;
};

const chromeCandidates = () => {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.EDGE_PATH,
    process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
    process.env.PROGRAMFILES && join(process.env.PROGRAMFILES, "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env["PROGRAMFILES(X86)"] && join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe")
  ];
  return candidates.filter(Boolean);
};

const findBrowserExecutable = () => {
  for (const candidate of chromeCandidates()) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error("Chrome or Edge executable was not found. Set CHROME_PATH to use preview:snapshot.");
};

const waitForDevToolsPort = async (profileDir, timeoutMs = 10000) => {
  const filePath = join(profileDir, "DevToolsActivePort");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(filePath)) {
      const [port] = readFileSync(filePath, "utf8").trim().split(/\r?\n/);
      if (port) return Number(port);
    }
    await delay(100);
  }
  throw new Error("Browser DevTools port was not created.");
};

class CdpSession {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.waiters = new Map();
    socket.addEventListener("message", (event) => void this.handleMessage(event.data));
    socket.addEventListener("close", () => {
      for (const { reject } of this.pending.values()) reject(new Error("CDP socket closed."));
      this.pending.clear();
    });
  }

  static connect(wsUrl) {
    return new Promise((resolveConnect, rejectConnect) => {
      const socket = new WebSocket(wsUrl);
      socket.addEventListener("open", () => resolveConnect(new CdpSession(socket)), { once: true });
      socket.addEventListener("error", () => rejectConnect(new Error("Failed to connect to browser DevTools.")), { once: true });
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) ?? [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  waitFor(method, timeoutMs = 10000) {
    return new Promise((resolveWait, rejectWait) => {
      const waiters = this.waiters.get(method) ?? [];
      const timer = setTimeout(() => {
        const current = this.waiters.get(method) ?? [];
        this.waiters.set(method, current.filter((waiter) => waiter.resolve !== resolveWait));
        rejectWait(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      waiters.push({
        resolve: (params) => {
          clearTimeout(timer);
          resolveWait(params);
        },
        reject: rejectWait
      });
      this.waiters.set(method, waiters);
    });
  }

  async handleMessage(data) {
    const text = await messageText(data);
    const message = JSON.parse(text);
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
      return;
    }
    if (!message.method) return;
    for (const handler of this.handlers.get(message.method) ?? []) handler(message.params);
    const waiters = this.waiters.get(message.method) ?? [];
    if (waiters.length) {
      const [first, ...rest] = waiters;
      this.waiters.set(message.method, rest);
      first.resolve(message.params);
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    return new Promise((resolveSend, rejectSend) => {
      this.pending.set(id, { resolve: resolveSend, reject: rejectSend });
      this.socket.send(payload);
    });
  }

  close() {
    this.socket.close();
  }
}

const messageText = async (data) => {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer).toString("utf8");
  if (data && typeof data.text === "function") return data.text();
  return String(data);
};

const remoteValueText = (value) => {
  if (!value) return "";
  if (Object.hasOwn(value, "value")) return String(value.value);
  return value.description ?? value.unserializableValue ?? "";
};

const pageAuditExpression = `(() => {
  const canvases = Array.from(document.querySelectorAll("canvas")).map((canvas, index) => {
    const rect = canvas.getBoundingClientRect();
    const info = {
      index,
      width: canvas.width,
      height: canvas.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      visible: rect.width > 1 && rect.height > 1,
      sample: null
    };
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx || canvas.width < 1 || canvas.height < 1) return info;
      const points = [];
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          points.push([
            Math.max(0, Math.min(canvas.width - 1, Math.floor((x + 0.5) * canvas.width / 5))),
            Math.max(0, Math.min(canvas.height - 1, Math.floor((y + 0.5) * canvas.height / 5)))
          ]);
        }
      }
      let opaque = 0;
      let colored = 0;
      for (const [x, y] of points) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        if (pixel[3] > 5) opaque += 1;
        if (pixel[3] > 5 && pixel[0] + pixel[1] + pixel[2] > 12) colored += 1;
      }
      info.sample = { points: points.length, opaque, colored };
      return info;
    } catch (error) {
      info.sample = { error: error instanceof Error ? error.message : String(error) };
      return info;
    }
  });
  return {
    url: location.href,
    title: document.title,
    bodyText: document.body.innerText.slice(0, 1200),
    dataStatus: document.querySelector(".data-status")?.textContent ?? "",
    canvases
  };
})()`;

const runBrowserSnapshot = async ({ options, config, snapshotDir }) => {
  const profileDir = mkdtempSync(join(tmpdir(), "music-effect-preview-chrome-"));
  mkdirSync(profileDir, { recursive: true });
  const browserPath = findBrowserExecutable();
  const browser = spawn(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--remote-debugging-port=0",
    `--user-data-dir=${profileDir}`,
    `--window-size=${options.width},${options.height}`,
    "about:blank"
  ], {
    cwd: repoRoot,
    stdio: ["ignore", "ignore", "ignore"],
    windowsHide: true
  });

  const devtoolsPort = await waitForDevToolsPort(profileDir);
  const targets = await fetchJson(`http://127.0.0.1:${devtoolsPort}/json/list`);
  const pageTarget = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error("No browser page target was available.");
  const cdp = await CdpSession.connect(pageTarget.webSocketDebuggerUrl);
  const consoleMessages = [];

  cdp.on("Runtime.consoleAPICalled", (params) => {
    consoleMessages.push({
      source: "console",
      level: params.type,
      text: (params.args ?? []).map(remoteValueText).join(" "),
      timestamp: new Date().toISOString()
    });
  });
  cdp.on("Runtime.exceptionThrown", (params) => {
    consoleMessages.push({
      source: "exception",
      level: "error",
      text: params.exceptionDetails?.text ?? "Runtime exception",
      timestamp: new Date().toISOString()
    });
  });
  cdp.on("Log.entryAdded", (params) => {
    consoleMessages.push({
      source: params.entry.source,
      level: params.entry.level,
      text: params.entry.text,
      timestamp: new Date(params.entry.timestamp).toISOString()
    });
  });

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Log.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: Math.trunc(options.width),
    height: Math.trunc(options.height),
    deviceScaleFactor: 1,
    mobile: false
  });

  const loadEvent = cdp.waitFor("Page.loadEventFired", 15000).catch(() => null);
  await cdp.send("Page.navigate", { url: config.targetUrl.href });
  await loadEvent;
  await delay(options.settleMs);

  const auditResult = await cdp.send("Runtime.evaluate", {
    expression: pageAuditExpression,
    returnByValue: true,
    awaitPromise: true
  });
  const audit = auditResult.result?.value ?? {};

  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  const screenshotPath = join(snapshotDir, "snapshot.png");
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));

  await cdp.send("Browser.close").catch(() => null);
  cdp.close();
  await delay(300);
  if (browser.exitCode === null) browser.kill();
  try {
    rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
  } catch {
    // Chrome can keep a profile lock briefly on Windows. The parent snapshot
    // directory is already ignored by Git, so a stale profile is harmless.
  }

  return {
    browserPath,
    consoleMessages,
    audit,
    screenshotPath
  };
};

const summarizeFailures = ({ audit, consoleMessages, allowConsoleErrors }) => {
  const failures = [];
  const warnings = [];
  const visibleCanvases = (audit.canvases ?? []).filter((canvas) => canvas.visible);
  if (!visibleCanvases.length) failures.push("No visible canvas was found.");
  if (audit.dataStatus && /起動エラー|boot error|error/i.test(audit.dataStatus)) {
    failures.push(`Fixture reported an error: ${audit.dataStatus}`);
  }
  const ignorableNetwork404 = (message) =>
    message.source === "network" &&
    String(message.level).toLowerCase() === "error" &&
    /status of 404|404 \(Not Found\)/i.test(message.text);
  const readbackWarning = (message) =>
    message.source === "rendering" &&
    String(message.level).toLowerCase() === "warning" &&
    /willReadFrequently/i.test(message.text);
  const errors = consoleMessages.filter((message) =>
    ["error", "assert"].includes(String(message.level).toLowerCase()) && !ignorableNetwork404(message)
  );
  const warns = consoleMessages.filter((message) =>
    String(message.level).toLowerCase() === "warning" && !readbackWarning(message)
  );
  const optional404s = consoleMessages.filter(ignorableNetwork404);
  if (errors.length && !allowConsoleErrors) failures.push(`${errors.length} console error(s) were recorded.`);
  if (warns.length) warnings.push(`${warns.length} console warning(s) were recorded.`);
  if (optional404s.length) warnings.push(`${optional404s.length} optional resource 404(s) were recorded.`);
  const readableSamples = visibleCanvases
    .map((canvas) => canvas.sample)
    .filter((sample) => sample && typeof sample.colored === "number");
  if (readableSamples.length && readableSamples.every((sample) => sample.colored === 0)) {
    warnings.push("Visible canvas pixel samples looked blank.");
  }
  const unreadable = visibleCanvases.filter((canvas) => canvas.sample?.error);
  if (unreadable.length) warnings.push(`${unreadable.length} visible canvas sample(s) could not be read.`);
  return { failures, warnings };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const config = resolveSnapshotConfig(options);
  const snapshotDir = resolve(options.outDir, `${timestampSlug()}-${safeSlug(options.song)}-${Math.round(options.time * 1000)}ms`);
  mkdirSync(snapshotDir, { recursive: true });

  const spawned = [];
  let browserResult;
  try {
    spawned.push(...await ensureServers({ options, config, logDir: snapshotDir }));
    browserResult = await runBrowserSnapshot({ options, config, snapshotDir });
    const { failures, warnings } = summarizeFailures({
      audit: browserResult.audit,
      consoleMessages: browserResult.consoleMessages,
      allowConsoleErrors: options.allowConsoleErrors
    });
    const summary = {
      ok: failures.length === 0,
      failures,
      warnings,
      createdAt: new Date().toISOString(),
      targetUrl: config.targetUrl.href,
      manifestUrl: config.manifestUrl.href,
      playerUrl: config.playerUrl.href,
      songBaseUrl: config.songBaseUrl.href,
      previewTime: options.time,
      viewport: { width: options.width, height: options.height },
      startedServers: spawned.map((item) => item.label),
      screenshot: browserResult.screenshotPath,
      browserPath: browserResult.browserPath,
      audit: browserResult.audit,
      consoleMessages: browserResult.consoleMessages
    };
    writeFileSync(join(snapshotDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    writeFileSync(
      join(snapshotDir, "console.jsonl"),
      browserResult.consoleMessages.map((message) => JSON.stringify(message)).join("\n") + "\n",
      "utf8"
    );

    console.log(`Preview snapshot: ${summary.ok ? "ok" : "failed"}`);
    console.log(`Target: ${summary.targetUrl}`);
    console.log(`Screenshot: ${summary.screenshot}`);
    console.log(`Summary: ${join(snapshotDir, "summary.json")}`);
    for (const warning of warnings) console.warn(`Warning: ${warning}`);
    for (const failure of failures) console.error(`Failure: ${failure}`);
    if (!summary.ok) process.exitCode = 1;
  } finally {
    await Promise.all(spawned.map(killChild));
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
