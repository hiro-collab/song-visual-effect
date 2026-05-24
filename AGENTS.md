# AGENTS.md

このリポジトリで作業するCodex/エージェント向けの入口です。詳細をここに詰め込みすぎず、必要な設計情報は `docs/` を読んでください。どの文書を正本として読むか迷った場合は、まず `docs/README.md` を確認してください。

## 作業の基本方針

- まず関連ファイルを調査し、既存の設計意図を確認する。
- 変更が複数ファイルに及ぶ場合は、短い計画を立ててから実装する。
- 実装は小さいステップに分け、既存挙動を壊さない。
- 新しい作業や新しい曲の作業を始めるときは、現在の統合基準である `codex/system-kit-refactor` を土台にする。現時点の代表worktreeは `_worktrees/system-main`。
- プロジェクトルート直下のworktreeが常に最新基準とは限らない。作業開始時に `git status --short --branch` と `git worktree list` で自分のbranchを確認する。
- 並行 worktree 作業では、作業開始時と区切りごとに `npm run sync:brief` を確認する。必要なら詳細として `npm run sync:check` と `npm run sync:inbox` も見る。
- 他担当への質問、ブロッカー、短い共有事項は `npm run sync:note -- --from <自分の担当> --to <相手> --level <info|question|blocker|done> -m "短い連絡"` で共有する。
- 対応済み、または自分の担当では対応不要と判断した連絡は `npm run sync:ack -- --id <id> --from <自分の担当>` で確認済みにする。
- 他スレッドに取り込ませてよいコミットができたら `npm run sync:ready -- -m "短い説明"` を実行する。
- 新しいスレッドで作業を始める場合は、`docs/thread-start.md` を読んで作業開始、ready確認、merge判断の流れを揃える。
- Launch Managerの停止操作は、そのLaunch Manager自身が起動したmanaged targetだけを対象にする。PC全体の同名プロセスや他worktreeのtargetを探して止めない。
- 不明点は断定せず、「推測」と明記する。
- 音源ファイルを解析しない。AI学習に使わない。
- 歌詞ファイルはUTF-8として扱い、日本語を壊さない。
- 実装後は `npm run build` など、可能な確認を行う。

## 読むファイルの分岐

作業の種類によって読むファイルを分ける。新しい曲を作る場合は、既存曲やfixtureの情報に触れないことを優先する。

### 新しい曲を作る場合

まず、作業branchが `codex/system-kit-refactor` の最新readyを取り込んだ状態から分岐していることを確認する。既存曲のworktree、古い実験branch、プロジェクトルート直下のbranchを基準にしない。

まず次だけを読む。

- `docs/README.md`: docs内の正本と作業メモの読み分け。
- `docs/system-overview.md`: 特定曲に依存しないシステム概要。
- `docs/song-authoring.md`: 新しい曲を作るときのアンカー回避ルール。
- `docs/song-visual-independence.md`: 既存fixtureの見た目に引っ張られないためのチェックリスト。
- `docs/decisions.md`: 重要な設計判断。

読まないもの:

- `song-packs/*`
- 既存曲のmanifest、analysis、design、adapter、演出コード
- `examples/fixtures/soft-light-player/renderers/*`
- `examples/fixtures/soft-light-player/effects/*`
- `examples/fixtures/soft-light-player/adapters/fixtureSoftLight.ts`
- `README.md` のfixture節
- `docs/handoff.md` のfixture確認URL

必要になった場合でも、ユーザーの明示許可なしに既存曲や既存fixture rendererを参考にしない。

### システム改修や既存機能修正の場合

必要に応じて次を読む。

- `README.md`: 起動方法と利用方法。
- `docs/README.md`: docs内の正本、作業メモ、可視化資料の読み分け。
- `docs/thread-start.md`: 新しいスレッドの開始手順とready通知への対応。
- `docs/handoff.md`: 現在状態と次にやるべきこと。
- `docs/architecture.md`: 全体構成と処理の流れ。
- `docs/module-map.md`: ディレクトリと主要ファイルの役割。
- `docs/workflows.json`: LLM共有用のフロー定義。
- `docs/worktree-sync.md`: 並行 worktree 間の ready/check/merge 運用。

## 設計上の重要原則

- Webシステムは曲アプリを束縛する親ではなく、補助ランタイムとして扱う。
- 曲ごとの素材、タイミング、演出意図、クレジット、演出コードは曲パッケージ側に置く。
- 別システムや別ランタイムで使える余地を残す。
- システム側は再生、入力、フレームループ、保存、タイミング編集などの能力を提供する。
- 曲固有の演出判断は、将来的に曲側のadapterへ移す。
- 描画方式をCanvas2Dに固定しない。
- 歌詞タイミング編集はoptional toolとして扱う。
- 既存曲は実例であって、新しい曲のテンプレートではない。

## Launch Managerの並行作業ルール

- `全停止` は「このLaunch ServerがPIDを持って管理している子プロセス」だけに効く。
- 別worktreeのLaunch Manager、別スレッドが別portで起動したtarget、手動起動した外部プロセスは停止対象にしない。
- 複数スレッドが同じLaunch Manager URLを開いている場合は、同じLaunch Serverを共同操作している。誰かの停止操作は、そのLaunch Serverのmanaged targetに効く。
- 並行作業では `DEV_MANAGER_PORT`、`PLAYER_PORT`、`SONG_PACK_PORT` をworktreeごとに分ける。
- 停止操作や実装変更の前に、GUI下部の `config` / `runtime` とtargetのportを見て、自分のworktreeを操作していることを確認する。

## 新しい曲を作るときのルール

- 新しい曲の構成を考えるときは、既存の `song-packs/*` を読まない。
- 既存曲のmanifest、analysis、design、adapter、演出コードをコピー元にしない。
- まず `docs/system-overview.md` と `docs/song-authoring.md` だけで設計を始める。
- 既存曲を参考にする必要がある場合は、ユーザーの明示許可を得てから読む。
- 既存曲を読むことが許されるのは、その曲自体の修正、回帰確認、またはユーザーが明示した比較作業だけ。
- 曲ごとのJSON文法、UI、描画方式、ライブ操作、adapter構成は曲側が自由に決める。
- 既存fixture rendererの中央発光、放射線、光ネットワーク、粒子、グローを新曲のテンプレートにしない。
- 曲アプリを作る場合は、まず `templates/neutral-song-app/visual-brief.md` で主役構造を決め、必要なら空の `templates/neutral-song-app/adapter.ts` から始める。
- 最初のプレビュー後に `docs/song-visual-independence.md` の観点で、前作と似すぎていないか確認する。

## 変更時の注意

- 音源ファイルはコミットしない。`.gitignore` の除外を維持する。
- `music_src/` は廃止済み。`song-packs/` を曲データ本体として扱う。
- `docs/handoff.md` と必要に応じて正本側のdocsを更新する。古い作業メモは `docs/archive/working-notes/` に置き、新しい恒久仕様の置き場にしない。
- UIやフローを変えた場合は `docs/workflows.json` も更新する。
- 恒久的な仕様変更は作業メモだけに置かず、`docs/README.md` で案内される正本側へ反映する。
