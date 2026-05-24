# Music Effect System Kit

音楽に同期したインタラクティブ映像エフェクトを、曲ごとに自由に作るための補助kitです。

このリポジトリの中心は、特定の曲の構成ではありません。`system/kit` は、manifest読み込み、再生、フレームループ、タイミング処理、安全なasset読み込みなどの小さな補助機能を提供します。曲ごとの演出、データ構造、JSON文法、UI、描画方式は曲側で自由に決めます。

## Setup

Windowsで普段使う場合は、リポジトリ直下の `start-music-effect.cmd` をダブルクリックします。同じworktreeのLaunch Managerが既に起動中なら管理画面を開くだけです。別worktreeのLaunch Managerが起動中でも、そのポートへ誤接続せず、このworktree用の空きポートを自動で使います。初回だけ `node_modules` が無ければ `npm ci` を実行し、npm registryから依存パッケージを取得します。

手動で起動する場合:

```powershell
npm install
npm run dev
```

`npm run dev` はLaunch Managerを立ち上げます。ブラウザで管理画面を開き、曲JSONを選んで再生すると、再生画面と曲データサーバーが起動し、選択した曲の再生画面を開きます。ポートはworktreeごとに自動割当され、起動後に `.codex/runtime/ports.json` とGUI下部へ表示されます。

ライブ/VJ運用では、今後Deck A/Bを標準の再生単位として扱います。2つのplayer serverを別portで起動し、TouchDesigner、OBS、Unityなどの外部ツールがそれぞれのURLを読み込みます。詳細は `docs/deck-playback.md` を参照してください。

Launch Managerでできること:

- 曲JSONメニューから `song-packs/*/manifest.json` を選び、選択曲を再生する。
- Launch Manager、各サーバー、選択中の曲JSONを状態マップで見て、起動中のノードと連携線を視覚的に確認する。
- `launch/targets.json` に書かれた起動対象だけを起動する。
- サーバーごとの起動、停止、再起動、起動セットの起動/停止、全停止を行う。全停止は誤操作防止のため二度押し確認です。
- PID、port、health、CPU、memory、stdout/stderr末尾を見る。
- `launch/targets.json` の `startupTimeoutMs` で、サーバーごとの起動待ち上限を管理する。
- worktree、Launch Manager、再生画面、曲データサーバーの実ポートを見る。
- 起動時に空きポートを自動割当し、既に起動している別worktreeの管理画面へ誤接続しない。

GUIタブを閉じても起動中サーバーは止まりません。停止するには、管理画面の各サーバー停止、起動セット停止、または全停止を使ってください。Launch Manager自体を終了すると、MVPでは管理中サーバーを停止してから終了します。

fixture player appは `?song=<manifest-url>` で曲パッケージを指定して開きます。実際のポートはGUIや `.codex/runtime/ports.json` を確認してください。

```text
http://127.0.0.1:<player-port>/?song=http://127.0.0.1:<song-pack-port>/<song-id>/manifest.json
```

manifest URLを指定しない場合、特定の曲へ自動フォールバックしません。これは、システムが既存曲に引っ張られないようにするためです。

個別に起動する場合は、次も使えます。

```powershell
npm run dev:player
npm run dev:songs
```

別worktreeで同時に起動する場合も、通常は手でポートを割り当てる必要はありません。必要な場合だけ、環境変数で明示できます。

```powershell
$env:DEV_MANAGER_PORT=5182
$env:PLAYER_PORT=5183
$env:SONG_PACK_PORT=5184
npm run dev
```

## System-Neutral Docs

docsの読み分けで迷ったら、まず `docs/README.md` を見てください。

新しい曲を作るときは、既存の曲パッケージを読まず、まず次を読んでください。

```text
docs/README.md
docs/system-overview.md
docs/song-authoring.md
docs/song-visual-independence.md
```

重要なルール:

- 既存の `song-packs/*` はテンプレートではありません。
- 新しい曲を作るときは、既存曲のmanifest、analysis、design、adapter、演出コードを見ないでください。
- 既存曲を見るのは、その曲自体を直すとき、回帰確認をするとき、またはユーザーが明示的に許可したときだけです。
- `examples/fixtures/soft-light-player` のsoft light rendererやeffect群も、新曲の視覚テンプレートとして読まないでください。
- 曲ごとの構成は自由です。既存曲の構成に合わせる必要はありません。

曲アプリを作る場合は、空に近い出発点として `templates/neutral-song-app/` を使えます。最初のプレビュー後は `docs/song-visual-independence.md` で、構図、色、主役、線/光、カメラ視点が前作に寄りすぎていないか確認してください。

## Song Package

曲パッケージは `song-packs/<song-id>/` に置けます。ただし、このディレクトリにある既存曲はテンプレートではなく、あくまで個別の実装例です。

同梱のfixture playerで曲を読む場合は、入口としてmanifest URLを渡します。manifestの先の構成は、曲ごとに自由に設計して構いません。

最小manifestの考え方:

```json
{
  "id": "song-id",
  "title": "Song Title",
  "artist": "Artist",
  "duration": 180
}
```

必要に応じて、歌詞、解析JSON、音源、クレジット、Web adapter IDなどを追加します。現行のWeb adapterは同一ビルド内の `builtin:*` / `song:*` IDだけを解決し、URLや相対パスのadapterコードは読み込みません。

既存曲を見ずに中立的な雛形を作る場合:

```powershell
npm run song:scaffold -- --id song-id --title "Song Title" --artist "Artist" --adapter-id none
```

曲パック内の参照URLメモを検証する場合:

```powershell
npm run song:validate -- --id song-id
```

## Included Fixture

この節は動作確認用です。新しい曲を設計するときの入口ではありません。

現在は動作確認用の曲パッケージとして、魔王魂「Shining Star」を同梱しています。

```text
http://127.0.0.1:<player-port>/?song=http://127.0.0.1:<song-pack-port>/shining-star/manifest.json
```

これはfixtureであり、次の曲の標準構成ではありません。新しい曲を作るときは、この中身を見ずに `docs/song-authoring.md` から始めてください。

音源ファイルはライセンス上コミットしません。ローカルで再生したい場合は、対象曲パッケージのaudioディレクトリに配置するか、画面下の `Audio` からローカル音源を選んでください。未配置でも内部クロックで映像だけ動きます。

## Optional Lyric Timing Tool

歌詞の切り替わりがずれている場合は、ブラウザ上で手動キーフレームを打てます。この機能はfixture playerに載せているoptional toolです。歌詞がない曲や、別のタイミング構造を使う曲では使わなくても構いません。

基本操作:

- `Lyric Timing` を `On` にする。
- `A`: 現在表示中の歌詞行の開始時刻を現在時刻に登録。
- `D`: 次の歌詞行の開始時刻を現在時刻に登録。
- `Undo` または `Ctrl+Z` / `Backspace`: 直前の調整を戻す。
- `Clear`: 手動キーフレームを消去。
- `Export`: 調整済みJSONを書き出す。
- `Space`: 再生/停止。

`All` は全体補正、`From #n` は現在行以降の補正です。シーケンスバー上のストーンで補正前後の位置を見られます。

## License Safety

- 音源ファイルをAI学習に使わない。
- 音源波形をCodexやアプリ側で解析し直さない。
- ブラウザ上では音源を再生するだけにする。
- 演出タイミングは解析済みJSON、歌詞テキスト、手動マーカー、手動入力などから作る。
- 公開やイベント利用時は、素材とAPIの利用条件を確認する。

## Security Safety

- 開発サーバーは既定でloopback hostだけで使います。Launch ManagerをLAN公開する場合は `docs/security.md` のopt-in手順、警告表示、control token方針を確認してください。
- APIキー、秘密鍵、トークンを曲パッケージ、docs、プロンプト、ログに置かないでください。
- manifest内の曲素材パスは、既定でその曲パッケージ配下だけを読みます。
- fixture playerのoriginを個別起動で変える場合は、song-pack serverの `SONG_PACK_CORS_ORIGINS` も明示してください。
- `npm run dev` や `start-music-effect.cmd` で起動する場合は、Launch Managerがplayer portに合わせたCORS許可originをsong-pack serverへ渡します。
- 曲パックやshow-profileで外部入力、LAN操作、TouchDesigner/OSC/MIDIなどを使う場合は、任意の `capabilities` とREADMEまたは `security-notes.md` に責任範囲を短く残すことを推奨します。
- 詳細は `docs/security.md` を参照してください。

## Workflow Map

主要な流れは `docs/workflows.html` で確認できます。

```text
http://127.0.0.1:<player-port>/docs/workflows.html
```

表示内容は `docs/workflows.json` から読み込まれます。このJSONは、機能追加やバグ修正時にLLMへシステムの流れを説明するための共有資料としても使えます。

## Preview Snapshot

指定した曲と時刻をヘッドレスブラウザで開き、スクリーンショット、console、Canvasの簡易状態を `.codex/runtime/preview-snapshots/` へ保存できます。

```powershell
npm run preview:snapshot -- --song shining-star --time 48
```

任意のplayer queryを足したい場合は `--query` を使います。例えばVisual Sequencer panelの表示確認は次のようにできます。

```powershell
npm run preview:snapshot -- --song shining-star --time 10 --query visualSequencer=1
```

既存のfixture player / song-pack serverが起動していればそれを使います。起動していない場合は一時的にローカルサーバーを起動し、このコマンド自身が起動したものだけ停止します。外部依存は追加せず、ローカルChromeまたはEdgeのDevTools Protocolを使います。

曲パック提出前の機械的なsmoke checkには次を使えます。

```powershell
npm run song:smoke -- --id song-id
npm run song:smoke:all -- --dry-run
```

`song:smoke:all` は複数曲をまとめて確認する入口です。最初は `--dry-run` や `--ids monitoring,igaku` で対象を絞ってください。この確認は、ページ起動、manifest読み込み、adapter例外、fatalなconsole error、表示可能canvas、明らかな空画面だけを見ます。曲の解釈、構図、色、演出の良さは判定しません。

## Agent Context

Codexや別エージェントに作業を渡すときは、まず `AGENTS.md` を読ませます。

新しく作業を始めるスレッドには、次も読ませてください。

```text
docs/thread-start.md
```

ここに、作業開始時の `git status` / `sync:brief` / `sync:check` / `sync:inbox`、ready通知の扱い、note/ack連絡、mergeしてよい変更と止めるべき変更の判断基準を書いています。

新しい曲を作る場合は、既存曲の中身を読ませず、次だけを入口にしてください。

```text
AGENTS.md
docs/system-overview.md
docs/song-authoring.md
docs/song-visual-independence.md
docs/decisions.md
```

システム改修や既存機能の修正では、必要に応じて次も読みます。

```text
docs/architecture.md
docs/module-map.md
docs/handoff.md
docs/workflows.json
```

作業後は `docs/handoff.md` と、必要に応じて該当する正本docsや `docs/workflows.json` を更新してください。古い作業候補や既知問題は `docs/archive/working-notes/` に退避してあり、通常の入口にはしません。
