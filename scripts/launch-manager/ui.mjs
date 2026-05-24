const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const managerHtml = ({ title, nonce }) => `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style nonce="${escapeHtml(nonce)}">
      :root {
        color-scheme: dark;
        --bg: #101116;
        --panel: #1a1c24;
        --panel-2: #20232e;
        --line: rgba(255, 255, 255, 0.14);
        --line-strong: rgba(255, 255, 255, 0.26);
        --text: #f8f2e8;
        --muted: #b8b1a8;
        --accent: #ffd98a;
        --ok: #93e6b1;
        --warn: #ffd07d;
        --bad: #ffaaa5;
        --info: #9fd4ff;
        --primary: #f5c35f;
        --primary-text: #18130a;
        font-family: "Yu Gothic UI", "Yu Gothic", Meiryo, system-ui, sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: var(--bg);
        color: var(--text);
      }
      main {
        width: min(1180px, calc(100vw - 32px));
        margin: 0 auto;
        padding: 26px 0 36px;
      }
      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 18px;
      }
      h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.2; }
      h2 { margin: 0; font-size: 18px; }
      p { margin: 0; color: var(--muted); line-height: 1.7; }
      .toolbar, .target-actions, .links, .song-actions, .flow-steps, .map-legend, .sync-tabs, .sync-controls, .sync-summary, .participant-stats {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .song-launcher {
        border: 1px solid rgba(255, 217, 138, 0.34);
        border-radius: 8px;
        padding: 18px;
        margin-bottom: 16px;
        background: linear-gradient(180deg, rgba(255, 217, 138, 0.1), rgba(255, 255, 255, 0.035));
      }
      .song-launcher h2 {
        margin-bottom: 6px;
        font-size: 22px;
      }
      .flow-steps {
        margin: 16px 0;
      }
      .step {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 34px;
        padding: 6px 10px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.16);
        color: var(--muted);
        font-size: 13px;
      }
      .step strong {
        display: inline-grid;
        place-items: center;
        width: 22px;
        height: 22px;
        border-radius: 999px;
        background: rgba(245, 195, 95, 0.18);
        color: var(--accent);
        font-size: 12px;
      }
      .song-form {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) auto;
        gap: 12px;
        align-items: end;
      }
      label {
        display: grid;
        gap: 6px;
        color: var(--muted);
        font-size: 13px;
      }
      .song-meta {
        margin-top: 12px;
        color: var(--text);
        overflow-wrap: anywhere;
      }
      .message {
        min-height: 24px;
        margin-top: 10px;
        color: var(--muted);
      }
      .message.is-ok { color: var(--ok); }
      .message.is-warn { color: var(--warn); }
      .message.is-error { color: var(--bad); }
      .runtime-strip {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 12px;
        color: var(--muted);
        font-size: 13px;
      }
      .runtime-pill {
        max-width: 100%;
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 5px 9px;
        background: rgba(0, 0, 0, 0.15);
        overflow-wrap: anywhere;
      }
      .sync-board {
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 8px;
        margin-bottom: 16px;
        padding: 16px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
          var(--panel);
      }
      .sync-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      .sync-head h2 {
        margin-bottom: 4px;
        font-size: 20px;
      }
      .sync-summary {
        justify-content: flex-end;
        min-width: 280px;
      }
      .sync-pill {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 5px 9px;
        background: rgba(0, 0, 0, 0.15);
        color: var(--muted);
        font-size: 12px;
      }
      .sync-pill.is-open { color: var(--warn); border-color: rgba(255, 208, 125, 0.5); }
      .sync-controls {
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .sync-tabs {
        align-items: stretch;
      }
      .sync-tab.is-active {
        border-color: rgba(159, 212, 255, 0.72);
        background: rgba(159, 212, 255, 0.12);
        color: var(--info);
      }
      .sync-filter {
        grid-template-columns: auto minmax(180px, 1fr);
        align-items: center;
        gap: 8px;
      }
      .sync-layout {
        display: grid;
        grid-template-columns: minmax(220px, 0.32fr) minmax(0, 1fr);
        gap: 12px;
      }
      .participant-list {
        display: grid;
        gap: 8px;
        align-content: start;
      }
      .participant-row {
        display: block;
        width: 100%;
        min-height: 0;
        padding: 10px;
        text-align: left;
      }
      .participant-row.is-active {
        border-color: rgba(255, 217, 138, 0.7);
        background: rgba(255, 217, 138, 0.1);
      }
      .participant-name {
        display: block;
        color: var(--text);
        font-weight: 700;
        overflow-wrap: anywhere;
      }
      .participant-stats {
        margin-top: 6px;
        color: var(--muted);
        font-size: 12px;
      }
      .sync-feed {
        display: grid;
        gap: 10px;
        align-content: start;
      }
      .sync-event {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px;
        background: rgba(0, 0, 0, 0.14);
      }
      .sync-event.is-open {
        border-color: rgba(255, 208, 125, 0.58);
        background: rgba(255, 208, 125, 0.07);
      }
      .sync-event-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      .sync-event-title {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        min-width: 0;
      }
      .sync-event-title strong {
        overflow-wrap: anywhere;
      }
      .sync-badge {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 3px 8px;
        color: var(--muted);
        font-size: 12px;
      }
      .sync-badge.is-ready { color: var(--ok); border-color: rgba(147, 230, 177, 0.45); }
      .sync-badge.is-question, .sync-badge.is-blocker { color: var(--warn); border-color: rgba(255, 208, 125, 0.5); }
      .sync-badge.is-ack { color: var(--info); border-color: rgba(159, 212, 255, 0.45); }
      .sync-event time {
        color: var(--muted);
        font-size: 12px;
        white-space: nowrap;
      }
      .sync-message {
        color: var(--text);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .sync-event-meta {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
        color: var(--muted);
        font-size: 12px;
      }
      .sync-empty {
        border: 1px dashed var(--line);
        border-radius: 8px;
        padding: 16px;
        color: var(--muted);
        text-align: center;
      }
      .system-map {
        border: 1px solid rgba(159, 212, 255, 0.26);
        border-radius: 8px;
        margin-bottom: 16px;
        padding: 16px;
        background:
          linear-gradient(180deg, rgba(159, 212, 255, 0.08), rgba(255, 255, 255, 0.03)),
          var(--panel);
      }
      .map-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 12px;
      }
      .map-head h2 {
        margin-bottom: 4px;
        font-size: 20px;
      }
      .map-summary {
        min-width: 128px;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.16);
        color: var(--text);
        text-align: right;
        font-weight: 700;
      }
      .map-stage {
        overflow-x: auto;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        background:
          linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
          rgba(0, 0, 0, 0.18);
        background-size: 34px 34px;
      }
      .system-map svg {
        display: block;
        width: 100%;
        min-width: 860px;
        height: auto;
      }
      .map-edge {
        fill: none;
        stroke: rgba(184, 177, 168, 0.42);
        stroke-width: 2;
        stroke-linecap: round;
      }
      .map-edge.is-related { stroke: rgba(255, 217, 138, 0.52); }
      .map-edge.is-active {
        stroke: rgba(147, 230, 177, 0.82);
        filter: drop-shadow(0 0 5px rgba(147, 230, 177, 0.52));
      }
      .map-node rect {
        fill: rgba(26, 28, 36, 0.96);
        stroke: rgba(255, 255, 255, 0.18);
        stroke-width: 1.2;
      }
      .map-node text {
        fill: var(--text);
        font-size: 14px;
        font-weight: 700;
      }
      .map-node .node-subtitle {
        fill: var(--muted);
        font-size: 12px;
        font-weight: 400;
      }
      .map-node .node-status {
        fill: var(--muted);
        font-size: 11px;
        font-weight: 400;
      }
      .node-dot {
        fill: var(--muted);
      }
      .map-node.is-running rect {
        stroke: rgba(147, 230, 177, 0.9);
        filter: drop-shadow(0 0 8px rgba(147, 230, 177, 0.28));
      }
      .map-node.is-running .node-dot {
        fill: var(--ok);
        filter: drop-shadow(0 0 6px rgba(147, 230, 177, 0.9));
        animation: nodePulse 1.9s ease-in-out infinite;
      }
      .map-node.is-starting rect, .map-node.is-stopping rect {
        stroke: rgba(255, 208, 125, 0.9);
      }
      .map-node.is-starting .node-dot, .map-node.is-stopping .node-dot {
        fill: var(--warn);
        animation: nodePulse 1.1s ease-in-out infinite;
      }
      .map-node.is-error rect {
        stroke: rgba(255, 170, 165, 0.95);
      }
      .map-node.is-error .node-dot { fill: var(--bad); }
      .map-node.is-song rect {
        stroke: rgba(245, 195, 95, 0.66);
        fill: rgba(60, 48, 26, 0.9);
      }
      .map-node.is-required rect {
        stroke-width: 2;
      }
      .map-legend {
        margin-top: 10px;
        color: var(--muted);
        font-size: 12px;
      }
      .legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .legend-dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: var(--muted);
      }
      .legend-dot.is-running { background: var(--ok); box-shadow: 0 0 9px rgba(147, 230, 177, 0.9); }
      .legend-dot.is-starting { background: var(--warn); }
      .legend-dot.is-error { background: var(--bad); }
      .manual-panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        margin-bottom: 16px;
        background: rgba(255, 255, 255, 0.035);
        overflow: hidden;
      }
      .manual-panel summary {
        cursor: pointer;
        padding: 13px 14px;
        color: var(--info);
      }
      .toolbar {
        padding: 14px;
        border-top: 1px solid var(--line);
      }
      select, button, a.launch {
        min-height: 40px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.06);
        color: var(--text);
        font: inherit;
      }
      select { padding: 0 12px; min-width: 210px; }
      select option {
        background: #25262c;
        color: #fff7e6;
      }
      select option:disabled {
        color: #a9a398;
      }
      button, a.launch {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 9px 13px;
        text-decoration: none;
        cursor: pointer;
      }
      button:hover, a.launch:hover { border-color: rgba(255, 217, 138, 0.76); }
      button:disabled { opacity: 0.5; cursor: wait; }
      .primary {
        min-width: 180px;
        border-color: rgba(245, 195, 95, 0.85);
        background: var(--primary);
        color: var(--primary-text);
        font-weight: 700;
      }
      .secondary {
        min-width: 134px;
      }
      .danger { border-color: rgba(255, 170, 165, 0.45); }
      .danger.armed {
        border-color: rgba(255, 170, 165, 0.9);
        background: rgba(255, 170, 165, 0.14);
        color: var(--bad);
      }
      .note {
        margin-bottom: 18px;
        border: 1px solid rgba(255, 208, 125, 0.32);
        border-radius: 8px;
        padding: 12px 14px;
        background: rgba(255, 208, 125, 0.06);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
        gap: 14px;
      }
      .status-heading {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 16px;
        margin: 20px 0 10px;
      }
      .status-heading h2 {
        font-size: 20px;
      }
      .target {
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--panel);
        overflow: hidden;
      }
      .target-head, .target-body { padding: 14px; }
      .target-head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--line);
        background: var(--panel-2);
      }
      .status {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        min-width: 108px;
        justify-content: flex-end;
        color: var(--muted);
        font-size: 13px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        background: var(--muted);
      }
      .is-running .dot { background: var(--ok); }
      .is-starting .dot, .is-stopping .dot { background: var(--warn); }
      .is-error .dot { background: var(--bad); }
      .target-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 12px;
      }
      .metric {
        min-height: 54px;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.12);
      }
      .metric-label {
        color: var(--muted);
        font-size: 12px;
      }
      .metric-value {
        margin-top: 4px;
        color: var(--text);
        font-size: 14px;
        overflow-wrap: anywhere;
      }
      dl {
        display: grid;
        grid-template-columns: 94px 1fr;
        gap: 7px 10px;
        margin: 12px 0;
        font-size: 13px;
      }
      dt { color: var(--muted); }
      dd { margin: 0; min-width: 0; overflow-wrap: anywhere; }
      code { color: var(--accent); }
      .error {
        display: none;
        margin: 10px 0;
        color: var(--bad);
      }
      .target.has-error .error { display: block; }
      .target details {
        border-top: 1px solid var(--line);
        background: rgba(0, 0, 0, 0.16);
      }
      .target summary {
        cursor: pointer;
        padding: 10px 14px;
        color: var(--info);
      }
      .target pre {
        margin: 0;
        max-height: 240px;
        overflow: auto;
        padding: 0 14px 14px;
        color: #e8dfd2;
        font-size: 12px;
        line-height: 1.55;
        white-space: pre-wrap;
      }
      .target h3 {
        margin: 12px 14px 6px;
        font-size: 13px;
        color: var(--muted);
      }
      .footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 12px;
      }
      @keyframes nodePulse {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .map-node.is-running .node-dot,
        .map-node.is-starting .node-dot,
        .map-node.is-stopping .node-dot {
          animation: none;
        }
      }
      @media (max-width: 760px) {
        header { display: block; }
        .song-form { grid-template-columns: 1fr; }
        .sync-head { display: block; }
        .sync-summary { justify-content: flex-start; min-width: 0; margin-top: 10px; }
        .sync-controls { display: grid; }
        .sync-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .sync-tab { min-width: 0; }
        .sync-filter { grid-template-columns: 1fr; }
        .sync-layout { grid-template-columns: 1fr; }
        .flow-steps { display: grid; grid-template-columns: 1fr; }
        .step { width: 100%; align-items: flex-start; }
        .song-actions { display: grid; }
        .runtime-strip { display: grid; }
        .target-summary { grid-template-columns: 1fr; }
        .status-heading { display: block; }
        .map-head { display: block; }
        .map-summary { margin-top: 10px; text-align: left; }
        .toolbar { align-items: stretch; }
        select, button, a.launch { width: 100%; }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div>
          <h1>${escapeHtml(title)}</h1>
          <p>曲JSONを選ぶと、必要なローカルサーバーを起動して、その曲の再生画面を開けます。</p>
        </div>
        <p id="updated-at">status loading...</p>
      </header>

      <section class="song-launcher" aria-label="Song launcher">
        <h2>曲を選んで再生</h2>
        <p>URLを手で組み立てず、ここから曲パッケージの manifest.json を選んで開きます。</p>
        <div class="flow-steps" aria-label="Playback flow">
          <span class="step"><strong>1</strong> 曲JSONを選ぶ</span>
          <span class="step"><strong>2</strong> サーバーを起動</span>
          <span class="step"><strong>3</strong> 再生画面を開く</span>
        </div>
        <div class="song-form">
          <label>
            曲JSON
            <select id="song-select" aria-label="Song manifest">
              <option>曲JSONを読み込み中...</option>
            </select>
          </label>
          <div class="song-actions">
            <button id="play-song" class="primary" disabled>選択曲を再生</button>
            <a id="open-song" class="launch secondary" href="#" target="_blank" rel="noreferrer" aria-disabled="true">開く</a>
          </div>
        </div>
        <p id="song-meta" class="song-meta"></p>
        <p id="message" class="message" role="status" aria-live="polite"></p>
        <div id="runtime-strip" class="runtime-strip"></div>
      </section>

      <section class="system-map" aria-label="System status map">
        <div class="map-head">
          <div>
            <h2>システム状態マップ</h2>
            <p>Launch Manager、曲JSON、各サーバーのつながりを地図のように見ます。起動中のノードと線が光ります。</p>
          </div>
          <div id="map-summary" class="map-summary">読み込み中</div>
        </div>
        <div id="system-map-stage" class="map-stage" role="img" aria-label="サーバー起動状態のノードマップ"></div>
        <div class="map-legend" aria-label="Map legend">
          <span class="legend-item"><span class="legend-dot is-running"></span>起動中</span>
          <span class="legend-item"><span class="legend-dot is-starting"></span>起動/停止中</span>
          <span class="legend-item"><span class="legend-dot"></span>停止中</span>
          <span class="legend-item"><span class="legend-dot is-error"></span>エラー</span>
        </div>
      </section>

      <section class="sync-board" aria-label="Worktree sync messages">
        <div class="sync-head">
          <div>
            <h2>担当メッセージ</h2>
            <p>各worktreeのready、質問、ブロッカー、確認済みをまとめて見ます。</p>
          </div>
          <div id="sync-summary" class="sync-summary"></div>
        </div>
        <div class="sync-controls">
          <div class="sync-tabs" role="tablist" aria-label="メッセージ種別">
            <button type="button" class="sync-tab is-active" data-sync-view="open">要対応</button>
            <button type="button" class="sync-tab" data-sync-view="all">すべて</button>
            <button type="button" class="sync-tab" data-sync-view="note">連絡</button>
            <button type="button" class="sync-tab" data-sync-view="ready">ready</button>
            <button type="button" class="sync-tab" data-sync-view="ack">ack</button>
          </div>
          <label class="sync-filter">
            担当
            <select id="sync-participant" aria-label="担当で絞り込み">
              <option value="">すべて</option>
            </select>
          </label>
          <button id="sync-refresh" type="button">メッセージ更新</button>
        </div>
        <div class="sync-layout">
          <div id="sync-participants" class="participant-list" aria-label="担当一覧"></div>
          <div id="sync-feed" class="sync-feed" aria-live="polite"></div>
        </div>
      </section>

      <details class="manual-panel">
        <summary>詳細操作</summary>
        <section class="toolbar" aria-label="Launch set controls">
          <select id="set-select" aria-label="起動セット">
            <option>起動セットを読み込み中...</option>
          </select>
          <button id="start-set">セットを起動</button>
          <button id="stop-set">セットを停止</button>
          <button id="stop-all" class="danger">全サーバー停止</button>
          <button id="refresh">更新</button>
        </section>
      </details>

      <p class="note">このタブを閉じても起動中のサーバーは止まりません。停止するには詳細操作、または各サーバーの停止を使ってください。</p>

      <section class="status-heading" aria-label="Server status heading">
        <h2>サーバー状態</h2>
        <p>通常は上の「選択曲を再生」だけで操作できます。</p>
      </section>
      <section id="targets" class="grid" aria-label="Launch targets"></section>
      <p id="runtime" class="footer"></p>
    </main>
    <script nonce="${escapeHtml(nonce)}">
      const state = { status: null, sync: null, syncView: "open", syncParticipant: "", busy: false, stopAllArmed: false, stopAllTimer: null };
      const svgNs = "http://www.w3.org/2000/svg";
      const byId = (id) => document.getElementById(id);
      const make = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };
      const makeSvg = (tag, attrs = {}, text) => {
        const node = document.createElementNS(svgNs, tag);
        for (const [key, value] of Object.entries(attrs)) {
          if (value !== undefined && value !== null) node.setAttribute(key, value);
        }
        if (text !== undefined) node.textContent = text;
        return node;
      };
      const selectedSongStorageKey = "music-effect.launch-manager.selectedSong";
      const call = async (url, options = {}) => {
        let response;
        try {
          response = await fetch(url, options);
        } catch {
          throw new Error("Launch Managerに接続できません。サーバーが止まっている可能性があります。npm run dev の端末と、この画面のURL/portを確認してから再読み込みしてください。");
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Request failed");
        return data;
      };
      const statusLabel = (value) => ({
        stopped: "停止中",
        starting: "起動中",
        running: "起動中",
        stopping: "停止中",
        error: "エラー"
      })[value] || value;
      const healthLabel = (value) => ({
        ok: "正常",
        fail: "確認失敗",
        unknown: "確認中",
        none: ""
      })[value] || value;
      const statusText = (target) => {
        const health = target.health && target.health !== "none" ? " / " + healthLabel(target.health) : "";
        return statusLabel(target.status) + health;
      };
      const roleLabel = (kind) => ({
        "web-app": "再生用ブラウザ画面",
        "asset-server": "曲JSONと素材の配信"
      })[kind] || "補助サーバー";
      const linkLabel = (key) => ({
        open: "開く",
        workflowMap: "ワークフロー",
        fixture: "サンプル曲"
      })[key] || key;
      const stripAnsi = (value) => String(value || "").replace(/\\u001B\\[[0-?]*[ -/]*[@-~]/g, "");
      const formatDate = (value) => value ? new Date(value).toLocaleString() : "-";
      const formatMetrics = (metrics) => {
        if (!metrics || metrics.exists === false) return "CPU - / Memory -";
        const cpu = Number.isFinite(metrics.cpuPercent) ? metrics.cpuPercent + "%" : "-";
        const memory = Number.isFinite(metrics.memoryMb) ? metrics.memoryMb + " MB" : "-";
        return "CPU " + cpu + " / Memory " + memory;
      };
      const formatLaunchPorts = (ports) => {
        if (!ports) return "ports: unknown";
        return "ports: manager " + ports.manager + " / player " + ports.player + " / songs " + ports.songPack + " (" + ports.mode + ")";
      };
      const truncate = (value, max) => {
        const text = String(value || "");
        return text.length > max ? text.slice(0, max - 1) + "..." : text;
      };
      const syncTypeLabel = (event) => ({
        ready: "ready",
        note: event.level === "question" ? "質問" : event.level === "blocker" ? "ブロッカー" : "連絡",
        ack: "ack"
      })[event.type] || event.type;
      const syncBadgeClass = (event) => {
        if (event.type === "ready") return "is-ready";
        if (event.type === "ack") return "is-ack";
        return event.level === "question" ? "is-question" : event.level === "blocker" ? "is-blocker" : "";
      };
      const syncViewMatches = (event) => {
        if (state.syncView === "open") return event.openForCurrent;
        if (state.syncView === "all") return true;
        return event.type === state.syncView;
      };
      const syncParticipantMatches = (event) => !state.syncParticipant || event.actor === state.syncParticipant;
      const renderSyncSummary = (sync) => {
        const root = byId("sync-summary");
        const summary = sync?.summary || {};
        const pills = [
          make("span", "sync-pill is-open", "要対応 " + (summary.openItems || 0)),
          make("span", "sync-pill", "担当 " + (summary.participants || 0)),
          make("span", "sync-pill", "表示 " + (summary.shownEvents || 0) + " / " + (summary.totalEvents || 0))
        ];
        if (sync?.currentBranch) pills.push(make("span", "sync-pill", sync.currentBranch));
        root.replaceChildren(...pills);
      };
      const setSyncView = (view) => {
        state.syncView = view;
        document.querySelectorAll("[data-sync-view]").forEach((button) => {
          button.classList.toggle("is-active", button.dataset.syncView === state.syncView);
        });
        if (state.sync) renderSyncBoard(state.sync);
      };
      const renderSyncParticipants = (sync) => {
        const select = byId("sync-participant");
        const names = (sync.participants || []).map((participant) => participant.name);
        if (state.syncParticipant && !names.includes(state.syncParticipant)) state.syncParticipant = "";
        select.replaceChildren(make("option", "", "すべて"));
        select.firstChild.value = "";
        for (const participant of sync.participants || []) {
          const option = make("option", "", participant.name);
          option.value = participant.name;
          select.append(option);
        }
        select.value = state.syncParticipant;

        const list = byId("sync-participants");
        const rows = (sync.participants || []).slice(0, 12).map((participant) => {
          const row = make("button", "participant-row" + (participant.name === state.syncParticipant ? " is-active" : ""));
          row.type = "button";
          row.append(make("span", "participant-name", participant.name));
          row.append(make("span", "participant-stats", "連絡 " + participant.notes + " / ready " + participant.ready + " / open " + participant.open));
          row.addEventListener("click", () => {
            state.syncParticipant = participant.name === state.syncParticipant ? "" : participant.name;
            renderSyncBoard(sync);
          });
          return row;
        });
        list.replaceChildren(...rows);
      };
      const renderSyncEvent = (event) => {
        const article = make("article", "sync-event is-" + event.type + (event.openForCurrent ? " is-open" : ""));
        const head = make("div", "sync-event-head");
        const title = make("div", "sync-event-title");
        title.append(make("span", "sync-badge " + syncBadgeClass(event), syncTypeLabel(event)));
        title.append(make("strong", "", event.actor + " -> " + event.target));
        if (event.topic) title.append(make("span", "sync-badge", event.topic));
        const time = make("time", "", formatDate(event.time));
        time.dateTime = event.time || "";
        head.append(title, time);
        article.append(head);

        const bodyText = event.message || event.subject || event.status || "";
        article.append(make("p", "sync-message", bodyText || "message is empty."));

        const meta = make("div", "sync-event-meta");
        if (event.branch) meta.append(make("span", "", event.branch));
        if (event.short) meta.append(make("code", "", event.short));
        if (event.status) meta.append(make("span", "", event.status));
        if (event.hasNewerTip) meta.append(make("span", "", "source has newer commits"));
        if (event.ackedByCurrent) meta.append(make("span", "", "acked"));
        if (event.ackId) meta.append(make("span", "", "ack " + event.ackType + " #" + event.ackId));
        article.append(meta);

        if (event.mergeHint) {
          const hint = make("p", "sync-event-meta");
          hint.append(make("span", "", "merge:"));
          hint.append(make("code", "", event.mergeHint));
          article.append(hint);
        }
        return article;
      };
      const renderSyncFeed = (sync) => {
        const feed = byId("sync-feed");
        if (sync.error) {
          feed.replaceChildren(make("div", "sync-empty", sync.error));
          return;
        }
        const events = (sync.recentEvents || []).filter((event) => syncViewMatches(event) && syncParticipantMatches(event));
        if (!events.length) {
          feed.replaceChildren(make("div", "sync-empty", "表示するメッセージはありません。"));
          return;
        }
        feed.replaceChildren(...events.map(renderSyncEvent));
      };
      const renderSyncBoard = (sync) => {
        state.sync = sync;
        renderSyncSummary(sync);
        renderSyncParticipants(sync);
        document.querySelectorAll("[data-sync-view]").forEach((button) => {
          button.classList.toggle("is-active", button.dataset.syncView === state.syncView);
        });
        renderSyncFeed(sync);
      };
      const refreshSyncEvents = async () => {
        try {
          state.sync = await call("/api/sync-events");
          renderSyncBoard(state.sync);
        } catch (error) {
          renderSyncBoard({ error: error.message, summary: {}, participants: [], recentEvents: [] });
        }
      };
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const setBusy = (busy) => {
        state.busy = busy;
        document.querySelectorAll("button").forEach((button) => button.disabled = busy);
      };
      const setMessage = (text, level = "") => {
        const node = byId("message");
        node.textContent = text;
        node.className = "message" + (level ? " is-" + level : "");
      };
      const clearStopAllArm = () => {
        state.stopAllArmed = false;
        if (state.stopAllTimer) clearTimeout(state.stopAllTimer);
        state.stopAllTimer = null;
        const button = byId("stop-all");
        if (button) {
          button.classList.remove("armed");
          button.textContent = "全サーバー停止";
        }
      };
      const post = async (url) => {
        try {
          if (url !== "/api/stop-all") clearStopAllArm();
          setBusy(true);
          await call(url, { method: "POST" });
          await refresh();
          setMessage("操作を反映しました。", "ok");
        } catch (error) {
          setMessage(error.message, "error");
        } finally {
          setBusy(false);
        }
      };
      const confirmStopAll = async () => {
        if (!state.stopAllArmed) {
          state.stopAllArmed = true;
          const button = byId("stop-all");
          button.classList.add("armed");
          button.textContent = "もう一度押して全停止";
          setMessage("起動中の全サーバーを止めるには、もう一度「全停止」を押してください。", "warn");
          state.stopAllTimer = setTimeout(clearStopAllArm, 5000);
          return;
        }
        clearStopAllArm();
        await post("/api/stop-all");
      };
      const renderSets = (sets) => {
        const select = byId("set-select");
        const current = select.value;
        select.replaceChildren();
        for (const set of sets) {
          const option = make("option", "", set.label);
          option.value = set.id;
          option.title = set.description || "";
          select.append(option);
        }
        if (sets.some((set) => set.id === current)) select.value = current;
      };
      const selectedSong = () => {
        const catalog = state.status?.songCatalog;
        const value = byId("song-select").value;
        return (catalog?.songs || []).find((song) => song.directoryName === value) || null;
      };
      const loadSelectedSongId = () => {
        try {
          return localStorage.getItem(selectedSongStorageKey) || "";
        } catch {
          return "";
        }
      };
      const rememberSelectedSong = () => {
        const value = byId("song-select").value;
        if (!value) return;
        try {
          localStorage.setItem(selectedSongStorageKey, value);
        } catch {}
      };
      const targetMap = () => new Map((state.status?.targets || []).map((target) => [target.id, target]));
      const targetReady = (target) =>
        target?.running &&
        target.status === "running" &&
        !target.error &&
        (!target.health || target.health === "ok" || target.health === "none");
      const transientHealthError = (target) =>
        target?.running &&
        (target.error === "Health check did not become ready." || target.error === "Health check failed.");
      const requiredTargetsReady = () => {
        const catalog = state.status?.songCatalog;
        const ids = catalog?.requiredTargetIds || [];
        const targets = targetMap();
        return ids.length > 0 && ids.every((id) => targetReady(targets.get(id)));
      };
      const requiredTargetErrors = () => {
        const catalog = state.status?.songCatalog;
        const ids = catalog?.requiredTargetIds || [];
        const targets = targetMap();
        return ids
          .map((id) => targets.get(id))
          .filter((target) => target?.status === "error" && !transientHealthError(target))
          .map((target) => target.label + ": " + (target.error || "error"));
      };
      const formatSongLabel = (song) => song.title + (song.artist ? " / " + song.artist : "");
      const renderRuntimeStrip = (catalog) => {
        const root = byId("runtime-strip");
        const targets = targetMap();
        const pills = (catalog.requiredTargetIds || []).map((id) => {
          const target = targets.get(id);
          const label = target ? target.label : id;
          const status = target ? statusText(target) : "missing";
          return make("span", "runtime-pill", label + ": " + status);
        });
        root.replaceChildren(...pills);
      };
      const metricNode = (label, value) => {
        const node = make("div", "metric");
        node.append(make("div", "metric-label", label));
        node.append(make("div", "metric-value", value));
        return node;
      };
      const mapStateClass = (target) => {
        if (!target) return "is-stopped";
        if (target.status === "error" || target.error || target.health === "fail") return "is-error";
        if (target.status === "starting") return "is-starting";
        if (target.status === "stopping") return "is-stopping";
        if (target.running && target.status === "running") return "is-running";
        return "is-stopped";
      };
      const appendMapEdge = (svg, from, to, className = "") => {
        const mid = Math.round((from.x + to.x) / 2);
        const d = "M " + from.x + " " + from.y + " C " + mid + " " + from.y + ", " + mid + " " + to.y + ", " + to.x + " " + to.y;
        svg.append(makeSvg("path", { class: "map-edge " + className, d }));
      };
      const appendMapNode = (svg, node) => {
        const group = makeSvg("g", { class: "map-node " + node.className, tabindex: "0" });
        group.append(makeSvg("title", {}, node.title + " / " + node.status));
        group.append(makeSvg("rect", { x: node.x, y: node.y, width: node.w, height: node.h, rx: 8 }));
        group.append(makeSvg("circle", { class: "node-dot", cx: node.x + 18, cy: node.y + 20, r: 5 }));
        group.append(makeSvg("text", { x: node.x + 32, y: node.y + 25 }, truncate(node.title, 24)));
        group.append(makeSvg("text", { class: "node-subtitle", x: node.x + 16, y: node.y + 46 }, truncate(node.subtitle, 30)));
        group.append(makeSvg("text", { class: "node-status", x: node.x + 16, y: node.y + 64 }, truncate(node.status, 32)));
        svg.append(group);
      };
      const renderSystemMap = (status) => {
        const targets = status.targets || [];
        const catalog = status.songCatalog || { requiredTargetIds: [] };
        const requiredIds = new Set(catalog.requiredTargetIds || []);
        const targetsById = new Map(targets.map((target) => [target.id, target]));
        const rowGap = 88;
        const height = Math.max(282, 112 + Math.max(targets.length, 2) * rowGap);
        const width = 980;
        const manager = { x: 28, y: Math.round(height / 2 - 38), w: 184, h: 76 };
        const targetNodes = targets.map((target, index) => ({
          target,
          x: 318,
          y: 56 + index * rowGap,
          w: 224,
          h: 76
        }));
        const song = selectedSong();
        const songNode = {
          x: 704,
          y: Math.round(height / 2 - 38),
          w: 228,
          h: 76,
          title: song ? song.title : "曲JSON未選択",
          subtitle: song ? song.manifestPath : "song-packs/*/manifest.json",
          status: song ? "選択中" : "未選択"
        };
        const svg = makeSvg("svg", { viewBox: "0 0 " + width + " " + height, "aria-hidden": "true" });

        for (const item of targetNodes) {
          const edgeClass = [
            requiredIds.has(item.target.id) ? "is-related" : "",
            item.target.running ? "is-active" : ""
          ].filter(Boolean).join(" ");
          appendMapEdge(
            svg,
            { x: manager.x + manager.w, y: manager.y + manager.h / 2 },
            { x: item.x, y: item.y + item.h / 2 },
            edgeClass
          );
        }

        const songServer = targetsById.get("song-pack-server") || targets.find((target) => target.kind === "asset-server");
        const player = targetsById.get("fixture-player") || targets.find((target) => target.kind === "web-app");
        const songServerNode = targetNodes.find((item) => item.target.id === songServer?.id);
        const playerNode = targetNodes.find((item) => item.target.id === player?.id);
        if (songServerNode) {
          appendMapEdge(
            svg,
            { x: songServerNode.x + songServerNode.w, y: songServerNode.y + songServerNode.h / 2 },
            { x: songNode.x, y: songNode.y + 24 },
            songServer?.running ? "is-related is-active" : "is-related"
          );
        }
        if (playerNode) {
          appendMapEdge(
            svg,
            { x: songNode.x, y: songNode.y + 56 },
            { x: playerNode.x + playerNode.w, y: playerNode.y + playerNode.h / 2 },
            player?.running ? "is-related is-active" : "is-related"
          );
        }

        appendMapNode(svg, {
          x: manager.x,
          y: manager.y,
          w: manager.w,
          h: manager.h,
          title: "Launch Manager",
          subtitle: "起動と監視",
          status: "管理画面は表示中",
          className: "is-running"
        });
        for (const item of targetNodes) {
          appendMapNode(svg, {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h,
            title: item.target.label,
            subtitle: roleLabel(item.target.kind),
            status: statusText(item.target),
            className: mapStateClass(item.target) + (requiredIds.has(item.target.id) ? " is-required" : "")
          });
        }
        appendMapNode(svg, {
          x: songNode.x,
          y: songNode.y,
          w: songNode.w,
          h: songNode.h,
          title: songNode.title,
          subtitle: songNode.subtitle,
          status: songNode.status,
          className: "is-song" + (song ? " is-required" : "")
        });

        byId("system-map-stage").replaceChildren(svg);
        const runningCount = targets.filter((target) => target.running).length;
        byId("map-summary").textContent = "起動中 " + runningCount + " / " + targets.length;
      };
      const renderSelectedSong = () => {
        const song = selectedSong();
        const meta = byId("song-meta");
        const open = byId("open-song");
        if (!song) {
          meta.textContent = "曲JSONが見つかりません。song-packs/<song-id>/manifest.json を確認してください。";
          open.href = "#";
          open.setAttribute("aria-disabled", "true");
          byId("play-song").disabled = true;
          return;
        }
        const duration = song.duration ? " / " + Math.round(song.duration) + "秒" : "";
        meta.textContent = formatSongLabel(song) + duration + " / " + song.manifestPath;
        open.href = song.playerUrl || "#";
        open.toggleAttribute("aria-disabled", !song.playerUrl);
        byId("play-song").disabled = state.busy || !song.playerUrl;
      };
      const renderSongCatalog = (catalog = { songs: [], errors: [], requiredTargetIds: [] }) => {
        const select = byId("song-select");
        const current = select.value;
        const stored = loadSelectedSongId();
        select.replaceChildren();
        if (!catalog.songs.length) {
          select.append(make("option", "", "曲JSONがありません"));
          select.disabled = true;
        } else {
          select.disabled = false;
          for (const song of catalog.songs) {
            const option = make("option", "", formatSongLabel(song));
            option.value = song.directoryName;
            option.title = song.manifestPath;
            select.append(option);
          }
          if (catalog.songs.some((song) => song.directoryName === current)) {
            select.value = current;
          } else if (catalog.songs.some((song) => song.directoryName === stored)) {
            select.value = stored;
          }
        }
        renderSelectedSong();
        renderRuntimeStrip(catalog);
        if (catalog.errors?.length) {
          setMessage("読み込めない曲JSONがあります: " + catalog.errors.join(" / "), "warn");
        }
      };
      const startPlaybackTargets = async () => {
        const catalog = state.status?.songCatalog;
        if (!catalog) throw new Error("曲カタログをまだ読み込めていません。");
        if (catalog.launchSetId) {
          await call("/api/sets/" + catalog.launchSetId + "/start", { method: "POST" });
          return;
        }
        for (const targetId of catalog.requiredTargetIds || []) {
          await call("/api/targets/" + targetId + "/start", { method: "POST" });
        }
      };
      const waitForPlaybackTargets = async () => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < 45000) {
          await refresh();
          const errors = requiredTargetErrors();
          if (errors.length) throw new Error(errors.join(" / "));
          if (requiredTargetsReady()) return;
          await sleep(800);
        }
        throw new Error("サーバーの起動待ちがタイムアウトしました。サーバー状態カードの詳細ログを確認してください。");
      };
      const playSelectedSong = async () => {
        const song = selectedSong();
        if (!song?.playerUrl) {
          setMessage("再生できる曲JSONを選んでください。", "error");
          return;
        }
        rememberSelectedSong();
        const pendingWindow = window.open("about:blank", "_blank");
        try {
          setBusy(true);
          setMessage("必要なサーバーを起動しています...", "warn");
          await startPlaybackTargets();
          await waitForPlaybackTargets();
          if (pendingWindow) {
            pendingWindow.opener = null;
            pendingWindow.location.replace(song.playerUrl);
            setMessage(formatSongLabel(song) + " を開きました。", "ok");
          } else {
            setMessage("再生画面へ移動します。", "ok");
            window.location.href = song.playerUrl;
          }
        } catch (error) {
          if (pendingWindow) pendingWindow.close();
          setMessage(error.message, "error");
        } finally {
          setBusy(false);
          renderSelectedSong();
        }
      };
      const renderTarget = (target) => {
        const article = make("article", "target is-" + target.status + (target.error ? " has-error" : ""));
        article.dataset.targetId = target.id;
        const head = make("div", "target-head");
        const title = make("div");
        title.append(make("h2", "", target.label));
        title.append(make("p", "", roleLabel(target.kind)));
        const status = make("div", "status");
        status.append(make("span", "dot"));
        status.append(make("span", "", statusText(target)));
        head.append(title, status);

        const body = make("div", "target-body");
        const summary = make("div", "target-summary");
        summary.append(
          metricNode("状態", statusText(target)),
          metricNode("ポート", target.ports.length ? target.ports.join(", ") : "-"),
          metricNode("起動時刻", formatDate(target.startedAt))
        );
        body.append(summary);

        const actions = make("div", "target-actions");
        actions.append(
          actionButton("起動", "/api/targets/" + target.id + "/start"),
          actionButton("停止", "/api/targets/" + target.id + "/stop"),
          actionButton("再起動", "/api/targets/" + target.id + "/restart")
        );
        body.append(actions);
        body.append(make("p", "error", target.error || ""));

        const details = make("details", "tech-details");
        details.open = target.status === "error";
        details.append(make("summary", "", "詳細情報とログ"));
        const dl = make("dl");
        const rows = [
          ["PID", target.pid || "-"],
          ["ID", target.id],
          ["Kind", target.kind],
          ["Resource", formatMetrics(target.metrics)],
          ["Started", formatDate(target.startedAt)],
          ["Command", target.command + " " + target.args.join(" ")],
          ["CWD", target.cwd]
        ];
        for (const [key, value] of rows) {
          dl.append(make("dt", "", key), make("dd", "", value));
        }
        details.append(dl);

        const links = make("div", "links");
        for (const [key, url] of Object.entries(target.urls || {})) {
          const link = make("a", "launch", linkLabel(key));
          link.href = url;
          link.target = "_blank";
          link.rel = "noreferrer";
          links.append(link);
        }
        details.append(links);

        const logs = target.logs || {};
        details.append(make("h3", "", "stdout"));
        details.append(make("pre", "", stripAnsi(logs.stdout) || "stdout log is empty."));
        details.append(make("h3", "", "stderr"));
        details.append(make("pre", "", stripAnsi(logs.stderr) || "stderr log is empty."));

        article.append(head, body, details);
        return article;
      };
      const actionButton = (label, url) => {
        const button = make("button", "", label);
        button.addEventListener("click", () => post(url));
        return button;
      };
      const render = (status) => {
        renderSets(status.sets || []);
        renderSongCatalog(status.songCatalog);
        renderSystemMap(status);
        byId("updated-at").textContent = "更新: " + new Date(status.updatedAt).toLocaleTimeString();
        byId("runtime").textContent =
          "worktree: " + status.root +
          " / " + formatLaunchPorts(status.launchPorts) +
          " / config: " + status.configPath +
          " / runtime: " + status.runtimeRoot +
          (status.portsFile ? " / ports file: " + status.portsFile : "");
        const root = byId("targets");
        const detailsState = new Map(
          [...root.querySelectorAll(".target")].map((article) => {
            const details = article.querySelector(".tech-details");
            const scrollTops = [...(details?.querySelectorAll("pre") || [])].map((pre) => pre.scrollTop);
            return [article.dataset.targetId, { open: Boolean(details?.open), scrollTops }];
          })
        );
        root.replaceChildren(...status.targets.map(renderTarget));
        for (const article of root.querySelectorAll(".target")) {
          const saved = detailsState.get(article.dataset.targetId);
          if (!saved) continue;
          const details = article.querySelector(".tech-details");
          if (!details) continue;
          details.open = saved.open;
          [...details.querySelectorAll("pre")].forEach((pre, index) => {
            pre.scrollTop = saved.scrollTops[index] || 0;
          });
        }
      };
      const refresh = async () => {
        const [status, sync] = await Promise.all([
          call("/api/status"),
          call("/api/sync-events").catch((error) => ({ error: error.message, summary: {}, participants: [], recentEvents: [] }))
        ]);
        state.status = status;
        render(state.status);
        renderSyncBoard(sync);
      };
      byId("start-set").addEventListener("click", () => post("/api/sets/" + byId("set-select").value + "/start"));
      byId("stop-set").addEventListener("click", () => post("/api/sets/" + byId("set-select").value + "/stop"));
      byId("stop-all").addEventListener("click", confirmStopAll);
      byId("refresh").addEventListener("click", () => refresh());
      byId("sync-refresh").addEventListener("click", refreshSyncEvents);
      byId("sync-participant").addEventListener("change", () => {
        state.syncParticipant = byId("sync-participant").value;
        if (state.sync) renderSyncBoard(state.sync);
      });
      document.querySelectorAll("[data-sync-view]").forEach((button) => {
        button.addEventListener("click", () => setSyncView(button.dataset.syncView));
      });
      byId("song-select").addEventListener("change", () => {
        rememberSelectedSong();
        renderSelectedSong();
        if (state.status) renderSystemMap(state.status);
      });
      byId("play-song").addEventListener("click", playSelectedSong);
      byId("open-song").addEventListener("click", (event) => {
        if (!selectedSong()?.playerUrl) event.preventDefault();
      });
      refresh().catch((error) => setMessage(error.message, "error"));
      setInterval(() => {
        if (!state.busy) refresh().catch(() => {});
      }, 2000);
    </script>
  </body>
</html>`;
