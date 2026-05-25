# Handoff

このファイルは、システム改修や既存機能修正を引き継ぐためのメモです。

新しい曲を作る場合は、このファイルを入口にしないでください。既存fixtureの情報に触れて設計が引っ張られる可能性があります。docsの読み分けは `docs/README.md`、新しい曲作成では `docs/system-overview.md` と `docs/song-authoring.md` を入口にしてください。

例外的な引き継ぎ:

- 煮ル果実「トラフィック・ジャム」の映像エフェクトは、`codex/traffic-jam-effect` の `81876a7 Add traffic jam visual adapter` を採用しません。
- 別スレッドで作り直す場合は `song-packs/traffic-jam/design/reimplementation-brief.md` を読んでください。
- `sync:check` に `codex/traffic-jam-effect 81876a7` が表示されても取り込まないでください。
- `codex/live-beat-sync-prototype` は旧 `src/` 構成を含むため、Launch Manager入りの現行構成へ直接mergeしないでください。必要な変更だけ現行構成へ移植してください。

## 現在の状態

このリポジトリは、曲ごとに自由なインタラクティブ音楽エフェクトを作るための system kit と fixture player です。

現在できること:

- Vite + TypeScriptでfixture player appを起動する。
- 起動管理サーバーで fixture player と song-pack server をまとめて起動、停止、再起動する。
- `?song=<manifest-url>` で曲パッケージを指定して読み込む。
- manifest、歌詞、解析JSON、手動タイミングなどを `MusicMap` に変換する。
- `examples/fixtures/soft-light-player` の柔らかい光表現fixture rendererを動かす。
- Lyric Timing optional toolで、A/Dキーによる歌詞切り替え時刻の手動打刻ができる。
- 全体/途中からのタイミング補正と、シーケンスバー上のストーン可視化がある。
- シーケンスバーをクリック/ドラッグして再生位置を移動できる。
- `docs/workflows.html` / `docs/workflows.json` にワークフロー地図がある。
- `song-packs/` に曲ごとのパッケージがある。曲固有の設計メモや再実装ブリーフは各曲パック側のREADMEやdesign配下を見る。
- 曲アプリ向けに `system/kit/song-app/songAdapterContext.ts` を追加し、raw manifest、base URL、`readJson()`、`readText()`、`readDesignCues()` を渡せるようにした。system kitは `design.cues` の中身を固定解釈しない。
- fixture player内のregistryは中立的な `builtin:` adapterだけを直接持つ。ローカル開発用の曲固有 `song:` adapter登録は `song-packs/local-adapters.ts` 側へ置く。`song-packs/local-adapters.ts` は `song:` IDだけを扱い、外部adapter URL/pathの解決は無効。
- 歌詞なし曲は `manifest.lyrics` と `analysis.timing` がnull/未指定なら lyric-free として扱い、`rough lyrics` warningを出さない。歌詞テキストがあるがtimingがない場合だけ `rough lyrics` を出す。
- 曲adapter向けに `services.safeArea` と `services.visualHost` を追加した。fixture UIと重なりにくいcontent rect、追加Canvas/DOMレイヤ、DPR/resize、cleanupを曲側が任意で使える。
- `npm run song:scaffold` で、既存曲を読まずに中立的な曲パック雛形を作れる。
- `npm run song:validate` で、曲パックの `references.json` がURLと参照用途だけを持ち、歌詞本文、記事本文、画像データ、base64、HTML断片を含まないことを確認できる。
- `docs/song-authoring.md` にSongle URLのcanonical選定、短縮URL回避、複数登録の比較、melody JSONをピッチ線と決めつけないための注意を追加した。
- `npm run preview:snapshot` で、指定した曲manifestと時刻をヘッドレスブラウザで開き、スクリーンショット、console、Canvas簡易状態を `.codex/runtime/preview-snapshots/` へ保存できる。
- メイン相当の統合基準worktreeを `_worktrees/system-main` として明示した。branchは `codex/system-kit-refactor`。新しい曲や機能worktreeはここを土台にする。
- 各曲担当から届く共通ノウハウ候補は、`docs/knowledge-review.md` で `common` / `conditional` / `song-owned` / `reject` に分類してから正本docsへ反映する。曲固有のモチーフ、構図、色、数値、カメラ、演出名はsystem側へ昇格しない。
- 曲担当は作業中にもノウハウ候補を共有し、最終報告前に未共有候補を棚卸しする。候補がある場合は `knowledge-candidate`、ない場合は `knowledge-candidate: none` を明記する。
- Canvas2Dを選んだ曲adapter向けに `system/kit/render/contentRect.ts` を追加した。DPR resize、safe area clip、pointer正規化、文字fitを任意で使える補助で、曲の見た目は決めない。
- 各曲担当から出たライブラリ/ツール候補は `docs/library-candidates.md` に集約する。system標準依存を増やす前に、曲側任意依存、小さいhelper、time-drivenな再現性、bundle/securityを確認する。
- セキュリティレビューを反映し、manifest素材パスのパッケージ境界チェック、サイズ上限つきfetch、song-pack serverのCORS制限、dev managerのoriginチェックとログ表示無害化を追加した。
- 複数の曲用映像や補助サーバーを扱う簡素版Launch Manager MVPを実装した。`npm run dev` は `scripts/dev-manager.mjs` 互換入口から `scripts/launch-manager/server.mjs` を起動し、`launch/targets.json` のTarget/SetをGUI/APIで管理する。
- Launch Managerは `song-packs/*/manifest.json` を曲JSONメニューとして列挙し、Deck A/Bごとに曲を選んで必要なtargetを起動し、そのDeck URLを開く/コピーできる。
- Launch Manager GUIはDeck A/B曲選択を主導線にし、手動Set操作は詳細操作へ折りたたむ。全停止は誤操作防止のため二度押し確認にする。
- Launch Manager GUIは、Launch Manager、Deck A/B、各target、選択中の曲JSONを二次元ノードグラフとして見せる状態マップを持つ。起動中ノードと関連線は光り、サーバーが増えたときも連携関係を把握しやすくする。
- Windowsでは `start-music-effect.cmd` をダブルクリックするとLaunch Managerを起動できる。同じworktreeで既に起動中なら管理画面を開くだけで、別worktreeが起動中でも誤接続せず、このworktree用の空きポートを自動で使う。
- Launch Managerの停止操作は、そのLaunch Manager自身が起動したmanaged targetだけに効く。並行worktreeでは自動ポート割当を使い、GUI下部の `worktree` / `ports` / `config` / `runtime` とtarget portを確認してから操作する。
- ライブ/VJ運用の標準再生単位として、Launch ManagerにDeck A/Bを追加した。Deck A/Bは別player portで起動し、共有Song Data Serverから曲パッケージを読む。曲変更MVPはDeckごとのURL更新/open/copyに留め、既存Deck画面へload-song命令は送らない。
- 追加セキュリティレビューで、Launch Manager管理画面にCSP/frame拒否/権限拒否ヘッダーを付け、target command/args/envの検証を強化し、`.codex/runtime/` の生成ログをGit対象外にした。
- 追加セキュリティレビューで、Launch ManagerのLAN公開を `LAUNCH_MANAGER_ALLOW_LAN=1` の明示opt-inにし、LAN公開時の警告バナーとcontrol token検証を追加した。曲パック/show-profileの任意 `capabilities` と `security-notes.md` 方針は `docs/security.md` を正本にする。
- docsの読み分けを `docs/README.md` に集約し、`examples/fixtures/soft-light-player/README.md` でfixture playerが標準テンプレートではないことを明示した。
- 古い作業候補、既知問題、beat sync詳細、旧レビューHTMLは `docs/archive/working-notes/` に退避した。通常の作業入口では正本docsを優先する。
- `system/kit` は `core/`、`timing/`、`render/`、`song-app/` に分けた。曲アプリは基本的に `system/kit/index.ts` の公開APIから必要なhelperだけをimportする。
- soft light fixtureは `examples/fixtures/soft-light-player/` に移動した。新曲の見た目を作るときは読まない。
- Launch ManagerのHTTP API本体と管理画面HTMLを分け、`scripts/launch-manager/server.mjs` と `scripts/launch-manager/ui.mjs` に整理した。
- 並行worktree間の連絡整理として、`npm run sync:brief` / `sync:ack` / `sync:note` / `sync:inbox` を使う。`sync:brief` は要対応のquestion/blockerと未merge readyの要約、`sync:ack` は自分のworktreeで確認済みにする記録、`sync:ready` はmerge可能commit、`sync:note` は質問やブロッカー共有として使い分ける。
- Launch Manager GUIに担当メッセージ閲覧を追加した。`/api/sync-events` がGit共通ディレクトリの `codex-sync/events.jsonl` を読み、ready/note/ackを要対応、担当、種別で絞り込んで表示する。GUIは読み取り専用で、note/ack/mergeは既存の `sync:*` CLIで行う。
- Lyric Timing Editorは別repo `https://github.com/hiro-collab/lyric-timing-editor` へ分離した。Music Effect側は完成済みtiming JSONを読む境界だけを残す。詳細は `docs/lyric-timing-editor.md`。

## 新しいスレッドの開始手順

新規スレッドは、最初に `docs/thread-start.md` を読んでください。

最初に実行する確認:

```powershell
git status --short --branch
npm run sync:brief
npm run sync:check
npm run sync:inbox
```

ready通知は「必ずmerge」ではなく「取り込み候補」です。note通知はcommit不要の連絡です。system kitに曲固有adapterや既存fixtureの見た目を入れる変更は、そのまま取り込まないでください。

重要:

- 既存の曲パッケージはテンプレートではない。
- 新しい曲を作るときは、既存の `song-packs/*` を読まない。
- 新しい曲作成の入口は `docs/system-overview.md` と `docs/song-authoring.md`。
- 新しい曲の視覚実装は `docs/song-visual-independence.md` と `templates/neutral-song-app/` から始め、`examples/fixtures/soft-light-player/renderers/*` や `examples/fixtures/soft-light-player/effects/*` をテンプレートにしない。
- 既存曲を見るのは、その曲自体の修正、回帰確認、またはユーザーの明示許可がある場合だけ。
- docsの正本と作業メモの読み分けは `docs/README.md` を優先する。

## 重要な制約

- 音源ファイルをAI学習に使わない。
- 音源波形をCodexやアプリで解析しない。
- 音源はブラウザで再生するだけにする。
- 歌詞txtはUTF-8として扱い、日本語を壊さない。
- 曲ごとの演出をシステム側に固定しすぎない。
- 音源ファイルはコミットしない。
- 描画方式をCanvas2Dに固定しない。
- 歌詞タイミング編集はoptional toolとして扱う。
- 外部Web adapter URL/pathは共通フレームワークでは自動実行しない。外部URLは参照メモとして扱う。
- ローカル開発サーバーは既定で外部ネットワークへ公開しない。Launch ManagerをLAN公開する場合は明示opt-in、警告表示、control token方針を守る。
- 秘密情報を曲パッケージ、docs、ログ、プロンプトへ置かない。

## 起動方法

通常起動:

```text
start-music-effect.cmd をダブルクリック
```

手動起動:

```powershell
npm install
npm run dev
```

`npm run dev` はLaunch Managerを立てます。管理画面でDeck A/Bごとに曲JSONを選び、`起動して開く` を押すと、対象Deckの再生画面と曲データサーバーが起動し、選択曲のDeck URLを開きます。詳細操作として `標準再生セット` や `Deck A/B 再生セット` を手動起動することもできます。
管理画面の状態マップでは、Launch Manager、Deck A/B、各サーバー、選択中の曲JSONのつながりをノードグラフとして確認できます。
担当メッセージ欄では、各worktree担当からのready通知、質問、ブロッカー、ackをブラウザで確認できます。

実際のportはworktreeごとに自動割当され、GUI下部と `.codex/runtime/ports.json` に表示されます。

player appは曲manifestを明示して開きます。Deck A/Bは同じplayer appを別portで起動します。

```text
http://127.0.0.1:<deck-port>/?song=http://127.0.0.1:<song-pack-port>/<song-id>/manifest.json
```

動作確認用fixture:

```text
http://127.0.0.1:<deck-port>/?song=http://127.0.0.1:<song-pack-port>/shining-star/manifest.json
```

このfixtureは新しい曲のテンプレートではありません。

並行worktreeで固定ポートを明示したい場合:

```powershell
$env:DEV_MANAGER_PORT=5182
$env:DECK_A_PLAYER_PORT=5183
$env:DECK_B_PLAYER_PORT=5185
$env:SONG_PACK_PORT=5184
npm run dev
```

ワークフロー地図:

```text
http://127.0.0.1:<player-port>/docs/workflows.html
```

## 主要ファイル

- `AGENTS.md`: エージェント向け入口。
- `README.md`: 利用方法。
- `docs/thread-start.md`: 新しいスレッドの開始手順、ready確認、merge判断。
- `docs/system-overview.md`: 特定曲に依存しないシステム概要。
- `docs/song-authoring.md`: 新しい曲作成時のアンカー回避ルール。
- `docs/song-visual-independence.md`: 既存fixtureの見た目に引っ張られないためのチェックリスト。
- `system/kit/`: 曲に依存しない補助ライブラリ。
- `system/kit/index.ts`: system kitの公開API入口。
- `system/kit/core/safeFetch.ts`: URL検証、曲パッケージ境界チェック、サイズ上限つきfetch。
- `system/kit/core/assets.ts`: manifestと曲データの読み込み。
- `system/kit/song-app/songAdapterContext.ts`: 曲アプリ向けasset reader。
- `system/kit/render/contentRect.ts`: Canvas2D向けのcontent rect、DPR、clip、pointer、text fit補助。
- `examples/fixtures/soft-light-player/main.ts`: 動作確認用fixture playerの入口。
- `examples/fixtures/soft-light-player/adapters/`: fixture player内adapter registry。曲固有adapterを直接importしない。
- `song-packs/local-adapters.ts`: ローカル開発用の曲固有adapter登録。
- `examples/fixtures/soft-light-player/tools/lyricTimingTool.ts`: fixture playerに載せたoptional lyric timing UI。
- Lyric Timing Editor本体は `https://github.com/hiro-collab/lyric-timing-editor` 側を正本にする。
- `templates/neutral-song-app/`: 新曲向けの空scaffoldとvisual brief。
- `docs/security.md`: 信頼境界と運用ルール。
- `docs/launch-manager-spec.md`: 次に実装する簡素版Launch Manager仕様。
- `docs/deck-playback.md`: Deck A/Bを使うライブ/VJ再生仕様。
- `docs/library-candidates.md`: ライブラリ、ツール、エンジン候補と採用前チェック。
- `docs/knowledge-review.md`: 曲担当からの共通ノウハウ候補を審議し、共通化するものと曲側へ戻すものを分けるルール。
- `docs/workflows.json`: LLM共有用のフロー定義。

## 次にやるとよいこと

優先度が高い順:

1. fixture playerが新しい曲のテンプレートに見えないよう、docsとUI文言を維持する。
2. 新曲実装担当が `templates/neutral-song-app/visual-brief.md` を先に埋める運用を定着させる。
3. Deck A/B UIを実機で使いながら、現場向けの文言、ログ表示、状態マップの読みやすさを調整する。
4. 保存APIを検討し、ライブ中に調整したタイミングを安全に曲パッケージへ保存できるようにする。

Launch Managerを変更する場合:

- まず `docs/launch-manager-spec.md` と `docs/deck-playback.md` を読む。
- 最初はmanaged targetだけを扱う。
- Deck A/Bを追加する場合、Deck停止とSong Data Server停止を分ける。クロスフェード、音声ミックス、program/previewの最終切替はMusic Effect標準の責務にしない。
- 複数Launch Server調停、attached/delegated、自動port再割当、本格的なLAN運用、スマホ専用UIはMVPに含めない。Launch ManagerのLAN公開は明示opt-inと警告表示つきの補助に留める。
- GUIから任意コマンドを入力させない。起動可能なものはローカルの `launch/targets.json` に書かれたTargetだけ。
- 停止対象はLaunch Serverが起動してPIDを持つtargetだけ。PC全体の同名プロセスや他worktreeのtargetを停止対象にしない。
- `scripts/dev-manager.mjs` は互換入口。実装本体は `scripts/launch-manager/`。

## 曲固有メモの置き場所

曲ごとの設計メモや再実装ブリーフは、system-wide docsではなく各曲パック配下に置きます。

`traffic-jam` の内容は `song-packs/traffic-jam/README.md` と `song-packs/traffic-jam/design/reimplementation-brief.md` を見てください。Traffic Jam固有の曲アプリを作る場合は、system kitとは分けて曲側の自由な構成として始めます。

## 文脈管理の意図

会話の中だけに設計意図を溜めるのではなく、リポジトリ内にCodex用の認識地図を置きます。

新しい曲作成時は、認識地図が既存曲に汚染されないように、system-neutral docsだけを入口にしてください。既存曲の中身を見る必要が出た場合は、理由と許可を明確にします。
