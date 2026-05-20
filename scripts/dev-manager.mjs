import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { platform } from "node:os";

const host = process.env.DEV_MANAGER_HOST ?? "127.0.0.1";
const port = Number(process.env.DEV_MANAGER_PORT ?? 5172);
const playerPort = Number(process.env.PLAYER_PORT ?? process.env.SYSTEM_APP_PORT ?? 5173);
const songPackPort = Number(process.env.SONG_PACK_PORT ?? 5174);
const playerUrl = `http://127.0.0.1:${playerPort}/`;
const songPackUrl = `http://127.0.0.1:${songPackPort}/`;
const defaultSongCorsOrigins = [`http://127.0.0.1:${playerPort}`, `http://localhost:${playerPort}`].join(",");
const isWindows = platform() === "win32";
const npmCommand = isWindows ? "cmd.exe" : "npm";
const npmArgs = (...args) => (isWindows ? ["/c", "npm", ...args] : args);
const allowedManagerOrigins = new Set([
  `http://${host}:${port}`,
  `http://127.0.0.1:${port}`,
  `http://localhost:${port}`
]);
const baseSecurityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer"
};

const services = {
  player: {
    label: "Fixture player",
    command: npmCommand,
    args: npmArgs("run", "dev:player", "--", "--port", String(playerPort)),
    url: playerUrl
  },
  songs: {
    label: "Song pack server",
    command: npmCommand,
    args: npmArgs("run", "dev:songs"),
    env: {
      SONG_PACK_PORT: String(songPackPort),
      SONG_PACK_CORS_ORIGINS: process.env.SONG_PACK_CORS_ORIGINS ?? defaultSongCorsOrigins
    },
    url: songPackUrl
  }
};

const state = Object.fromEntries(
  Object.keys(services).map((key) => [
    key,
    {
      process: null,
      logs: [],
      startedAt: null,
      exitCode: null
    }
  ])
);

const appendLog = (name, chunk) => {
  const entry = state[name];
  const text = chunk.toString().replace(/\r/g, "");
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    entry.logs.push(`[${new Date().toLocaleTimeString()}] ${line}`);
  }
  if (entry.logs.length > 160) entry.logs = entry.logs.slice(-160);
};

const statusOf = (name) => {
  const service = services[name];
  const entry = state[name];
  const running = Boolean(entry.process && entry.process.exitCode === null);
  return {
    name,
    label: service.label,
    running,
    pid: running ? entry.process.pid : null,
    exitCode: entry.exitCode,
    startedAt: entry.startedAt,
    url: service.url,
    logs: entry.logs
  };
};

const startService = (name) => {
  if (!services[name]) return { ok: false, error: "Unknown service" };
  const entry = state[name];
  if (entry.process && entry.process.exitCode === null) return { ok: true, status: statusOf(name) };

  const service = services[name];
  entry.exitCode = null;
  entry.startedAt = new Date().toISOString();
  entry.logs = [];
  appendLog(name, `Starting: ${service.command} ${service.args.join(" ")}`);

  const child = spawn(service.command, service.args, {
    cwd: process.cwd(),
    env: { ...process.env, ...(service.env ?? {}) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  entry.process = child;
  child.stdout.on("data", (chunk) => appendLog(name, chunk));
  child.stderr.on("data", (chunk) => appendLog(name, chunk));
  child.on("exit", (code, signal) => {
    entry.exitCode = code ?? signal ?? "unknown";
    appendLog(name, `Stopped with ${entry.exitCode}`);
  });

  return { ok: true, status: statusOf(name) };
};

const terminateProcessTree = (child) => {
  if (platform() !== "win32") {
    child.kill("SIGTERM");
    return;
  }

  const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
    windowsHide: true,
    stdio: "ignore"
  });
  killer.on("error", () => child.kill());
};

const stopService = (name) => {
  if (!services[name]) return { ok: false, error: "Unknown service" };
  const entry = state[name];
  if (!entry.process || entry.process.exitCode !== null) return { ok: true, status: statusOf(name) };
  appendLog(name, "Stopping service");
  terminateProcessTree(entry.process);
  return { ok: true, status: statusOf(name) };
};

const startAll = () => Object.keys(services).map(startService);
const stopAll = () => Object.keys(services).map(stopService);

const json = (response, status, body) => {
  response.writeHead(status, {
    ...baseSecurityHeaders,
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body, null, 2));
};

const isTrustedBrowserOrigin = (request) => {
  const origin = request.headers.origin;
  if (origin && !allowedManagerOrigins.has(origin)) return false;
  const fetchSite = request.headers["sec-fetch-site"];
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
};

const html = () => `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Music Effect Dev Manager</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #111217;
        --panel: #1c1d26;
        --line: rgba(255,255,255,.14);
        --text: #f8f2e8;
        --muted: #b9b2a8;
        --accent: #ffd98a;
        --ok: #93e6b1;
        --bad: #ffaaa5;
        font-family: "Yu Gothic UI", "Yu Gothic", Meiryo, system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: radial-gradient(circle at 18% 12%, rgba(255,217,138,.16), transparent 24rem), linear-gradient(135deg, #111217, #171923);
        color: var(--text);
      }
      main { max-width: 1120px; margin: 0 auto; padding: 28px; }
      header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 22px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      p { margin: 0; color: var(--muted); line-height: 1.7; }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; }
      button, a.launch {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 10px 14px;
        background: rgba(255,255,255,.06);
        color: var(--text);
        font: inherit;
        text-decoration: none;
        cursor: pointer;
      }
      button:hover, a.launch:hover { border-color: rgba(255,217,138,.75); }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
      .card { border: 1px solid var(--line); border-radius: 8px; background: rgba(28,29,38,.82); padding: 16px; }
      .card h2 { margin: 0 0 8px; font-size: 19px; }
      .status { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--muted); }
      .dot { width: 10px; height: 10px; border-radius: 999px; background: var(--bad); }
      .running .dot { background: var(--ok); }
      .row { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
      pre {
        overflow: auto;
        min-height: 180px;
        max-height: 340px;
        margin: 12px 0 0;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px;
        background: rgba(0,0,0,.24);
        color: #e9e0d2;
        font-size: 12px;
        line-height: 1.55;
        white-space: pre-wrap;
      }
      code { color: var(--accent); }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>Music Effect Dev Manager</h1>
          <p>fixture player と song-pack server をまとめて起動・停止します。曲ごとの構成は固定せず、ここでは検証用サーバーの起動だけを管理します。</p>
        </div>
        <div class="actions">
          <button data-action="start-all">全て起動</button>
          <button data-action="stop-all">全て停止</button>
          <a class="launch" href="${playerUrl}" target="_blank" rel="noreferrer">空のplayerを開く</a>
          <a class="launch" href="${playerUrl}?song=${songPackUrl}shining-star/manifest.json" target="_blank" rel="noreferrer">動作確認fixture</a>
          <a class="launch" href="${playerUrl}docs/workflows.html" target="_blank" rel="noreferrer">ワークフロー地図</a>
        </div>
      </header>
      <section id="services" class="grid"></section>
    </main>
    <script>
      const call = async (url, method = "GET") => {
        const response = await fetch(url, { method });
        return response.json();
      };
      const action = async (name, verb) => {
        await call("/api/" + verb + "/" + name, "POST");
        await refresh();
      };
      const element = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };
      const serviceButton = (label, key, value) => {
        const button = element("button", "", label);
        button.dataset[key] = value;
        return button;
      };
      const render = (items) => {
        const root = document.getElementById("services");
        root.replaceChildren();
        for (const item of items) {
          const card = document.createElement("article");
          card.className = "card" + (item.running ? " running" : "");
          card.append(element("h2", "", item.label));

          const status = element("div", "status");
          status.append(element("span", "dot"));
          status.append(element("span", "", (item.running ? "起動中" : "停止中") + (item.pid ? " (PID " + item.pid + ")" : "")));
          card.append(status);

          const urlLine = document.createElement("p");
          urlLine.append(element("code", "", item.url));
          card.append(urlLine);

          const row = element("div", "row");
          row.append(serviceButton("起動", "start", item.name));
          row.append(serviceButton("停止", "stop", item.name));
          row.append(serviceButton("再起動", "restart", item.name));
          const link = element("a", "launch", "開く");
          link.href = item.url;
          link.target = "_blank";
          link.rel = "noreferrer";
          row.append(link);
          card.append(row);

          card.append(element("pre", "", item.logs.length ? item.logs.join("\\n") : "ログはまだありません。"));
          root.append(card);
        }
      };
      const refresh = async () => {
        const data = await call("/api/status");
        render(data.services);
      };
      document.addEventListener("click", async (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.dataset.action === "start-all") await call("/api/start-all", "POST");
        if (target.dataset.action === "stop-all") await call("/api/stop-all", "POST");
        if (target.dataset.start) await action(target.dataset.start, "start");
        if (target.dataset.stop) await action(target.dataset.stop, "stop");
        if (target.dataset.restart) await action(target.dataset.restart, "restart");
        await refresh();
      });
      refresh();
      setInterval(refresh, 2500);
    </script>
  </body>
</html>`;

const handleApi = async (request, response, pathname) => {
  if (pathname === "/api/status") {
    json(response, 200, { services: Object.keys(services).map(statusOf) });
    return true;
  }
  if (request.method !== "POST") return false;
  if (!isTrustedBrowserOrigin(request)) {
    json(response, 403, { ok: false, error: "Forbidden origin" });
    return true;
  }
  if (pathname === "/api/start-all") {
    startAll();
    json(response, 200, { ok: true });
    return true;
  }
  if (pathname === "/api/stop-all") {
    stopAll();
    json(response, 200, { ok: true });
    return true;
  }
  const match = /^\/api\/(start|stop|restart)\/([^/]+)$/.exec(pathname);
  if (match) {
    const [, verb, name] = match;
    if (verb === "restart") {
      stopService(name);
      setTimeout(() => startService(name), 600);
      json(response, 200, { ok: true });
      return true;
    }
    const result = verb === "start" ? startService(name) : stopService(name);
    json(response, result.ok ? 200 : 404, result);
    return true;
  }
  return false;
};

const server = createServer(async (request, response) => {
  let url;
  try {
    url = new URL(request.url ?? "/", `http://${host}:${port}`);
  } catch {
    response.writeHead(400, { ...baseSecurityHeaders, "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }
  if (url.pathname.startsWith("/api/") && (await handleApi(request, response, url.pathname))) return;
  response.writeHead(200, { ...baseSecurityHeaders, "Content-Type": "text/html; charset=utf-8" });
  response.end(html());
});

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});

server.listen(port, host, () => {
  console.log(`Dev manager: http://${host}:${port}/`);
  startAll();
});
