# Launch Manager Spec

この文書は、複数の曲用映像や補助サーバーを起動、停止、監視するための簡素版Launch Manager仕様です。

レビュー用の見取り図HTMLは `docs/archive/working-notes/launch-manager-spec.html` です。

目的は、高機能な統合運用システムを最初から作ることではありません。ライブや制作中に「どれが動いているか」「どのポートを使っているか」「止めたいものを確実に止められるか」を見やすくする、小さく使える起動管理ツールを作ることです。

## 基本方針

- PC上に1つのLaunch Serverを立てる。
- PCブラウザや将来のスマホ画面は、Launch Serverへ命令を送るLaunch Manager UIとして扱う。
- 曲用映像サーバーはLaunch Serverそのものではない。Launch Serverから起動される対象の1つです。
- 起動対象は曲に限らず、fixture player、song-pack server、保存API、外部ツールなども同じLaunch Targetとして扱う。
- 曲ごとの映像構成、描画方式、JSON文法、UIはLaunch Manager側で決めない。
- ライブ/VJ運用で2つの再生台を使う場合は、`docs/deck-playback.md` のDeck A/B仕様を正本にする。
- 最初はmanaged targetだけを扱う。attached/delegatedや複数Launch Serverの調停は後回しにする。

## 用語

### Launch Server

PC上で動く起動管理の本体です。

責任:

- target定義を読む。
- worktreeごとの空きポートを自動割当し、`.codex/runtime/ports.json` に記録する。
- 起動、停止、再起動を実行する。
- PID、port、URL、ログ場所、状態を持つ。
- stdout/stderrを保存する。
- CPU/memoryを簡易監視する。
- UI向けAPIを提供する。

### Launch Manager UI

PCブラウザや将来のスマホから開く操作画面です。

責任:

- target一覧を表示する。
- `song-packs/*/manifest.json` を曲JSONメニューとして表示し、選択した曲のfixture player URLを作る。
- `show-profiles/*/show.json` があれば、任意のセットリストとして表示し、該当する曲JSON選択を補助する。
- 起動、停止、再起動、全停止をLaunch Serverへ依頼する。
- 状態マップ、PID、port、URL、CPU、memory、ログ末尾を表示する。
- Git共通ディレクトリのworktree-sync通知を読み、各担当のready、質問、ブロッカー、ackを閲覧しやすく表示する。

UIは正本を持ちません。ブラウザタブを閉じても起動中targetは止まりません。

`show-profile` は任意の運用メモです。Launch Managerは読める範囲だけ表示し、未知の項目は無視します。show-profileが存在しなくても、曲JSONメニューとtarget起動は従来通り動きます。

### Launch Target

起動、停止、監視できる対象です。

例:

- 曲Aの映像サーバー
- 曲Bの映像サーバー
- Deck A player
- Deck B player
- fixture player
- song-pack server
- 保存API
- 外部ツール起動用ラッパー

### Launch Set

複数のLaunch Targetをまとめた起動セットです。

例:

- `basic-fixture`: fixture player + song-pack server
- `live-preview`: 曲A映像 + 曲B映像 + song-pack server
- `deck-preview`: Deck A player + Deck B player + song-pack server

Profileという大きい概念にはせず、最初はsetとして軽く扱います。

Deck A/Bはライブ/VJ向けの標準再生単位です。Deckは曲そのものではなく、独立したplayer server、選択曲、output URL、将来のDeck-local stateを持つ再生台です。詳細は `docs/deck-playback.md` を参照してください。

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
      "label": "再生画面",
      "kind": "web-app",
      "cwd": ".",
      "command": "npm",
      "args": ["run", "dev:player", "--", "--port", "${PLAYER_PORT:-5173}"],
      "ports": ["${PLAYER_PORT:-5173}"],
      "startupTimeoutMs": 60000,
      "urls": {
        "open": "http://127.0.0.1:${PLAYER_PORT:-5173}/"
      },
      "health": {
        "url": "http://127.0.0.1:${PLAYER_PORT:-5173}/",
        "intervalMs": 5000
      }
    }
  ],
  "sets": [
    {
      "id": "basic-fixture",
      "label": "標準再生セット",
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

## 起動待ち時間

各サーバーの起動待ち時間は、Launch Managerのtarget定義で管理します。

- `startupTimeoutMs`: process起動後、healthがreadyになるまでLaunch Managerが待つ上限時間。単位はミリ秒。
- `startupTimeoutMs` を省略したtargetは、システム標準の `45000` ms を使う。
- `選択曲を再生` は、必要targetの `startupTimeoutMs` の最大値に、システム標準の余裕 `5000` ms を足した時間まで待つ。
- 起動中targetのhealthが一時的に失敗しても、`startupTimeoutMs` の範囲内では即失敗扱いにしない。
- `startupTimeoutMs` を超えてもhealthがreadyにならない場合、targetは `error` になり、GUIはログ確認を促す。

初期値:

| target | startupTimeoutMs | 意図 |
| --- | ---: | --- |
| `fixture-player` | `60000` | Viteや3D/大きめbundleの初回起動を許容する。 |
| `song-pack-server` | `30000` | 軽いasset serverとして短めに失敗検知する。 |

この値は曲ごとの映像設計ではなく、Launch Managerが管理する起動運用の仕様です。曲パック側へは持ち込まないでください。

## ポート管理

人間が担当ごとにport表を管理しない。

- Launch Manager起動時に、worktree rootから安定した候補帯を作る。
- `DEV_MANAGER_PORT`、`PLAYER_PORT`、`SONG_PACK_PORT` が未指定なら、空きportを自動で選ぶ。
- 明示指定されたportは尊重し、重複や不正値は起動エラーにする。
- 実際のportは `.codex/runtime/ports.json` とGUI下部に表示する。
- target起動直前にもport衝突を確認し、割当後に別プロセスが使った場合はGUIにエラーを出す。

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
6. target起動直前にport衝突を確認する。
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

- 上部: 曲JSON選択。`song-packs/<song-id>/manifest.json` を選び、必要なtargetを起動して再生画面を開く。
- Deck表示: Deck A/Bを使う実装では、Deckごとに曲JSON選択、URL copy/open、start/stop/restart、statusを表示する。標準の「選択曲を再生」はDeck A互換として扱ってよい。
- show-profile / セットリスト: `show-profiles/<show-id>/show.json` がある場合だけ、イベントや検証会用の曲順を表示する。項目を曲JSON選択へ反映できるが、曲パックの文法や外部連携方式は決めない。
- 状態マップ: Launch Manager、各target、選択中の曲JSONをノードとして表示する。起動中ノードと関連線は発光し、サーバーが増えても連携関係を見渡せるようにする。
- 担当メッセージ: `sync:ready`、`sync:note`、`sync:ack` の履歴を、要対応、担当、種別で絞り込み表示する。書き込みやack操作はCLIの `sync:*` に残し、GUIは読み取り専用にする。
- 詳細操作: Launch Set選択、選択Set起動、選択Set停止、全停止。全停止は二度押し確認にする。
- 中央: サーバー状態カード一覧。
- サーバーカード: 状態、port、起動時刻を先に表示する。
- サーバーカード操作: 起動、停止、再起動。
- 詳細欄: PID、ID、command、CWD、stdout/stderrの直近ログ。
- 警告: port衝突、起動失敗、異常終了、health失敗。

GUI上には、次の注意を表示します。

```text
このタブを閉じても起動中のtargetは止まりません。停止するには各targetの停止、Set停止、または全停止を使ってください。
```

## API案

MVP:

- `GET /api/status`。target状態に加え、曲JSONメニュー用の `songCatalog` を返す。
- `GET /api/status` は、存在する場合だけ `showProfiles` も返す。show-profileはローカル `show-profiles/*/show.json` の最小メタデータとsetlistだけを読む。
- `GET /api/status` は `networkExposure` も返す。UIはLAN公開中やcontrol token要求を表示する。
- `GET /api/sync-events`。Git共通ディレクトリの `codex-sync/events.jsonl` からready/note/ackを読み、担当別・要対応別に整形して返す。
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

- bind先は既定で `127.0.0.1`。LAN公開は `LAUNCH_MANAGER_ALLOW_LAN=1` を明示した時だけ許可する。
- POST APIはsame-originだけ許可する。LAN公開時は `LAUNCH_MANAGER_CONTROL_TOKEN` が設定されていない限り状態変更APIを拒否し、設定されている場合は `X-Control-Token` または `Authorization: Bearer` で確認する。
- LAN公開中はGUIに警告を出す。
- 任意コマンド入力UIは作らない。
- worktree-sync通知GUIは読み取り専用にし、ack、note、mergeなどの書き込み操作は既存CLIに残す。
- target定義はローカルファイルだけ。
- 曲JSONメニューはローカル `song-packs/*/manifest.json` の最小メタデータだけを読む。音源解析、歌詞本文解析、外部URL由来のtarget定義読み込みは行わない。
- targetの `cwd` とログ出力先がリポジトリまたは許可ディレクトリ内にあることを確認する。
- 停止対象はLaunch Serverが起動したmanaged targetだけ。

将来スマホ操作:

- 現在のLAN公開opt-inとcontrol tokenは最低限の誤操作防止です。観客入力、インターネット公開、本番VJ卓などでは別途認証、ネットワーク分離、操作権限、ログ、停止手順を設計します。
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
- 本格的なLAN操作卓とスマホ専用UI。
- Deck A/B間のクロスフェード、音声ミックス、program/previewの最終切替。
- 曲ごとの映像設計やadapter実装。

## 実装準備

次の実装プロセスでは、まず小さく分けます。

```text
scripts/launch-manager/
  config.mjs       targets.json読み込みと検証
  auto-ports.mjs   worktreeごとのport自動割当とports.json記録
  supervisor.mjs   spawn/stop/restart/process状態
  ports.mjs        port空き確認と候補探索
  logs.mjs         stdout/stderr保存と末尾取得
  metrics.mjs      PID/CPU/memoryの簡易取得
  server.mjs       HTTP APIとHTML UI
  sync-events.mjs  worktree-sync通知の読み取り専用整形

launch/
  targets.json     初期targetとset
```

既存の `scripts/dev-manager.mjs` は、最初の実装では互換入口として残してよいです。内部から `scripts/launch-manager/server.mjs` を呼ぶか、段階的に置き換えます。

確認方法:

- `npm run build`
- `npm run dev`
- `/api/status` に root、launchPorts、portsFile が出る。
- GUIから `basic-fixture` を起動/停止できる。
- target起動直前のport衝突時に起動せず、GUIにエラーが出る。
- 起動中targetのPID、port、stdout/stderr、CPU/memoryが見える。
- GUIタブを閉じてもtargetは止まらない。
- Launch Server終了時にtargetが停止する。
