import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { findFreePort, stablePortBaseFor } from "../launch-manager/ports.mjs";
import {
  defaultRepoRoot,
  formatInstallResult,
  installLyricsDataFromText,
  listInstalledSongs,
  MAX_LYRICS_TEXT_LENGTH,
  MAX_TIMING_TEXT_LENGTH
} from "./install.mjs";

const repoRoot = defaultRepoRoot;
const host = "127.0.0.1";
const MAX_REQUEST_BYTES = 6 * 1024 * 1024;

const baseSecurityHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()"
};

const htmlSecurityHeaders = (nonce) => ({
  ...baseSecurityHeaders,
  "Content-Security-Policy": [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'"
  ].join("; ")
});

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    ...baseSecurityHeaders,
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(body, null, 2));
};

const sendText = (response, status, body) => {
  response.writeHead(status, {
    ...baseSecurityHeaders,
    "Content-Type": "text/plain; charset=utf-8"
  });
  response.end(body);
};

const assertText = (value, label, maxLength) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label}を選んでください。`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label}が大きすぎます。`);
  }
};

const readRequestBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_REQUEST_BYTES) {
        reject(new Error("リクエストが大きすぎます。"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });

const originMatchesRequestHost = (origin, requestHost) => {
  if (!origin || !requestHost) return false;
  try {
    const url = new URL(origin);
    return (url.protocol === "http:" || url.protocol === "https:") && url.host === requestHost;
  } catch {
    return false;
  }
};

const installFromUpload = (payload) => {
  const id = String(payload.id ?? "").trim();
  assertText(payload.timingText, "timing JSON", MAX_TIMING_TEXT_LENGTH);
  const lyricsText = typeof payload.lyricsText === "string" ? payload.lyricsText : "";
  if (lyricsText.length > MAX_LYRICS_TEXT_LENGTH) {
    throw new Error("lyrics txtが大きすぎます。");
  }

  const result = installLyricsDataFromText({
    root: repoRoot,
    id,
    timingText: payload.timingText,
    lyricsText: lyricsText.trim() ? lyricsText : null,
    name: payload.name,
    force: Boolean(payload.force)
  });

  return {
    ...result,
    stdout: formatInstallResult(result),
    stderr: ""
  };
};

const installerHtml = (nonce) => `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Lyrics Data Installer</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: dark;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: #0f1117;
      color: #f4efe5;
    }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(32, 36, 46, 0.96), rgba(13, 15, 21, 0.98)),
        #0f1117;
    }
    main {
      width: min(1040px, calc(100vw - 40px));
      margin: 0 auto;
      padding: 42px 0 64px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 30px;
      letter-spacing: 0;
    }
    p {
      color: #c9c2b7;
      line-height: 1.65;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
      gap: 18px;
      margin-top: 24px;
      align-items: start;
    }
    .panel {
      border: 1px solid rgba(255, 209, 128, 0.26);
      background: rgba(31, 29, 26, 0.92);
      border-radius: 8px;
      padding: 18px;
    }
    label {
      display: grid;
      gap: 7px;
      margin-bottom: 16px;
      font-weight: 700;
      color: #fff7e7;
    }
    .hint {
      display: block;
      font-size: 12px;
      color: #aaa196;
      font-weight: 500;
    }
    select,
    input[type="text"],
    input[type="file"] {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #55525d;
      border-radius: 7px;
      background: #252631;
      color: #fffaf0;
      padding: 10px 12px;
      font: inherit;
    }
    select option {
      background: #252631;
      color: #fffaf0;
    }
    .row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }
    .check {
      display: flex;
      gap: 9px;
      align-items: center;
      margin: 8px 0 18px;
      color: #dfd6c7;
      font-weight: 600;
    }
    button {
      border: 1px solid rgba(255, 209, 128, 0.42);
      background: #f6c45d;
      color: #17130d;
      border-radius: 7px;
      padding: 10px 14px;
      min-height: 42px;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    button.secondary {
      background: #272832;
      color: #fff7e7;
      border-color: #5f5b66;
    }
    button:disabled {
      opacity: 0.55;
      cursor: wait;
    }
    .song-card,
    .result {
      border: 1px solid #3e414d;
      border-radius: 8px;
      background: #181a23;
      padding: 14px;
      margin-top: 12px;
      overflow-wrap: anywhere;
    }
    .song-card strong {
      display: block;
      margin-bottom: 5px;
    }
    code,
    pre {
      font-family: "Cascadia Code", Consolas, monospace;
      font-size: 12px;
    }
    pre {
      white-space: pre-wrap;
      color: #f2e8d2;
      background: #101219;
      border-radius: 7px;
      padding: 12px;
      border: 1px solid #333743;
      max-height: 280px;
      overflow: auto;
    }
    .warn {
      color: #ffcf7a;
    }
    .ok {
      color: #91e0ad;
    }
    @media (max-width: 860px) {
      main {
        width: min(100vw - 24px, 1040px);
        padding-top: 24px;
      }
      .layout {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>Lyrics Data Installer</h1>
    <p>Launch Managerとは別の、曲パックへ歌詞タイミングJSONを入れるためだけのローカルGUIです。音源解析はしません。</p>
    <section class="layout">
      <form id="install-form" class="panel">
        <label>
          曲パック
          <select id="song-select" required></select>
          <span class="hint"><code>song-packs/&lt;song-id&gt;/manifest.json</code> がある曲だけ表示します。</span>
        </label>
        <label>
          保存名
          <input id="name-input" type="text" placeholder="例: live / rehearsal / 2026-show" />
          <span class="hint">空ならtiming JSONのslug、または曲IDを使います。同名を入れ直す場合は下の上書きを使います。</span>
        </label>
        <label>
          timing v2 JSON
          <input id="timing-file" type="file" accept=".json,application/json" required />
          <span class="hint">Lyric Timing Editor の <code>music-effect.lyrics-timing.v2</code> exportを選びます。</span>
        </label>
        <label>
          lyrics txt
          <input id="lyrics-file" type="file" accept=".txt,text/plain" />
          <span class="hint">timing-only export (<code>includesLyrics: false</code>) のときだけ必要です。UTF-8推奨。</span>
        </label>
        <label class="check">
          <input id="force-input" type="checkbox" />
          既存ファイルを上書きする
        </label>
        <div class="row">
          <button id="install-button" type="submit">曲パックへ入れる</button>
          <button id="reload-button" class="secondary" type="button">曲一覧を更新</button>
        </div>
      </form>
      <aside class="panel">
        <h2>選択中</h2>
        <div id="song-info" class="song-card">曲一覧を読み込み中です。</div>
        <h2>結果</h2>
        <div id="result" class="result">まだ実行していません。</div>
      </aside>
    </section>
  </main>
  <script nonce="${nonce}">
    const songSelect = document.querySelector("#song-select");
    const songInfo = document.querySelector("#song-info");
    const resultBox = document.querySelector("#result");
    const form = document.querySelector("#install-form");
    const installButton = document.querySelector("#install-button");
    const reloadButton = document.querySelector("#reload-button");
    let songs = [];

    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

    const selectedSong = () => songs.find((song) => song.id === songSelect.value);

    const renderSongInfo = () => {
      const song = selectedSong();
      if (!song) {
        songInfo.innerHTML = "曲パックが見つかりません。";
        return;
      }
      songInfo.innerHTML = \`
        <strong>\${escapeHtml(song.title)}</strong>
        <div>\${escapeHtml(song.artist || "Unknown artist")}</div>
        <div><code>\${escapeHtml(song.id)}</code></div>
        <div>lyrics: <code>\${escapeHtml(song.lyrics || "(none)")}</code></div>
        <div>timing: <code>\${escapeHtml(song.timing || "(none)")}</code></div>
      \`;
    };

    const loadSongs = async () => {
      const response = await fetch("/api/songs");
      const data = await response.json();
      songs = data.songs || [];
      songSelect.innerHTML = songs.map((song) =>
        \`<option value="\${escapeHtml(song.id)}">\${escapeHtml(song.title)} / \${escapeHtml(song.artist || song.id)}</option>\`
      ).join("");
      renderSongInfo();
    };

    const fileText = async (selector) => {
      const file = document.querySelector(selector).files[0];
      return file ? await file.text() : "";
    };

    const setResult = (html, className = "") => {
      resultBox.className = \`result \${className}\`.trim();
      resultBox.innerHTML = html;
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      installButton.disabled = true;
      setResult("投入中です...");
      try {
        const timingText = await fileText("#timing-file");
        const lyricsText = await fileText("#lyrics-file");
        const response = await fetch("/api/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: songSelect.value,
            name: document.querySelector("#name-input").value,
            timingText,
            lyricsText,
            force: document.querySelector("#force-input").checked
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "install failed");
        setResult(\`
          <div class="ok">投入しました。</div>
          <pre>\${escapeHtml(data.stdout || "")}</pre>
          \${data.stderr ? \`<pre class="warn">\${escapeHtml(data.stderr)}</pre>\` : ""}
          <div>次に確認:</div>
          <pre>\${escapeHtml((data.next || []).join("\\n"))}</pre>
        \`, "ok");
        await loadSongs();
      } catch (error) {
        setResult(\`<div class="warn">\${escapeHtml(error.message || String(error))}</div>\`, "warn");
      } finally {
        installButton.disabled = false;
      }
    });

    reloadButton.addEventListener("click", () => {
      loadSongs().catch((error) => setResult(\`<div class="warn">\${escapeHtml(error.message)}</div>\`, "warn"));
    });
    songSelect.addEventListener("change", renderSongInfo);
    loadSongs().catch((error) => setResult(\`<div class="warn">\${escapeHtml(error.message)}</div>\`, "warn"));
  </script>
</body>
</html>`;

const handleRequest = async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (request.method === "GET" && url.pathname === "/") {
    const nonce = randomBytes(16).toString("base64");
    response.writeHead(200, {
      ...htmlSecurityHeaders(nonce),
      "Content-Type": "text/html; charset=utf-8"
    });
    response.end(installerHtml(nonce));
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/songs") {
    sendJson(response, 200, { songs: listInstalledSongs({ root: repoRoot }) });
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/install") {
    const origin = request.headers.origin;
    if (origin && !originMatchesRequestHost(origin, request.headers.host)) {
      sendJson(response, 403, { error: "不正なOriginです。" });
      return;
    }
    try {
      const body = await readRequestBody(request);
      const payload = JSON.parse(body);
      sendJson(response, 200, installFromUpload(payload));
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  sendText(response, 404, "Not found");
};

export const startLyricsInstallerGui = async ({ port = null } = {}) => {
  const base = stablePortBaseFor(`${repoRoot}:lyrics-installer`);
  const requestedPort = Number(process.env.LYRICS_INSTALLER_PORT || 0);
  const resolvedPort = port ?? (requestedPort || (await findFreePort({ start: base, host })));
  const server = createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    });
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(resolvedPort, host, resolveListen);
  });
  const url = `http://${host}:${resolvedPort}/`;
  console.log(`Lyrics Data Installer: ${url}`);
  console.log("This is separate from Launch Manager. Press Ctrl+C to stop.");
  return { server, url, port: resolvedPort };
};
