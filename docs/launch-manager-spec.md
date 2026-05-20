# Launch Manager Spec

この文書は、複数の曲用映像や補助サーバーを起動、停止、監視するための簡素版Launch Manager仕様です。

レビュー用の見取り図HTMLは `docs/launch-manager-spec.html` です。

目的は、高機能な統合運用システムを最初から作ることではありません。ライブや制作中に「どれが動いているか」「どのポートを使っているか」「止めたいものを確実に止められるか」を見やすくする、小さく使える起動管理ツールを作ることです。

## 基本方針

- PC上に1つのLaunch Serverを立てる。
- PCブラウザや将来のスマホ画面は、Launch Serverへ命令を送るLaunch Manager UIとして扱う。
- 曲用映像サーバーはLaunch Serverそのものではない。Launch Serverから起動される対象の1つです。
- 起動対象は曲に限らず、fixture player、song-pack server、保存API、外部ツールなども同じLaunch Targetとして扱う。
- 曲ごとの映像構成、描画方式、JSON文法、UIはLaunch Manager側で決めない。
- 最初はmanaged targetだけを扱う。attached/delegatedや複数Launch Serverの調停は後回しにする。

## 用語

### Launch Server

PC上で動く起動管理の本体です。

責任:

- target定義を読む。
- 起動、停止、再起動を実行する。
- PID、port、URL、ログ場所、状態を持つ。
- stdout/stderrを保存する。
- CPU/memoryを簡易監視する。
- UI向けAPIを提供する。

### Launch Manager UI

PCブラウザや将来のスマホから開く操作画面です。

責任:

- target一覧を表示する。
- 起動、停止、再起動、全停止をLaunch Serverへ依頼する。
- 状態、PID、port、URL、CPU、memory、ログ末尾を表示する。

UIは正本を持ちません。ブラウザタブを閉じても起動中targetは止まりません。

### Launch Target

起動、停止、監視できる対象です。

例:

- 曲Aの映像サーバー
- 曲Bの映像サーバー
- fixture player
- song-pack server
- 保存API
- 外部ツール起動用ラッパー

### Launch Set

複数のLaunch Targetをまとめた起動セットです。

例:

- `basic-fixture`: fixture player + song-pack server
- `live-preview`: 曲A映像 + 曲B映像 + song-pack server

Profileという大きい概念にはせず、最初はsetとして軽く扱います。

## 正本

MVPでは、起動/停止/PID/port/log/resourceの正本はPC上のLaunch Serverが持ちます。

```text
Launch Manager UI
  操作要求を送る

Launch Server
  target定義を検証し、起動/停止し、状態を持つ

Song Visual Server
  映像を出す。必要なら自分のready/errorをLaunch Serverへ見せる
```

将来スマホ操作を追加する場合も、スマホはUIクライアントです。起動/停止の権限はPC上のLaunch Serverに残します。

## 状態

内部ではPIDやhealthなどを持ちますが、UIとMVP実装では次の5状態だけを基本にします。

- `stopped`: 停止中。
- `starting`: 起動処理中。
- `running`: 起動中。
- `stopping`: 停止処理中。
- `error`: 起動失敗、異常終了、health check失敗。

`desired / actual / health` の細かい分離は設計上の考え方として残しますが、最初の実装ではUI概念として前面に出しません。

## target定義

最初は `launch/targets.json` ひとつにまとめます。

```json
{
  "targets": [
    {
      "id": "fixture-player",
      "label": "Fixture player",
      "kind": "web-app",
      "cwd": ".",
      "command": "npm",
      "args": ["run", "dev:player", "--", "--port", "5173"],
      "ports": [5173],
      "urls": {
        "open": "http://127.0.0.1:5173/"
      },
      "health": {
        "url": "http://127.0.0.1:5173/",
        "intervalMs": 5000
      }
    }
  ],
  "sets": [
    {
      "id": "basic-fixture",
      "label": "Basic fixture",
      "targets": ["fixture-player", "song-pack-server"]
    }
  ]
}
```

初期制約:

- GUIから任意コマンドを入力させない。
- 起動できるものは `launch/targets.json` に書かれたtargetだけ。
- `cwd` はリポジトリ内、または明示許可されたローカルディレクトリだけ。
- 外部URLからtarget定義を読まない。
- target定義は既存曲テンプレートではない。曲ごとに自由に追加してよい。

## ポート管理

最初は賢くしすぎない。

- targetに固定portを書ける。
- 起動前にportが空いているか確認する。
- portが埋まっていたら自動変更せず、エラー表示する。
- GUIに「どのportが衝突しているか」を出す。
- 将来必要なら `autoPort: true` と代替rangeを追加する。

理由:

ライブ現場では、勝手にURLが変わるより、衝突を明示して止まる方が事故が少ないため。

## ログ

MVPではログを最小にします。

```text
.codex/runtime/launch-manager/
  latest-status.json
  targets/
    <target-id>/
      stdout.log
      stderr.log
```

GUIはログ末尾だけを表示します。詳細なイベント履歴やmetrics履歴は後で追加します。

## リソース監視

最初は簡易表示だけにします。

- PID
- CPU %
- Memory MB
- 起動時刻
- exit code

監視頻度:

- `starting`: 1秒ごとにhealth確認。
- `running`: 5秒ごとにhealth/resource確認。
- `error`: 2秒ごと、または手動更新。
- `stopped`: 基本監視しない。
- UI一覧: 2秒ごとに `/api/status` をポーリング。

グラフや長期履歴はMVPに含めません。

## 起動手順

```text
1. PCでLaunch Serverを起動する。
2. Launch Manager UIを開く。
3. Launch SetまたはLaunch Targetを選ぶ。
4. 起動ボタンを押す。
5. Launch Serverがtarget定義を検証する。
6. port衝突を確認する。
7. stdout/stderrログファイルを用意する。
8. processを起動する。
9. health checkする。
10. UIにrunning/errorを表示する。
```

## 停止手順

- 個別停止: 対象targetだけ停止する。
- Set停止: そのsetに含まれるtargetを停止する。
- 全停止: Launch Serverが管理しているtargetを全部停止する。
- UIタブを閉じる: 何も止めない。
- Launch Server終了: MVPでは管理中targetを停止してから終了する。

将来の拡張として「targetを残してLaunch Serverだけ終了」は検討しますが、MVPには含めません。

## GUI

MVP画面:

- 上部: Launch Set選択。
- 上部: 選択Setを起動、選択Setを停止、全停止。
- 中央: targetカード一覧。
- targetカード: 状態、PID、port、URL、CPU、memory、起動時刻。
- targetカード操作: 起動、停止、再起動、開く。
- 下部またはカード内: stdout/stderrの直近ログ。
- 警告: port衝突、起動失敗、異常終了、health失敗。

GUI上には、次の注意を表示します。

```text
このタブを閉じても起動中のtargetは止まりません。停止するには各targetの停止、Set停止、または全停止を使ってください。
```

## API案

MVP:

- `GET /api/status`
- `POST /api/targets/:id/start`
- `POST /api/targets/:id/stop`
- `POST /api/targets/:id/restart`
- `POST /api/sets/:id/start`
- `POST /api/sets/:id/stop`
- `POST /api/stop-all`

ログは最初は `/api/status` に末尾を含めてもよいです。必要になったら次を追加します。

- `GET /api/targets/:id/logs?stream=stdout|stderr`
- `GET /api/events` with SSE

## セキュリティ

MVP:

- bind先は `127.0.0.1` のみ。
- POST APIはsame-originだけ許可する。
- 任意コマンド入力UIは作らない。
- target定義はローカルファイルだけ。
- targetの `cwd` とログ出力先がリポジトリまたは許可ディレクトリ内にあることを確認する。
- 停止対象はLaunch Serverが起動したmanaged targetだけ。

将来スマホ操作:

- 明示オプションを指定した時だけLAN公開する。
- PINまたは一時トークンを必須にする。
- 操作可能時間を制限する。
- 緊急停止ボタンを大きくする。

## MVPに含めないもの

- 複数Launch Server間の調停。
- `attached` mode。
- `delegated` mode。
- 自動port再割当。
- CPU/memory履歴グラフ。
- WebSocket/SSEのリアルタイム通知。
- 任意コマンド入力GUI。
- LAN公開とスマホ専用UI。
- 曲ごとの映像設計やadapter実装。

## 実装準備

次の実装プロセスでは、まず小さく分けます。

```text
scripts/launch-manager/
  config.mjs       targets.json読み込みと検証
  supervisor.mjs   spawn/stop/restart/process状態
  ports.mjs        port衝突確認
  logs.mjs         stdout/stderr保存と末尾取得
  metrics.mjs      PID/CPU/memoryの簡易取得
  server.mjs       HTTP APIとHTML UI

launch/
  targets.json     初期targetとset
```

既存の `scripts/dev-manager.mjs` は、最初の実装では互換入口として残してよいです。内部から `scripts/launch-manager/server.mjs` を呼ぶか、段階的に置き換えます。

確認方法:

- `npm run build`
- `npm run dev`
- GUIから `basic-fixture` を起動/停止できる。
- port衝突時に起動せず、GUIにエラーが出る。
- 起動中targetのPID、port、stdout/stderr、CPU/memoryが見える。
- GUIタブを閉じてもtargetは止まらない。
- Launch Server終了時にtargetが停止する。
