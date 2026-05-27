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

export const installerHtml = (nonce) => `<!doctype html>
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
    .write-preview {
      border: 1px solid rgba(145, 224, 173, 0.24);
      border-radius: 8px;
      background: rgba(145, 224, 173, 0.06);
      padding: 12px;
      margin: 8px 0 16px;
    }
    .write-preview.is-warn {
      border-color: rgba(255, 207, 122, 0.34);
      background: rgba(255, 207, 122, 0.07);
    }
    .write-preview h3 {
      margin: 0 0 8px;
      font-size: 15px;
    }
    .manifest-compare {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin: 10px 0;
      table-layout: fixed;
    }
    .manifest-compare th,
    .manifest-compare td {
      border: 1px solid rgba(255, 255, 255, 0.12);
      padding: 8px 9px;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    .manifest-compare thead th {
      color: #fff7e7;
      background: rgba(255, 255, 255, 0.07);
      text-align: left;
    }
    .manifest-compare tbody th {
      width: 150px;
      color: #d8cebf;
      font-weight: 700;
      text-align: left;
      background: rgba(255, 255, 255, 0.04);
    }
    .cell-note {
      display: block;
      margin-top: 5px;
      color: #bdb4a7;
      font-size: 12px;
      line-height: 1.45;
    }
    .input-summary {
      margin: 8px 0 0;
      color: #d8cebf;
      font-size: 13px;
    }
    .preview-note {
      margin: 8px 0 0;
      font-size: 13px;
      color: #ded5c5;
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
    <p>Launch Managerとは別の、Lyric Timing Editorのv2 exportを曲パック内の<code>lyrics/</code>へ書き込み、<code>manifest.json</code>を更新するローカルGUIです。音源解析はしません。</p>
    <section class="layout">
      <form id="install-form" class="panel">
        <label>
          曲パック
          <select id="song-select" required></select>
          <span class="hint"><code>song-packs/&lt;song-id&gt;/manifest.json</code> がある曲だけ表示します。</span>
        </label>
        <label>
          保存ファイル名（拡張子なし）
          <input id="name-input" type="text" placeholder="例: live / rehearsal / 2026-show" />
          <span class="hint">この名前で <code>song-packs/&lt;song-id&gt;/lyrics/&lt;name&gt;.timing.v2.json</code> を作ります。lyrics txtも入れる場合は <code>&lt;name&gt;.lyrics.txt</code> も作ります。空ならtiming JSONのslug、なければ曲IDを使います。</span>
        </label>
        <label>
          歌詞タイミング v2 JSON
          <input id="timing-file" type="file" accept=".json,application/json" required />
          <span class="hint">Lyric Timing Editor の <code>music-effect.lyrics-timing.v2</code> exportを選びます。拡張子だけでは判定できないため、選択後と書き込み時にJSONのschemaを検査します。</span>
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
        <div id="write-preview" class="write-preview is-warn">
          歌詞タイミング v2 JSONを選ぶと、現在の設定と書き込み予定をここに表示します。
        </div>
        <div class="row">
          <button id="install-button" type="submit">曲パックへ書き込む</button>
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
    const timingFileInput = document.querySelector("#timing-file");
    const lyricsFileInput = document.querySelector("#lyrics-file");
    const nameInput = document.querySelector("#name-input");
    const forceInput = document.querySelector("#force-input");
    const writePreview = document.querySelector("#write-preview");
    let songs = [];
    let timingState = { status: "empty", json: null, error: "" };
    let installBusy = false;

    const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

    const selectedSong = () => songs.find((song) => song.id === songSelect.value);
    const sanitizeName = (value) => {
      const name = String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^[._-]+|[._-]+$/g, "")
        .slice(0, 64);
      return name || "lyrics";
    };
    const inferredFileName = (song, timingJson) =>
      sanitizeName(nameInput.value || timingJson?.slug || song?.id || "lyrics");
    const pathForName = (song, fileName, suffix) =>
      song ? \`./lyrics/\${fileName}\${suffix}\` : "";
    const updateInstallButton = () => {
      installButton.disabled = installBusy || timingState.status !== "valid";
    };

    const renderSongInfo = () => {
      const song = selectedSong();
      if (!song) {
        songInfo.innerHTML = "曲パックが見つかりません。";
        renderWritePreview();
        return;
      }
      songInfo.innerHTML = \`
        <strong>\${escapeHtml(song.title)}</strong>
        <div>\${escapeHtml(song.artist || "Unknown artist")}</div>
        <div><code>\${escapeHtml(song.id)}</code></div>
        <div>lyrics: <code>\${escapeHtml(song.lyrics || "(none)")}</code></div>
        <div>timing: <code>\${escapeHtml(song.timing || "(none)")}</code></div>
      \`;
      renderWritePreview();
    };

    const loadSongs = async (preferredId = songSelect.value) => {
      const response = await fetch("/api/songs");
      const data = await response.json();
      songs = data.songs || [];
      songSelect.innerHTML = songs.map((song) =>
        \`<option value="\${escapeHtml(song.id)}">\${escapeHtml(song.title)} / \${escapeHtml(song.artist || song.id)}</option>\`
      ).join("");
      if (preferredId && songs.some((song) => song.id === preferredId)) {
        songSelect.value = preferredId;
      }
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

    const renderWritePreview = () => {
      const song = selectedSong();
      if (!song) {
        writePreview.className = "write-preview is-warn";
        writePreview.innerHTML = "曲パックを選ぶと、現在の設定と書き込み予定をここに表示します。";
        updateInstallButton();
        return;
      }
      if (timingState.status === "empty") {
        writePreview.className = "write-preview is-warn";
        writePreview.innerHTML = "歌詞タイミング v2 JSONを選ぶと、現在の設定と書き込み予定をここに表示します。";
        updateInstallButton();
        return;
      }
      if (timingState.status === "checking") {
        writePreview.className = "write-preview is-warn";
        writePreview.innerHTML = "選択したJSONのschemaを確認中です。確認が終わるまで書き込みはできません。";
        updateInstallButton();
        return;
      }
      if (timingState.status === "invalid") {
        writePreview.className = "write-preview is-warn";
        writePreview.innerHTML = \`
          <h3>このファイルはまだ書き込めません</h3>
          <p class="preview-note">\${escapeHtml(timingState.error)}</p>
          <p class="preview-note">Lyric Timing Editorの <strong>Project保存</strong> ではなく、<strong>Export</strong> から出した <code>music-effect.lyrics-timing.v2</code> JSONを選んでください。</p>
        \`;
        updateInstallButton();
        return;
      }

      const timingJson = timingState.json;
      const fileName = inferredFileName(song, timingJson);
      const nextTiming = pathForName(song, fileName, ".timing.v2.json");
      const hasLyricsFile = Boolean(lyricsFileInput.files[0]);
      const currentLyrics = song.lyrics || "(none)";
      const currentTiming = song.timing || "(none)";
      const nextManifestLyrics = hasLyricsFile
        ? pathForName(song, fileName, ".lyrics.txt")
        : timingJson.includesLyrics === true
          ? "null"
          : (song.lyrics || "(現状維持)");
      const currentLyricSource = song.lyrics ? "manifest lyrics のtxt" : "(未設定)";
      const nextLyricSource = hasLyricsFile
        ? \`\${pathForName(song, fileName, ".lyrics.txt")} のtxt\`
        : timingJson.includesLyrics === true
          ? "timing JSON内の phrases[].text"
          : (song.lyrics ? "既存のmanifest lyricsを使う" : "(未設定)");
      const nextLyricsNote = hasLyricsFile
        ? "選択したlyrics txtをコピーし、manifestのlyrics参照に設定します。"
        : timingJson.includesLyrics === true
          ? "歌詞本文はtiming JSON内にあります。manifestのlyrics参照はnullになりますが、歌詞が消えるわけではありません。"
          : "timing-only exportなので、既存のmanifest lyrics参照を使います。";
      const mode = timingJson.includesLyrics === false ? "timing-only" : "with-lyrics";
      const sourceTitle = timingJson.title || "(未記入)";
      const sourceArtist = timingJson.artist || "(未記入)";
      const overwriteNotice = forceInput.checked
        ? "上書きON: 同じ保存ファイル名の timing/lyrics ファイルがあれば置き換えます。"
        : "上書きOFF: 同じ保存ファイル名のファイルが既にあれば停止します。";
      const slugNotice = timingState.warning
        ? \`<p class="preview-note warn">\${escapeHtml(timingState.warning)}</p>\`
        : "";

      writePreview.className = "write-preview";
      writePreview.innerHTML = \`
        <h3>書き込み前の確認</h3>
        <p class="input-summary">曲パック: <strong>\${escapeHtml(song.title)}</strong> / \${escapeHtml(song.artist || "Unknown artist")} / <code>\${escapeHtml(song.id)}</code></p>
        <table class="manifest-compare" aria-label="manifest書き込み前後の比較">
          <thead>
            <tr>
              <th>manifest項目</th>
              <th>現在</th>
              <th>書き込み後</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th><code>lyrics</code></th>
              <td><code>\${escapeHtml(currentLyrics)}</code></td>
              <td>
                <code>\${escapeHtml(nextManifestLyrics)}</code>
                <span class="cell-note">\${escapeHtml(nextLyricsNote)}</span>
              </td>
            </tr>
            <tr>
              <th><code>analysis.timing</code></th>
              <td><code>\${escapeHtml(currentTiming)}</code></td>
              <td><code>\${escapeHtml(nextTiming)}</code></td>
            </tr>
            <tr>
              <th>歌詞本文の取得元</th>
              <td>\${escapeHtml(currentLyricSource)}</td>
              <td>\${escapeHtml(nextLyricSource)}</td>
            </tr>
          </tbody>
        </table>
        <p class="input-summary">入力JSON: \${escapeHtml(mode)} / title: \${escapeHtml(sourceTitle)} / artist: \${escapeHtml(sourceArtist)}</p>
        <p class="preview-note">曲名・アーティスト・曲IDなど、曲パック本体の情報はこの操作では変更しません。入力JSON側のtitleやartistが空欄でも、曲パックの表示名を空欄で上書きすることはありません。</p>
        \${slugNotice}
        <p class="preview-note">\${escapeHtml(overwriteNotice)}</p>
        <p class="preview-note">manifest.jsonで更新するのは基本的に <code>lyrics</code> と <code>analysis.timing</code> の参照先だけです。</p>
      \`;
      updateInstallButton();
    };

    const checkTimingFile = async () => {
      const file = timingFileInput.files[0];
      if (!file) {
        timingState = { status: "empty", json: null, error: "" };
        setResult("まだ実行していません。");
        renderWritePreview();
        return;
      }
      if (!file.name.toLowerCase().endsWith(".json")) {
        timingState = { status: "invalid", json: null, error: "JSONファイルを選んでください。" };
        setResult('<div class="warn">JSONファイルを選んでください。</div>', "warn");
        renderWritePreview();
        return;
      }
      timingState = { status: "checking", json: null, error: "" };
      setResult("JSONのschemaを確認中です...");
      renderWritePreview();
      try {
        const json = JSON.parse(await file.text());
        if (json && json.schema === "music-effect.lyrics-timing.v2") {
          const mode = json.includesLyrics === false ? "timing-only" : json.includesLyrics === true ? "with-lyrics" : "includesLyrics未指定";
          const duplicateSuffixWarning = !json.slug && /\\s\\(\\d+\\)\\.json$/i.test(file.name)
            ? "このv2 exportにはslugがなく、ファイル名にChromeの重複サフィックスが付いています。保存ファイル名を明示すると、次回以降も同じ名前で安全に上書きできます。"
            : "";
          timingState = { status: "valid", json, error: "", fileName: file.name, warning: duplicateSuffixWarning };
          setResult(\`
            <div class="ok">v2 timing JSONとして読めます。</div>
            <div>\${escapeHtml(mode)}</div>
            \${duplicateSuffixWarning ? \`<div class="warn">\${escapeHtml(duplicateSuffixWarning)}</div>\` : ""}
          \`, duplicateSuffixWarning ? "warn" : "ok");
        } else if (json && json.schema === "lyric-timing-editor.project.v1") {
          const message = "これはLyric Timing Editorの作業用Project JSONです。Music Effectへ入れるには、Lyric Timing Editorで Export -> Music Effect v2 を選び、そのJSONを指定してください。";
          timingState = { status: "invalid", json: null, error: message };
          setResult(\`<div class="warn">\${escapeHtml(message)}</div>\`, "warn");
        } else {
          timingState = { status: "invalid", json: null, error: "このJSONは music-effect.lyrics-timing.v2 exportではありません。" };
          setResult('<div class="warn">このJSONは <code>music-effect.lyrics-timing.v2</code> exportではありません。</div>', "warn");
        }
      } catch (error) {
        timingState = { status: "invalid", json: null, error: "JSONとして読めません: " + (error.message || String(error)) };
        setResult(\`<div class="warn">JSONとして読めません: \${escapeHtml(error.message || String(error))}</div>\`, "warn");
      }
      renderWritePreview();
    };

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (timingState.status !== "valid") {
        renderWritePreview();
        setResult('<div class="warn">書き込み前に <code>music-effect.lyrics-timing.v2</code> export JSONを選んでください。</div>', "warn");
        return;
      }
      installBusy = true;
      updateInstallButton();
      setResult("投入中です...");
      try {
        const targetId = songSelect.value;
        const timingText = await fileText("#timing-file");
        const lyricsText = await fileText("#lyrics-file");
        const response = await fetch("/api/install", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetId,
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
        await loadSongs(targetId);
      } catch (error) {
        const message = error instanceof TypeError && /fetch/i.test(error.message || "")
          ? "Lyrics Data Installerサーバーに接続できません。古いタブを開いているか、サーバーが停止している可能性があります。ターミナルで npm run song:lyrics:gui を起動し直し、表示されたURLを開き直してください。"
          : error.message || String(error);
        setResult(\`<div class="warn">\${escapeHtml(message)}</div>\`, "warn");
      } finally {
        installBusy = false;
        updateInstallButton();
      }
    });

    reloadButton.addEventListener("click", () => {
      loadSongs().catch((error) => setResult(\`<div class="warn">\${escapeHtml(error.message)}</div>\`, "warn"));
    });
    songSelect.addEventListener("change", renderSongInfo);
    nameInput.addEventListener("input", renderWritePreview);
    lyricsFileInput.addEventListener("change", renderWritePreview);
    forceInput.addEventListener("change", renderWritePreview);
    timingFileInput.addEventListener("change", () => {
      checkTimingFile().catch((error) => setResult(\`<div class="warn">\${escapeHtml(error.message)}</div>\`, "warn"));
    });
    updateInstallButton();
    loadSongs().catch((error) => {
      const message = error instanceof TypeError && /fetch/i.test(error.message || "")
        ? "Lyrics Data Installerサーバーに接続できません。ターミナルで npm run song:lyrics:gui を起動し直し、表示されたURLを開き直してください。"
        : error.message;
      setResult(\`<div class="warn">\${escapeHtml(message)}</div>\`, "warn");
    });
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
