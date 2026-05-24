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

- `system/kit/index.ts`: 曲アプリが参照しやすい公開API入口。必要なhelperだけをここから選んでimportできる。
- `system/kit/core/`: 型、manifest読み込み、安全なfetch、Transport、frame loop、Visual Sequencerなど、描画方式に依存しない土台。
- `system/kit/timing/`: beat、chorus、lyricsの時刻検索、beat state helper、手動歌詞タイミングのデータ処理。
- `system/kit/render/`: 表示レイヤ、content rect、DPR/clip/pointer/text fit、damping、palette、optional Three services型など、任意で使える描画補助。
- `system/kit/song-app/`: fixtureや曲adapterをつなぐ最小インターフェースと、曲パッケージ内asset reader。

`system/kit` の中身を直接深掘りする前に、まず `system/kit/index.ts` の公開APIから必要なものだけ選んでください。

## examples/fixtures/soft-light-player

system kitを使った動作確認用アプリです。新しい曲のテンプレートではありません。

- `examples/fixtures/soft-light-player/main.ts`: fixtureの入口。DOM取得、起動、入力登録、transport、fixture adapter、optional toolを接続する。
- `examples/fixtures/soft-light-player/README.md`: fixtureが標準テンプレートではないことを明示する注意書き。
- `examples/fixtures/soft-light-player/adapters/registry.ts`: fixture内で使う `builtin:` adapter registry。曲固有adapterを直接importせず、必要な場合は `song-packs/local-adapters.ts` へ委譲する。
- `examples/fixtures/soft-light-player/renderers/` と `effects/`: soft light確認用の見た目。新しい曲のテンプレートとして読まない。
- `examples/fixtures/soft-light-player/tools/`: lyric timing、beat state、visual sequencer panelなど、fixtureに載せているoptional tool。system kitの必須UIではない。

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
- `scripts/preview-snapshot.mjs`: 指定曲と指定時刻をヘッドレスブラウザで開き、スクリーンショット、console、Canvas簡易状態を `.codex/runtime/preview-snapshots/` に保存する。`--query visualSequencer=1` のようにoptional tool用のplayer queryも追加できる。
- `scripts/smoke-song-pack.mjs`: `song:validate` と `preview:snapshot` を組み合わせ、ページ起動、manifest読み込み、adapter例外、fatal console error、表示可能canvas、明らかな空画面だけを確認する。
- `scripts/smoke-all-song-packs.mjs`: 複数の曲パックへ `song:smoke` を順に実行する中央確認用の入口。対象は `--ids`、`--exclude`、`--max` で絞れる。
- `scripts/dev-manager.mjs`: 互換入口。内部では `scripts/launch-manager/server.mjs` を起動する。
- `scripts/launch-manager/config.mjs`: `launch/targets.json` の読み込み、環境変数テンプレート展開、target/set検証、Launch ManagerのLAN公開opt-in判定。
- `scripts/launch-manager/auto-ports.mjs`: worktreeごとのLaunch Manager/player/song-pack port自動割当と `.codex/runtime/ports.json` 記録。
- `scripts/launch-manager/server.mjs`: Launch ManagerのHTTP API、origin検証、LAN公開時control token検証、CSPつきHTML応答。`/api/status` と `/api/sync-events` を返す。
- `scripts/launch-manager/ui.mjs`: Launch Manager管理画面のHTML、CSS、ブラウザ側JS。曲選択、LAN公開警告、状態マップ、target操作、担当メッセージ閲覧を持つ。
- `scripts/launch-manager/sync-events.mjs`: Git共通ディレクトリの `codex-sync/events.jsonl` を読み、ready/note/ackをLaunch Manager GUI向けに整形する読み取り専用helper。
- `scripts/launch-manager/supervisor.mjs`: managed targetの起動、停止、再起動、状態管理。
- `scripts/launch-manager/ports.mjs`: port空き確認、衝突確認、候補探索。
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
- `docs/deck-playback.md`: ライブ/VJ運用でDeck A/Bを使う再生仕様。Deckごとのplayer server、output URL、外部ツールとの責務分担を定義する。
- `docs/archive/working-notes/launch-manager-spec.html`: 旧レビュー用HTML。現在は `workflows.html` と `launch-manager-spec.md` を優先する。
- `docs/security.md`: ローカル開発サーバー、manifest、曲素材、Songle取得ツールの信頼境界と対策。
- `docs/library-candidates.md`: 各曲担当から出たライブラリ、ツール、エンジン候補と採用前チェック。
- `docs/knowledge-review.md`: 各曲担当から出た共通ノウハウ候補を、共通/条件つき/曲固有/不採用へ振り分ける審議ルール。
- `docs/handoff.md`: 次のCodexスレッドへ渡す要約。
- `docs/archive/working-notes/`: 過去の作業候補、既知問題、詳細メモ。通常は読まない。
- `docs/workflows.json`: LLM共有用のフロー定義。
- `docs/workflows.html`: `workflows.json` を可視化する単一HTMLページ。
- `docs/worktree-guide.md`: local worktree構成の使い方。
- `docs/worktree-sync.md`: 並行worktree間のready/check/merge運用と、commit不要のbrief/ack/note/inbox連絡。

## .codex

- `.codex/shared_note.md`: 作業中に共有してきた設計メモ。
- `.codex/log.md`: 実装履歴のログ。

`docs/` が今後の正式な引き継ぎ先で、`.codex/` は作業メモとして扱います。
