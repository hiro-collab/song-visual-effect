# Module Map

このファイルは、リポジトリ内の主要ディレクトリとファイルの役割を説明します。

## ルート

- `AGENTS.md`: Codex/エージェント向けの常時指示。詳細は `docs/` へ誘導する。
- `README.md`: 人間向けの起動方法、素材配置、利用方法。
- `index.html`: fixture playerのDOM骨格。Canvas、Audio、歌詞表示、操作UIを置く。
- `package.json`: npm scriptsと依存関係。
- `vite.config.mjs`: Vite設定。曲データは別サーバーで配信するため、ViteのpublicDirは無効化している。

## system/kit

曲に依存しない補助ライブラリです。曲名、曲専用cue、描画方式を固定しません。

- `system/kit/types.ts`: MusicMap、SongManifest、歌詞、beat、markersなどの型定義。
- `system/kit/index.ts`: 曲アプリが参照しやすい公開API入口。必要なhelperだけをここから選んでimportできる。
- `system/kit/assets.ts`: manifestと曲パッケージを読み、fixture playerや曲アプリで使う `MusicMap` に変換する。既存曲へ暗黙フォールバックしない。
- `system/kit/safeFetch.ts`: manifestや曲素材を安全に読むためのURL検証、パッケージ境界チェック、サイズ上限つきfetch。
- `system/kit/songAdapterContext.ts`: 曲アプリへ渡せる補助context。manifest、base URL、曲パッケージ内asset readerを持つ。
- `system/kit/songApp.ts`: fixture playerと簡易adapterの最小インターフェース。
- `system/kit/visualHost.ts`: 曲adapter向けの中立的な表示レイヤ作成、DPR/resize、safe area計算。
- `system/kit/contentRect.ts`: Canvas2Dを選んだ曲adapter向けのcontent rect解決、DPR resize、clip、pointer正規化、文字fit補助。
- `system/kit/transport.ts`: 再生、停止、シーク、現在時刻を扱う。
- `system/kit/frameLoop.ts`: `requestAnimationFrame` によるフレーム更新。
- `system/kit/timing.ts`: beat、chorus、lyricsなどの時刻検索。
- `system/kit/manualTiming.ts`: 手動歌詞キーフレーム、全体/範囲補正、Export用JSON生成。
- `system/kit/damping.ts`: `DampValue`、`clamp`、`smoothstep`、`decayPulse` などの数値制御。
- `system/kit/palette.ts`: paletteから色rampを作る。fixture rendererでも使うが、曲固有の標準ではない。

## examples/fixture-player

system kitを使った動作確認用アプリです。新しい曲のテンプレートではありません。

- `examples/fixture-player/main.ts`: fixture playerの入口。DOM取得、起動、入力登録、transport、fixture adapter、optional toolを接続する。
- `examples/fixture-player/README.md`: fixture playerが標準テンプレートではないことを明示する注意書き。
- `examples/fixture-player/styles.css`: fixture playerの見た目。Canvas上の歌詞、操作バー、Lyric Timingパネル、シーケンスバーなど。
- `examples/fixture-player/dom.ts`: fixture playerのDOM要素を取得する。
- `examples/fixture-player/adapters/registry.ts`: fixture player内で使う中立的な `builtin:` adapter registry。曲固有adapterを直接importせず、必要な場合は `song-packs/local-adapters.ts` へ委譲する。
- `examples/fixture-player/adapters/fixtureSoftLight.ts`: 既存soft light rendererをfixture adapterとして包む。
- `examples/fixture-player/renderers/softLightRenderer.ts`: fixture用の柔らかい光表現。新しい曲のテンプレートではない。
- `examples/fixture-player/effects/particles.ts`: fixture renderer用の背景粒子。
- `examples/fixture-player/effects/lightNetwork.ts`: fixture renderer用の動点と光線ネットワーク。
- `examples/fixture-player/tools/lyricTimingTool.ts`: fixture playerに載せている歌詞タイミング編集UI。system kitの必須UIではない。

## song-packs

分離構成用の曲パッケージ置き場です。ここを曲データの本体にします。

重要:

- 既存の曲パッケージはテンプレートではない。
- 新しい曲を作るときは、既存の `song-packs/*` を読まない。
- 曲ごとの構成、JSON文法、UI、演出コード、描画方式は自由に変えてよい。
- fixture playerで読む場合は、入口としてmanifest URLを渡す。
- `song-packs/*/audio/`: ローカル音源配置用。音源ファイルはコミットしない。
- `song-packs/<song-id>/adapter.ts`: 曲固有のWeb adapterを同一ビルドで試す場合の置き場所。
- `song-packs/local-adapters.ts`: ローカル開発用に `song:<song-id>` を曲側adapterへ対応づける橋。`song:` IDだけを扱い、`builtin:` やURL/path形式は扱わない。曲ID直書きの登録はfixture playerやsystem kitではなくここに置く。

## scripts

- `scripts/download-songle-json.ps1`: Songle Widget APIからJSONを取得するPowerShellスクリプト。許可URL、保存先、取得対象、最大サイズを検証し、取得後に曲長、拍数、BPM、サビ候補を要約する。
- `scripts/create-song-pack.mjs`: 既存曲を読まずに中立的な曲パック雛形を作る補助スクリプト。
- `scripts/validate-song-pack.mjs`: 曲パックの参照メモがURLメタデータだけになっているかなどを確認する補助スクリプト。
- `scripts/serve-song-packs.mjs`: `song-packs` をCORSつきで配信する静的サーバー。
- `scripts/dev-manager.mjs`: 互換入口。内部では `scripts/launch-manager/server.mjs` を起動する。
- `scripts/launch-manager/config.mjs`: `launch/targets.json` の読み込み、環境変数テンプレート展開、target/set検証。
- `scripts/launch-manager/server.mjs`: Launch ManagerのHTTP API、origin検証、CSPつきHTML応答。
- `scripts/launch-manager/ui.mjs`: Launch Manager管理画面のHTML、CSS、ブラウザ側JS。
- `scripts/launch-manager/supervisor.mjs`: managed targetの起動、停止、再起動、状態管理。
- `scripts/launch-manager/ports.mjs`: 起動前のport衝突確認。
- `scripts/launch-manager/logs.mjs`: stdout/stderr保存とログ末尾取得。
- `scripts/launch-manager/metrics.mjs`: PIDごとのCPU/memory簡易取得。
- `scripts/worktree-sync.mjs`: 並行worktree間でready/check/merge通知、brief/ack、note/inbox連絡を扱うローカル同期補助。

## launch

- `launch/targets.json`: Launch Managerが扱うTarget/Set定義。GUIから任意コマンドは入力させず、このローカルファイルに書かれたmanaged targetだけを起動する。

## templates

- `templates/neutral-song-app/`: 新曲が既存fixture rendererに引っ張られないための空に近い出発点。
- `templates/neutral-song-app/visual-brief.md`: 実装前に曲の主役構造、避ける表現、入力/出力を固定するシート。
- `templates/neutral-song-app/adapter.ts`: Canvas2D adapterとして始める場合だけ使う空の描画ループ。視覚デザインのテンプレートではない。

## docs

- `docs/README.md`: docs内の正本、作業メモ、可視化資料の読み分け。
- `docs/thread-start.md`: 新しいCodexスレッドの開始手順。最初に実行する確認、読むファイル、ready通知への対応、merge判断をまとめる。
- `docs/system-overview.md`: 特定曲に依存しないシステム概要。
- `docs/song-authoring.md`: 新しい曲を作るときのアンカー回避ルール。
- `docs/song-visual-independence.md`: 既存fixtureの見た目に引っ張られないためのチェックリスト。
- `docs/architecture.md`: 全体構成と処理の流れ。
- `docs/module-map.md`: このファイル。ディレクトリとファイルの役割。
- `docs/decisions.md`: 設計判断と理由。
- `docs/launch-manager-spec.md`: 複数の曲用映像や補助サーバーを起動、停止、監視する簡素版Launch Manager仕様。
- `docs/launch-manager-spec.html`: Launch Manager仕様をレビューしやすくした単一HTMLページ。
- `docs/security.md`: ローカル開発サーバー、manifest、曲素材、Songle取得ツールの信頼境界と対策。
- `docs/plans.md`: 今後の作業候補。
- `docs/known-issues.md`: 既知の問題と注意点。
- `docs/handoff.md`: 次のCodexスレッドへ渡す要約。
- `docs/workflows.json`: LLM共有用のフロー定義。
- `docs/workflows.html`: `workflows.json` を可視化する単一HTMLページ。
- `docs/worktree-guide.md`: local worktree構成の使い方。
- `docs/worktree-sync.md`: 並行worktree間のready/check/merge運用と、commit不要のbrief/ack/note/inbox連絡。

## .codex

- `.codex/shared_note.md`: 作業中に共有してきた設計メモ。
- `.codex/log.md`: 実装履歴のログ。

`docs/` が今後の正式な引き継ぎ先で、`.codex/` は作業メモとして扱います。
