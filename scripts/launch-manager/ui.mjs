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
      .toolbar, .target-actions, .links {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }
      .toolbar {
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.035);
        margin-bottom: 16px;
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
      .danger { border-color: rgba(255, 170, 165, 0.45); }
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
      details {
        border-top: 1px solid var(--line);
        background: rgba(0, 0, 0, 0.16);
      }
      summary {
        cursor: pointer;
        padding: 10px 14px;
        color: var(--info);
      }
      pre {
        margin: 0;
        max-height: 240px;
        overflow: auto;
        padding: 0 14px 14px;
        color: #e8dfd2;
        font-size: 12px;
        line-height: 1.55;
        white-space: pre-wrap;
      }
      .footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 12px;
      }
      @media (max-width: 760px) {
        header { display: block; }
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
          <p>Launch Server が正本として managed target を起動・停止・監視します。曲ごとの映像設計やJSON文法はここでは決めません。</p>
        </div>
        <p id="updated-at">status loading...</p>
      </header>

      <section class="toolbar" aria-label="Launch set controls">
        <select id="set-select" aria-label="Launch Set"></select>
        <button id="start-set">選択Setを起動</button>
        <button id="stop-set">選択Setを停止</button>
        <button id="stop-all" class="danger">全停止</button>
        <button id="refresh">更新</button>
      </section>

      <p class="note">このタブを閉じても起動中のtargetは止まりません。停止するには各targetの停止、Set停止、または全停止を使ってください。</p>

      <section id="targets" class="grid" aria-label="Launch targets"></section>
      <p id="runtime" class="footer"></p>
    </main>
    <script nonce="${escapeHtml(nonce)}">
      const state = { status: null, busy: false };
      const byId = (id) => document.getElementById(id);
      const make = (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };
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
      const statusText = (target) => {
        const health = target.health && target.health !== "none" ? " / health " + target.health : "";
        return target.status + health;
      };
      const stripAnsi = (value) => String(value || "").replace(/\\u001B\\[[0-?]*[ -/]*[@-~]/g, "");
      const formatDate = (value) => value ? new Date(value).toLocaleString() : "-";
      const formatMetrics = (metrics) => {
        if (!metrics || metrics.exists === false) return "CPU - / Memory -";
        const cpu = Number.isFinite(metrics.cpuPercent) ? metrics.cpuPercent + "%" : "-";
        const memory = Number.isFinite(metrics.memoryMb) ? metrics.memoryMb + " MB" : "-";
        return "CPU " + cpu + " / Memory " + memory;
      };
      const setBusy = (busy) => {
        state.busy = busy;
        document.querySelectorAll("button").forEach((button) => button.disabled = busy);
      };
      const post = async (url) => {
        try {
          setBusy(true);
          await call(url, { method: "POST" });
          await refresh();
        } catch (error) {
          alert(error.message);
        } finally {
          setBusy(false);
        }
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
      const renderTarget = (target) => {
        const article = make("article", "target is-" + target.status + (target.error ? " has-error" : ""));
        const head = make("div", "target-head");
        const title = make("div");
        title.append(make("h2", "", target.label));
        title.append(make("p", "", target.kind + " / " + target.id));
        const status = make("div", "status");
        status.append(make("span", "dot"));
        status.append(make("span", "", statusText(target)));
        head.append(title, status);

        const body = make("div", "target-body");
        const dl = make("dl");
        const rows = [
          ["PID", target.pid || "-"],
          ["Ports", target.ports.length ? target.ports.join(", ") : "-"],
          ["Resource", formatMetrics(target.metrics)],
          ["Started", formatDate(target.startedAt)],
          ["Command", target.command + " " + target.args.join(" ")],
          ["CWD", target.cwd]
        ];
        for (const [key, value] of rows) {
          dl.append(make("dt", "", key), make("dd", "", value));
        }
        body.append(dl);

        const links = make("div", "links");
        for (const [key, url] of Object.entries(target.urls || {})) {
          const link = make("a", "launch", key === "open" ? "開く" : key);
          link.href = url;
          link.target = "_blank";
          link.rel = "noreferrer";
          links.append(link);
        }
        body.append(links);

        const actions = make("div", "target-actions");
        actions.append(
          actionButton("起動", "/api/targets/" + target.id + "/start"),
          actionButton("停止", "/api/targets/" + target.id + "/stop"),
          actionButton("再起動", "/api/targets/" + target.id + "/restart")
        );
        body.append(actions);
        body.append(make("p", "error", target.error || ""));

        const logs = target.logs || {};
        const stdout = make("details");
        stdout.open = true;
        stdout.append(make("summary", "", "stdout"));
        stdout.append(make("pre", "", stripAnsi(logs.stdout) || "stdout log is empty."));
        const stderr = make("details");
        stderr.append(make("summary", "", "stderr"));
        stderr.append(make("pre", "", stripAnsi(logs.stderr) || "stderr log is empty."));

        article.append(head, body, stdout, stderr);
        return article;
      };
      const actionButton = (label, url) => {
        const button = make("button", "", label);
        button.addEventListener("click", () => post(url));
        return button;
      };
      const render = (status) => {
        renderSets(status.sets || []);
        byId("updated-at").textContent = "更新: " + new Date(status.updatedAt).toLocaleTimeString();
        byId("runtime").textContent = "config: " + status.configPath + " / runtime: " + status.runtimeRoot;
        const root = byId("targets");
        root.replaceChildren(...status.targets.map(renderTarget));
      };
      const refresh = async () => {
        state.status = await call("/api/status");
        render(state.status);
      };
      byId("start-set").addEventListener("click", () => post("/api/sets/" + byId("set-select").value + "/start"));
      byId("stop-set").addEventListener("click", () => post("/api/sets/" + byId("set-select").value + "/stop"));
      byId("stop-all").addEventListener("click", () => post("/api/stop-all"));
      byId("refresh").addEventListener("click", () => refresh());
      refresh().catch((error) => alert(error.message));
      setInterval(() => {
        if (!state.busy) refresh().catch(() => {});
      }, 2000);
    </script>
  </body>
</html>`;
