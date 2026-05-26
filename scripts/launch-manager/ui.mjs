const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const managerHtml = ({ title, nonce, networkExposure = { mode: "loopback", lan: false, controlTokenRequired: false } }) => {
  const initialExposure = networkExposure ?? { mode: "loopback", lan: false, controlTokenRequired: false };
  const initialWarningText =
    initialExposure.warning ||
    (initialExposure.controlTokenRequired ? "状態変更APIにcontrol tokenが設定されています。操作するにはtokenを入力してください。" : "");
  const initialWarningHidden = initialExposure.lan || initialExposure.controlTokenRequired ? "" : " hidden";
  const initialTokenHidden = initialExposure.controlTokenRequired ? "" : " hidden";

  return `<!doctype html>
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
      .toolbar, .target-actions, .links, .song-actions, .show-actions, .deck-actions, .flow-steps, .map-legend, .sync-tabs, .sync-controls, .sync-summary, .participant-stats {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .song-launcher, .show-profile-panel {
        border: 1px solid rgba(255, 217, 138, 0.34);
        border-radius: 8px;
        padding: 18px;
        margin-bottom: 16px;
        background: linear-gradient(180deg, rgba(255, 217, 138, 0.1), rgba(255, 255, 255, 0.035));
      }
      .show-profile-panel {
        border-color: rgba(159, 212, 255, 0.3);
        background: linear-gradient(180deg, rgba(159, 212, 255, 0.075), rgba(255, 255, 255, 0.03));
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
      .deck-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
      }
      .deck-card {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 14px;
        background: rgba(0, 0, 0, 0.14);
      }
      .deck-card h3 {
        margin: 0 0 8px;
        font-size: 17px;
      }
      .deck-card.is-running {
        border-color: rgba(147, 230, 177, 0.52);
        box-shadow: 0 0 18px rgba(147, 230, 177, 0.08);
      }
      .deck-card.is-error {
        border-color: rgba(255, 170, 165, 0.6);
      }
      .deck-status {
        color: var(--muted);
        font-size: 13px;
      }
      .deck-meta {
        min-height: 44px;
        margin: 10px 0;
        color: var(--text);
        overflow-wrap: anywhere;
      }
      .deck-tuning {
        margin-top: 10px;
        grid-template-columns: minmax(0, 1fr);
      }
      .deck-tuning input {
        min-height: 36px;
      }
      .deck-url {
        display: block;
        min-height: 36px;
        margin-top: 8px;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 8px 10px;
        background: rgba(0, 0, 0, 0.16);
        color: var(--muted);
        font-size: 12px;
        overflow-wrap: anywhere;
      }
      .deck-global-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .show-form {
        display: grid;
        grid-template-columns: minmax(220px, 0.9fr) minmax(260px, 1.1fr) auto;
        gap: 12px;
        align-items: end;
        margin-top: 12px;
      }
      label {
        display: grid;
        gap: 6px;
        color: var(--muted);
        font-size: 13px;
      }
      .song-meta, .show-meta {
        margin-top: 12px;
        color: var(--text);
        overflow-wrap: anywhere;
      }
      .show-meta {
        color: var(--muted);
      }
      .show-setlist {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .show-setlist button {
        min-height: 32px;
        padding: 6px 9px;
        color: var(--info);
      }
      .message {
        min-height: 24px;
        margin-top: 10px;
        color: var(--muted);
      }
      .message.is-ok { color: var(--ok); }
      .message.is-warn { color: var(--warn); }
      .message.is-error { color: var(--bad); }
      .network-warning {
        display: grid;
        gap: 10px;
        border: 1px solid rgba(255, 208, 125, 0.58);
        border-radius: 8px;
        padding: 12px 14px;
        margin-bottom: 16px;
        background: rgba(255, 208, 125, 0.08);
        color: var(--warn);
      }
      .network-warning[hidden] { display: none; }
      .network-warning strong { color: var(--text); }
      .network-warning p { color: var(--warn); }
      .token-field {
        max-width: 420px;
      }
      .token-field[hidden] { display: none; }
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
      select, input, button, a.launch {
        min-height: 40px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #25262c;
        color: var(--text);
        font: inherit;
      }
      input {
        padding: 0 12px;
      }
      select {
        padding: 0 12px;
        min-width: 210px;
        color-scheme: dark;
      }
      select option {
        background: Canvas;
        color: CanvasText;
      }
      select option:checked {
        background: Highlight;
        color: HighlightText;
      }
      select option:disabled {
        color: GrayText;
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
        .song-form, .show-form, .deck-grid { grid-template-columns: 1fr; }
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

      <section id="network-warning" class="network-warning" aria-live="polite"${initialWarningHidden}>
        <strong id="network-warning-title">${initialExposure.lan ? "LAN公開中" : "Control token required"}</strong>
        <p id="network-warning-text">${escapeHtml(initialWarningText)}</p>
        <label id="control-token-label" class="token-field"${initialTokenHidden}>
          Control token
          <input id="control-token" type="password" autocomplete="off" spellcheck="false" placeholder="操作用token">
        </label>
      </section>

      <section class="song-launcher" aria-label="Song launcher">
        <h2>Deck A/Bで再生</h2>
        <p>Deckごとに曲パッケージの manifest.json を選び、別々の再生画面URLを開くかコピーします。</p>
        <div class="flow-steps" aria-label="Playback flow">
          <span class="step"><strong>1</strong> Deckごとに曲JSONを選ぶ</span>
          <span class="step"><strong>2</strong> Deckを起動</span>
          <span class="step"><strong>3</strong> URLを開く/外部ツールへ渡す</span>
        </div>
        <div id="deck-list" class="deck-grid" aria-label="Deck controls"></div>
        <div class="deck-global-actions">
          <button id="stop-decks" class="danger" type="button">Deck全停止</button>
          <button id="copy-deck-urls" type="button">Deck URLをまとめてコピー</button>
        </div>
        <p id="message" class="message" role="status" aria-live="polite"></p>
        <div id="runtime-strip" class="runtime-strip"></div>
      </section>

      <section class="show-profile-panel" aria-label="Show profile setlist">
        <h2>show-profile / セットリスト</h2>
        <p>任意のイベント運用メモがある場合だけ、曲の並びを表示します。曲パッケージの構成や連携方式はここでは縛りません。</p>
        <div class="show-form">
          <label>
            show-profile
            <select id="show-select" aria-label="Show profile">
              <option>show-profileを読み込み中...</option>
            </select>
          </label>
          <label>
            セットリスト項目
            <select id="setlist-select" aria-label="Setlist item">
              <option>セットリストを読み込み中...</option>
            </select>
          </label>
          <div class="show-actions">
            <button id="select-setlist-song" type="button">曲JSONへ反映</button>
          </div>
        </div>
        <p id="show-meta" class="show-meta"></p>
        <div id="show-setlist" class="show-setlist"></div>
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
        <p>通常は上のDeck操作だけで起動、停止、URL確認ができます。</p>
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
      const legacySelectedSongStorageKey = "music-effect.launch-manager.selectedSong";
      const deckSelectionStoragePrefix = "music-effect.launch-manager.deckSong.";
      const deckLyricOffsetStoragePrefix = "music-effect.launch-manager.deckLyricOffsetMs.";
      const deckLyricAdjustmentStoragePrefix = "music-effect.launch-manager.deckLyricAdjustment.";
      const selectedShowStorageKey = "music-effect.launch-manager.selectedShow";
      const selectedSetlistStorageKey = "music-effect.launch-manager.selectedSetlist";
      const controlTokenStorageKey = "music-effect.launch-manager.controlToken";
      const fallbackDecks = [
        { id: "deck-a", label: "Deck A", targetId: "deck-a-player", playerBaseUrl: "" },
        { id: "deck-b", label: "Deck B", targetId: "deck-b-player", playerBaseUrl: "" }
      ];
      const call = async (url, options = {}) => {
        const requestOptions = { ...options, headers: { ...(options.headers || {}) } };
        if (String(requestOptions.method || "GET").toUpperCase() === "POST") {
          const token = byId("control-token")?.value?.trim() || "";
          if (token) requestOptions.headers["X-Control-Token"] = token;
        }
        let response;
        try {
          response = await fetch(url, requestOptions);
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
      const healthDisplay = (target) => {
        if (!target?.health || target.health === "none") return "";
        if (target.health === "fail" && target.status === "running" && !target.error) {
          const failures = Number(target.healthFailures || 0);
          return failures > 1 ? "確認再試行中 " + failures + "/3" : "確認中";
        }
        return healthLabel(target.health);
      };
      const statusText = (target) => {
        const display = healthDisplay(target);
        const health = display ? " / " + display : "";
        return statusLabel(target.status) + health;
      };
      const renderNetworkExposure = (exposure = {}) => {
        const visible = Boolean(exposure.lan || exposure.controlTokenRequired);
        const box = byId("network-warning");
        const titleNode = byId("network-warning-title");
        const textNode = byId("network-warning-text");
        const tokenLabel = byId("control-token-label");
        const tokenInput = byId("control-token");
        box.hidden = !visible;
        tokenLabel.hidden = !exposure.controlTokenRequired;
        if (!visible) return;

        titleNode.textContent = exposure.lan ? "LAN公開中" : "Control token required";
        textNode.textContent =
          exposure.warning ||
          "状態変更APIにcontrol tokenが設定されています。操作するにはtokenを入力してください。";
        tokenInput.disabled = Boolean(exposure.controlTokenRequired && !exposure.controlTokenConfigured);
        tokenInput.placeholder = exposure.controlTokenConfigured
          ? "操作用token"
          : "LAUNCH_MANAGER_CONTROL_TOKEN が未設定です";
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
      const formatDurationMs = (value) => {
        const ms = Number(value);
        return Number.isFinite(ms) ? Math.round(ms / 1000) + "秒" : "-";
      };
      const formatElapsedMs = (value) => {
        const ms = Number(value);
        if (!Number.isFinite(ms)) return "-";
        return ms < 1000 ? Math.round(ms) + "ms" : (ms / 1000).toFixed(1) + "秒";
      };
      const formatMetrics = (metrics) => {
        if (!metrics || metrics.exists === false) return "CPU - / Memory -";
        const cpu = Number.isFinite(metrics.cpuPercent) ? metrics.cpuPercent + "%" : "-";
        const memory = Number.isFinite(metrics.memoryMb) ? metrics.memoryMb + " MB" : "-";
        return "CPU " + cpu + " / Memory " + memory;
      };
      const formatLaunchPorts = (ports) => {
        if (!ports) return "ports: unknown";
        return "ports: manager " + ports.manager +
          " / Deck A " + (ports.deckA ?? ports.player) +
          " / Deck B " + (ports.deckB ?? "-") +
          " / songs " + ports.songPack +
          " (" + ports.mode + ")";
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
      const deckDomId = (deckId, suffix) => deckId + "-" + suffix;
      const configuredDecks = () => {
        const decks = state.status?.songCatalog?.decks || [];
        const normalized = decks.length ? decks : fallbackDecks;
        return normalized.map((deck, index) => ({
          ...deck,
          id: deck.id || fallbackDecks[index]?.id || "deck-" + (index + 1),
          label: deck.label || fallbackDecks[index]?.label || "Deck " + (index + 1),
          targetId: deck.targetId || fallbackDecks[index]?.targetId || "",
          playerBaseUrl: deck.playerBaseUrl || ""
        }));
      };
      const deckById = (deckId) => configuredDecks().find((deck) => deck.id === deckId) || null;
      const deckTarget = (deckId) => {
        const deck = deckById(deckId);
        return deck ? targetMap().get(deck.targetId) || null : null;
      };
      const storedDeckSongId = (deckId) => {
        try {
          return (
            localStorage.getItem(deckSelectionStoragePrefix + deckId) ||
            (deckId === "deck-a" ? localStorage.getItem(legacySelectedSongStorageKey) : "") ||
            ""
          );
        } catch {
          return "";
        }
      };
      const rememberDeckSong = (deckId) => {
        const select = byId(deckDomId(deckId, "song-select"));
        const value = select?.value || "";
        if (!value) return;
        try {
          localStorage.setItem(deckSelectionStoragePrefix + deckId, value);
          if (deckId === "deck-a") localStorage.setItem(legacySelectedSongStorageKey, value);
        } catch {}
      };
      const clampLiveOffsetMs = (value) => Math.max(-30000, Math.min(30000, Math.round(value)));
      const storedDeckLyricOffsetMs = (deckId) => {
        try {
          const value = Number(localStorage.getItem(deckLyricOffsetStoragePrefix + deckId) || 0);
          return Number.isFinite(value) ? clampLiveOffsetMs(value) : 0;
        } catch {
          return 0;
        }
      };
      const rememberDeckLyricOffset = (deckId, value) => {
        const offset = clampLiveOffsetMs(Number(value));
        try {
          localStorage.setItem(deckLyricOffsetStoragePrefix + deckId, String(Number.isFinite(offset) ? offset : 0));
        } catch {}
        return Number.isFinite(offset) ? offset : 0;
      };
      const selectedDeckLyricOffsetMs = (deckId) => {
        const input = byId(deckDomId(deckId, "lyric-offset"));
        if (input) return rememberDeckLyricOffset(deckId, input.value);
        return storedDeckLyricOffsetMs(deckId);
      };
      const storedDeckLyricAdjustment = (deckId) => {
        try {
          return localStorage.getItem(deckLyricAdjustmentStoragePrefix + deckId) || "";
        } catch {
          return "";
        }
      };
      const rememberDeckLyricAdjustment = (deckId, value) => {
        const text = String(value || "").trim();
        try {
          if (text) localStorage.setItem(deckLyricAdjustmentStoragePrefix + deckId, text);
          else localStorage.removeItem(deckLyricAdjustmentStoragePrefix + deckId);
        } catch {}
        return text;
      };
      const selectedDeckLyricAdjustment = (deckId) => {
        const input = byId(deckDomId(deckId, "lyric-adjustment"));
        if (input) return rememberDeckLyricAdjustment(deckId, input.value);
        return storedDeckLyricAdjustment(deckId);
      };
      const selectedSongForDeck = (deckId) => {
        const catalog = state.status?.songCatalog;
        const select = byId(deckDomId(deckId, "song-select"));
        const value = select?.value || "";
        return (catalog?.songs || []).find((song) => song.directoryName === value) || null;
      };
      const selectedSong = () => selectedSongForDeck("deck-a");
      const deckUrlForSong = (deck, song) => {
        if (!deck || !song) return "";
        const baseUrl = song.deckUrls?.[deck.id] || deck.playerBaseUrl;
        if (!baseUrl || (!song.deckUrls?.[deck.id] && !song.manifestUrl)) return "";
        const url = new URL(baseUrl);
        if (!song.deckUrls?.[deck.id]) url.searchParams.set("song", song.manifestUrl);
        const lyricOffsetMs = selectedDeckLyricOffsetMs(deck.id);
        if (lyricOffsetMs) url.searchParams.set("lyricOffsetMs", String(lyricOffsetMs));
        else url.searchParams.delete("lyricOffsetMs");
        const lyricAdjustment = selectedDeckLyricAdjustment(deck.id);
        if (lyricAdjustment) url.searchParams.set("lyricAdjustment", lyricAdjustment);
        else url.searchParams.delete("lyricAdjustment");
        return url.toString();
      };
      const selectedDeckUrl = (deckId) => deckUrlForSong(deckById(deckId), selectedSongForDeck(deckId));
      const loadStoredValue = (key) => {
        try {
          return localStorage.getItem(key) || "";
        } catch {
          return "";
        }
      };
      const storeValue = (key, value) => {
        if (!value) return;
        try {
          localStorage.setItem(key, value);
        } catch {}
      };
      const selectedShowProfile = () => {
        const profiles = state.status?.showProfiles?.profiles || [];
        const value = byId("show-select").value;
        return profiles.find((profile) => profile.directoryName === value) || null;
      };
      const selectedSetlistItem = () => {
        const profile = selectedShowProfile();
        const index = Number(byId("setlist-select").value);
        if (!profile || !Number.isInteger(index)) return null;
        return (profile.setlist || []).find((item) => item.index === index) || null;
      };
      const rememberShowSelection = () => {
        const showValue = byId("show-select").value;
        const setlistValue = byId("setlist-select").value;
        storeValue(selectedShowStorageKey, showValue);
        storeValue(selectedSetlistStorageKey, showValue + ":" + setlistValue);
      };
      const applySongSelection = (songDirectoryName, { announce = true, lyricOffsetMs = null, lyricAdjustmentUrl = null } = {}) => {
        const catalog = state.status?.songCatalog || { songs: [] };
        const song = (catalog.songs || []).find((item) => item.directoryName === songDirectoryName);
        if (!song) {
          if (announce) setMessage("セットリスト項目に対応する曲JSONが見つかりません: " + songDirectoryName, "warn");
          return false;
        }
        const deckASelect = byId(deckDomId("deck-a", "song-select"));
        if (deckASelect) {
          deckASelect.value = song.directoryName;
          rememberDeckSong("deck-a");
        }
        if (Number.isFinite(Number(lyricOffsetMs))) {
          rememberDeckLyricOffset("deck-a", lyricOffsetMs);
        }
        rememberDeckLyricAdjustment("deck-a", lyricAdjustmentUrl || "");
        renderDecks();
        if (state.status) renderSystemMap(state.status);
        const offsetNote =
          Number.isFinite(Number(lyricOffsetMs)) && Number(lyricOffsetMs) !== 0
            ? " / 歌詞補正 " + Number(lyricOffsetMs) + "ms"
            : "";
        const adjustmentNote = lyricAdjustmentUrl ? " / 補正JSONあり" : "";
        if (announce) setMessage(formatSongLabel(song) + " をDeck Aへ反映しました。" + offsetNote + adjustmentNote, "ok");
        return true;
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
      const songPackTargetId = () => state.status?.songCatalog?.songPackTargetId || "song-pack-server";
      const deckRequiredTargetIds = (deckId) => {
        const deck = deckById(deckId);
        return [songPackTargetId(), deck?.targetId].filter(Boolean);
      };
      const targetsReady = (ids) => {
        const targets = targetMap();
        return ids.length > 0 && ids.every((id) => targetReady(targets.get(id)));
      };
      const targetErrors = (ids) => {
        const targets = targetMap();
        return ids
          .map((id) => targets.get(id))
          .filter((target) => target?.status === "error" && !transientHealthError(target))
          .map((target) => target.label + ": " + (target.error || "error"));
      };
      const targetsStartupTimeoutMs = (ids) => {
        const targets = targetMap();
        const timing = state.status?.timing || {};
        const fallback = Number(timing.defaultStartupTimeoutMs) || 45000;
        const padding = Number(timing.playbackReadyWaitPaddingMs) || 5000;
        const maxTargetTimeout = ids.reduce((maxTimeout, id) => {
          const timeout = Number(targets.get(id)?.startupTimeoutMs);
          return Number.isFinite(timeout) ? Math.max(maxTimeout, timeout) : maxTimeout;
        }, fallback);
        return maxTargetTimeout + padding;
      };
      const formatSongLabel = (song) => song.title + (song.artist ? " / " + song.artist : "");
      const renderRuntimeStrip = (catalog) => {
        const root = byId("runtime-strip");
        const targets = targetMap();
        const ids = [
          catalog.songPackTargetId,
          ...(catalog.deckTargetIds || [])
        ].filter(Boolean);
        const uniqueIds = [...new Set(ids)];
        const pills = uniqueIds.map((id) => {
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
        if (target.status === "error" || target.error) return "is-error";
        if (target.health === "fail" && target.running) return "is-starting";
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
        const decks = configuredDecks();
        const requiredIds = new Set([
          catalog.songPackTargetId,
          ...(catalog.deckTargetIds || []),
          ...(catalog.requiredTargetIds || [])
        ].filter(Boolean));
        const targetsById = new Map(targets.map((target) => [target.id, target]));
        const rowGap = 88;
        const height = Math.max(310, 112 + Math.max(targets.length, decks.length, 2) * rowGap);
        const width = 980;
        const manager = { x: 28, y: Math.round(height / 2 - 38), w: 184, h: 76 };
        const targetNodes = targets.map((target, index) => ({
          target,
          x: 318,
          y: 56 + index * rowGap,
          w: 224,
          h: 76
        }));
        const songNodes = decks.map((deck, index) => {
          const song = selectedSongForDeck(deck.id);
          return {
            deck,
            song,
            x: 704,
            y: 56 + index * rowGap,
            w: 228,
            h: 76,
            title: song ? deck.label + ": " + song.title : deck.label + ": 曲JSON未選択",
            subtitle: song ? song.manifestPath : "song-packs/*/manifest.json",
            status: song ? "選択中" : "未選択"
          };
        });
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
        const songServerNode = targetNodes.find((item) => item.target.id === songServer?.id);
        for (const songNode of songNodes) {
          if (songServerNode) {
            appendMapEdge(
              svg,
              { x: songServerNode.x + songServerNode.w, y: songServerNode.y + songServerNode.h / 2 },
              { x: songNode.x, y: songNode.y + 24 },
              songServer?.running ? "is-related is-active" : "is-related"
            );
          }
          const deckTarget = targetsById.get(songNode.deck.targetId);
          const deckNode = targetNodes.find((item) => item.target.id === deckTarget?.id);
          if (deckNode) {
            appendMapEdge(
              svg,
              { x: songNode.x, y: songNode.y + 56 },
              { x: deckNode.x + deckNode.w, y: deckNode.y + deckNode.h / 2 },
              deckTarget?.running ? "is-related is-active" : "is-related"
            );
          }
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
        for (const songNode of songNodes) {
          appendMapNode(svg, {
            x: songNode.x,
            y: songNode.y,
            w: songNode.w,
            h: songNode.h,
            title: songNode.title,
            subtitle: songNode.subtitle,
            status: songNode.status,
            className: "is-song" + (songNode.song ? " is-required" : "")
          });
        }

        byId("system-map-stage").replaceChildren(svg);
        const runningCount = targets.filter((target) => target.running).length;
        byId("map-summary").textContent = "起動中 " + runningCount + " / " + targets.length;
      };
      const renderDeckCard = (deck, catalog) => {
        const target = deckTarget(deck.id);
        const current = byId(deckDomId(deck.id, "song-select"))?.value || "";
        const stored = storedDeckSongId(deck.id);
        const article = make("article", "deck-card " + mapStateClass(target));
        article.dataset.deckId = deck.id;
        article.append(make("h3", "", deck.label));
        article.append(make("p", "deck-status", target ? statusText(target) + " / port " + (target.ports?.join(", ") || "-") : "target未定義"));

        const label = make("label", "", "曲JSON");
        const select = make("select");
        select.id = deckDomId(deck.id, "song-select");
        select.setAttribute("aria-label", deck.label + " song manifest");
        if (!catalog.songs.length) {
          select.append(make("option", "", "曲JSONがありません"));
          select.disabled = true;
        } else {
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
        select.addEventListener("change", () => {
          rememberDeckSong(deck.id);
          rememberDeckLyricAdjustment(deck.id, "");
          renderDecks();
          if (state.status) renderSystemMap(state.status);
        });
        label.append(select);
        article.append(label);

        const offsetLabel = make("label", "deck-tuning", "歌詞補正(ms・正の値で遅らせる)");
        const offsetInput = make("input");
        offsetInput.id = deckDomId(deck.id, "lyric-offset");
        offsetInput.type = "number";
        offsetInput.min = "-30000";
        offsetInput.max = "30000";
        offsetInput.step = "10";
        offsetInput.value = String(storedDeckLyricOffsetMs(deck.id));
        offsetInput.setAttribute("aria-label", deck.label + " lyric offset milliseconds");
        offsetInput.addEventListener("change", () => {
          offsetInput.value = String(rememberDeckLyricOffset(deck.id, offsetInput.value));
          renderDecks();
          if (state.status) renderSystemMap(state.status);
        });
        offsetLabel.append(offsetInput);
        article.append(offsetLabel);

        const adjustmentLabel = make("label", "deck-tuning", "歌詞補正JSON URL");
        const adjustmentInput = make("input");
        adjustmentInput.id = deckDomId(deck.id, "lyric-adjustment");
        adjustmentInput.type = "text";
        adjustmentInput.placeholder = "任意: lyric-adjustment JSON URL";
        adjustmentInput.value = storedDeckLyricAdjustment(deck.id);
        adjustmentInput.setAttribute("aria-label", deck.label + " lyric adjustment JSON URL");
        adjustmentInput.addEventListener("change", () => {
          adjustmentInput.value = rememberDeckLyricAdjustment(deck.id, adjustmentInput.value);
          renderDecks();
          if (state.status) renderSystemMap(state.status);
        });
        adjustmentLabel.append(adjustmentInput);
        article.append(adjustmentLabel);

        const song = (catalog.songs || []).find((item) => item.directoryName === select.value) || null;
        const deckUrl = deckUrlForSong(deck, song);
        const duration = song?.duration ? " / " + Math.round(song.duration) + "秒" : "";
        article.append(make("p", "deck-meta", song ? formatSongLabel(song) + duration + " / " + song.manifestPath : "曲JSONを選んでください。"));
        article.append(make("code", "deck-url", deckUrl || "Deck URLを生成できません。"));

        const actions = make("div", "deck-actions");
        const openButton = make("button", "primary", "起動して開く");
        openButton.type = "button";
        openButton.disabled = state.busy || !deckUrl || !target;
        openButton.addEventListener("click", () => openDeck(deck.id));
        const copyButton = make("button", "", "URLコピー");
        copyButton.type = "button";
        copyButton.disabled = state.busy || !deckUrl;
        copyButton.addEventListener("click", () => copyDeckUrl(deck.id));
        const startButton = make("button", "", "起動");
        startButton.type = "button";
        startButton.disabled = state.busy || !target;
        startButton.addEventListener("click", () => startDeck(deck.id));
        const stopButton = make("button", "", "停止");
        stopButton.type = "button";
        stopButton.disabled = state.busy || !target;
        stopButton.addEventListener("click", () => stopDeck(deck.id));
        const restartButton = make("button", "", "再起動");
        restartButton.type = "button";
        restartButton.disabled = state.busy || !target;
        restartButton.addEventListener("click", () => restartDeck(deck.id));
        actions.append(openButton, copyButton, startButton, stopButton, restartButton);
        article.append(actions);
        return article;
      };
      const renderDecks = () => {
        const catalog = state.status?.songCatalog || { songs: [], errors: [], requiredTargetIds: [], decks: [] };
        const root = byId("deck-list");
        root.replaceChildren(...configuredDecks().map((deck) => renderDeckCard(deck, catalog)));
        renderRuntimeStrip(catalog);
        if (catalog.errors?.length) {
          setMessage("読み込めない曲JSONがあります: " + catalog.errors.join(" / "), "warn");
        }
      };
      const renderSongCatalog = (catalog = { songs: [], errors: [], requiredTargetIds: [], decks: [] }) => {
        renderDecks();
      };
      const renderSelectedShow = () => {
        const profile = selectedShowProfile();
        const setlistSelect = byId("setlist-select");
        const meta = byId("show-meta");
        const list = byId("show-setlist");
        const button = byId("select-setlist-song");
        const storedSetlist = loadStoredValue(selectedSetlistStorageKey);
        const current = setlistSelect.value;
        setlistSelect.replaceChildren();
        list.replaceChildren();

        if (!profile) {
          setlistSelect.append(make("option", "", "セットリストなし"));
          setlistSelect.disabled = true;
          button.disabled = true;
          meta.textContent = "show-profile は任意です。必要なイベント運用メモがある場合だけ show-profiles/<id>/show.json を置きます。";
          return;
        }

        const setlist = profile.setlist || [];
        if (!setlist.length) {
          setlistSelect.append(make("option", "", "セットリストなし"));
          setlistSelect.disabled = true;
          button.disabled = true;
        } else {
          setlistSelect.disabled = false;
          button.disabled = false;
          for (const item of setlist) {
            const option = make("option", "", String(item.index + 1) + ". " + item.label);
            option.value = String(item.index);
            option.title = item.manifestPath;
            setlistSelect.append(option);
          }
          const storedParts = storedSetlist.split(":");
          if (setlist.some((item) => String(item.index) === current)) {
            setlistSelect.value = current;
          } else if (storedParts[0] === profile.directoryName && setlist.some((item) => String(item.index) === storedParts[1])) {
            setlistSelect.value = storedParts[1];
          }
        }

        const selected = selectedSetlistItem();
        const description = profile.description ? " / " + profile.description : "";
        const selectedOffset =
          selected && selected.lyricOffsetMs
            ? " / 歌詞補正 " + selected.lyricOffsetMs + "ms"
            : "";
        const selectedAdjustment =
          selected && selected.lyricAdjustmentUrl
            ? " / 補正JSON " + selected.lyricAdjustmentPath
            : "";
        const selectedText = selected ? " / 選択: " + selected.label + " / " + selected.manifestPath + selectedOffset + selectedAdjustment : "";
        meta.textContent = profile.title + description + " / " + profile.showPath + selectedText;

        const chips = setlist.slice(0, 12).map((item) => {
          const chip = make("button", "", String(item.index + 1) + ". " + item.label);
          chip.type = "button";
          chip.title = item.notes || item.manifestPath;
          chip.addEventListener("click", () => {
            setlistSelect.value = String(item.index);
            rememberShowSelection();
            renderSelectedShow();
            applySongSelection(item.songDirectoryName, { lyricOffsetMs: item.lyricOffsetMs, lyricAdjustmentUrl: item.lyricAdjustmentUrl });
          });
          return chip;
        });
        list.replaceChildren(...chips);
      };
      const renderShowProfiles = (showProfiles = { profiles: [], errors: [] }) => {
        const select = byId("show-select");
        const current = select.value;
        const stored = loadStoredValue(selectedShowStorageKey);
        select.replaceChildren();
        if (!showProfiles.profiles.length) {
          select.append(make("option", "", "show-profileなし"));
          select.disabled = true;
        } else {
          select.disabled = false;
          for (const profile of showProfiles.profiles) {
            const option = make("option", "", profile.title);
            option.value = profile.directoryName;
            option.title = profile.showPath;
            select.append(option);
          }
          if (showProfiles.profiles.some((profile) => profile.directoryName === current)) {
            select.value = current;
          } else if (showProfiles.profiles.some((profile) => profile.directoryName === stored)) {
            select.value = stored;
          }
        }
        renderSelectedShow();
        if (showProfiles.errors?.length) {
          setMessage("読み込めないshow-profile項目があります: " + showProfiles.errors.join(" / "), "warn");
        }
      };
      const copyText = async (text) => {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return;
        }
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.append(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      };
      const startDeckTargets = async (deckId) => {
        if (!state.status?.songCatalog) throw new Error("曲カタログをまだ読み込めていません。");
        for (const targetId of deckRequiredTargetIds(deckId)) {
          await call("/api/targets/" + targetId + "/start", { method: "POST" });
        }
      };
      const waitForDeckTargets = async (deckId) => {
        const ids = deckRequiredTargetIds(deckId);
        const deadline = Date.now() + targetsStartupTimeoutMs(ids);
        while (Date.now() < deadline) {
          await refresh();
          const errors = targetErrors(ids);
          if (errors.length) throw new Error(errors.join(" / "));
          if (targetsReady(ids)) return;
          await sleep(800);
        }
        await refresh();
        const errors = targetErrors(ids);
        if (errors.length) throw new Error(errors.join(" / "));
        if (targetsReady(ids)) return;
        throw new Error(deckById(deckId)?.label + " の起動待ちがタイムアウトしました。サーバー状態カードの詳細ログを確認してください。");
      };
      const startDeck = async (deckId) => {
        const deck = deckById(deckId);
        if (!deck) return;
        try {
          setBusy(true);
          setMessage(deck.label + " を起動しています...", "warn");
          await startDeckTargets(deckId);
          await waitForDeckTargets(deckId);
          setMessage(deck.label + " を起動しました。", "ok");
        } catch (error) {
          setMessage(error.message, "error");
        } finally {
          setBusy(false);
          renderDecks();
        }
      };
      const stopDeck = async (deckId) => {
        const deck = deckById(deckId);
        if (!deck?.targetId) return;
        try {
          setBusy(true);
          setMessage(deck.label + " を停止しています...", "warn");
          await call("/api/targets/" + deck.targetId + "/stop", { method: "POST" });
          await refresh();
          setMessage(deck.label + " を停止しました。Song Data Serverと他Deckは止めていません。", "ok");
        } catch (error) {
          setMessage(error.message, "error");
        } finally {
          setBusy(false);
          renderDecks();
        }
      };
      const restartDeck = async (deckId) => {
        const deck = deckById(deckId);
        if (!deck?.targetId) return;
        try {
          setBusy(true);
          setMessage(deck.label + " を再起動しています...", "warn");
          await call("/api/targets/" + deck.targetId + "/restart", { method: "POST" });
          await waitForDeckTargets(deckId);
          setMessage(deck.label + " を再起動しました。", "ok");
        } catch (error) {
          setMessage(error.message, "error");
        } finally {
          setBusy(false);
          renderDecks();
        }
      };
      const copyDeckUrl = async (deckId) => {
        const deck = deckById(deckId);
        const url = selectedDeckUrl(deckId);
        if (!url) {
          setMessage("コピーできる " + (deck?.label || deckId) + " URLがありません。", "error");
          return;
        }
        rememberDeckSong(deckId);
        try {
          await copyText(url);
          setMessage((deck?.label || deckId) + " URLをコピーしました。", "ok");
        } catch (error) {
          setMessage("URLコピーに失敗しました: " + error.message, "error");
        }
      };
      const copyAllDeckUrls = async () => {
        const lines = configuredDecks()
          .map((deck) => {
            const url = selectedDeckUrl(deck.id);
            return url ? deck.label + ": " + url : "";
          })
          .filter(Boolean);
        if (!lines.length) {
          setMessage("コピーできるDeck URLがありません。", "error");
          return;
        }
        try {
          await copyText(lines.join("\\n"));
          setMessage("Deck URLをまとめてコピーしました。", "ok");
        } catch (error) {
          setMessage("URLコピーに失敗しました: " + error.message, "error");
        }
      };
      const stopAllDecks = async () => {
        const decks = configuredDecks().filter((deck) => deck.targetId);
        try {
          setBusy(true);
          setMessage("Deck A/Bだけを停止しています。Song Data Serverは停止しません。", "warn");
          for (const deck of [...decks].reverse()) {
            await call("/api/targets/" + deck.targetId + "/stop", { method: "POST" });
          }
          await refresh();
          setMessage("Deck A/Bを停止しました。Song Data Serverは起動したままです。", "ok");
        } catch (error) {
          setMessage(error.message, "error");
        } finally {
          setBusy(false);
          renderDecks();
        }
      };
      const openDeck = async (deckId) => {
        const deck = deckById(deckId);
        const song = selectedSongForDeck(deckId);
        const deckUrl = selectedDeckUrl(deckId);
        if (!song || !deckUrl) {
          setMessage("再生できる曲JSONを選んでください。", "error");
          return;
        }
        rememberDeckSong(deckId);
        const pendingWindow = window.open("about:blank", "_blank");
        try {
          setBusy(true);
          setMessage(deck.label + " に必要なサーバーを起動しています...", "warn");
          await startDeckTargets(deckId);
          await waitForDeckTargets(deckId);
          if (pendingWindow) {
            pendingWindow.opener = null;
            pendingWindow.location.replace(deckUrl);
            setMessage(deck.label + "で " + formatSongLabel(song) + " を開きました。", "ok");
          } else {
            setMessage("再生画面へ移動します。", "ok");
            window.location.href = deckUrl;
          }
        } catch (error) {
          if (pendingWindow) pendingWindow.close();
          setMessage(error.message, "error");
        } finally {
          setBusy(false);
          renderDecks();
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
          metricNode("起動待ち上限", formatDurationMs(target.startupTimeoutMs)),
          metricNode("起動所要時間", formatElapsedMs(target.startupDurationMs)),
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
          ["Startup timeout", formatDurationMs(target.startupTimeoutMs)],
          ["Startup duration", formatElapsedMs(target.startupDurationMs)],
          ["Ready", formatDate(target.readyAt)],
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
        renderShowProfiles(status.showProfiles);
        renderSystemMap(status);
        renderNetworkExposure(status.networkExposure);
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
      byId("show-select").addEventListener("change", () => {
        rememberShowSelection();
        renderSelectedShow();
      });
      byId("setlist-select").addEventListener("change", () => {
        rememberShowSelection();
        renderSelectedShow();
      });
      byId("control-token").value = sessionStorage.getItem(controlTokenStorageKey) || "";
      byId("control-token").addEventListener("input", () => {
        sessionStorage.setItem(controlTokenStorageKey, byId("control-token").value);
      });
      byId("select-setlist-song").addEventListener("click", () => {
        const item = selectedSetlistItem();
        if (!item) {
          setMessage("反映できるセットリスト項目を選んでください。", "warn");
          return;
        }
        rememberShowSelection();
        applySongSelection(item.songDirectoryName, { lyricOffsetMs: item.lyricOffsetMs, lyricAdjustmentUrl: item.lyricAdjustmentUrl });
      });
      byId("stop-decks").addEventListener("click", stopAllDecks);
      byId("copy-deck-urls").addEventListener("click", copyAllDeckUrls);
      refresh().catch((error) => setMessage(error.message, "error"));
      setInterval(() => {
        const readingLogs = document.querySelector(".tech-details[open], .tech-details:hover, .tech-details:focus-within");
        if (!state.busy && !readingLogs) refresh().catch(() => {});
      }, 2000);
    </script>
  </body>
</html>`;
};
