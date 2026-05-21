# Documentation Map

このディレクトリは、システムの正本、作業メモ、可視化資料が混ざりやすい場所です。
迷ったときは、このファイルを入口にして「何を読むべきか」を決めてください。

## 正本として読むもの

- `system-overview.md`: 曲に依存しないシステムの考え方。
- `song-authoring.md`: 新しい曲を作るときの手順と注意。
- `song-visual-independence.md`: 既存曲やfixtureの見た目に引っ張られないための確認表。
- `architecture.md`: system kit、fixture player、song-pack server、Launch Managerの関係。
- `module-map.md`: ディレクトリと主要ファイルの役割。
- `decisions.md`: 設計判断と理由。
- `security.md`: ローカル開発サーバー、manifest、Songle取得、Launch Managerの信頼境界。

## 新しい曲を作るとき

まず読むもの:

- `system-overview.md`
- `song-authoring.md`
- `song-visual-independence.md`
- `decisions.md`

読まないもの:

- `song-packs/*`
- `examples/fixture-player/renderers/*`
- `examples/fixture-player/effects/*`
- 既存曲のmanifest、analysis、design、adapter、演出コード

既存曲やfixtureは実例であって、次の曲の標準構成ではありません。

## システム改修をするとき

必要に応じて読むもの:

- `architecture.md`
- `module-map.md`
- `launch-manager-spec.md`
- `worktree-sync.md`
- `thread-start.md`
- `workflows.json`

`workflows.html` は人間が構成を眺めるための表示です。LLMへ渡す場合は、できるだけ `workflows.json` を使ってください。

## 作業メモとして扱うもの

- `handoff.md`: 次スレッドへの現状要約。新しい曲作成の入口にはしない。
- `plans.md`: 今後の作業候補。決定済み仕様とは限らない。
- `known-issues.md`: 既知の問題と注意点。方針変更後も古い問題が残ることがある。
- `traffic-jam-redo-brief.md`: 特定曲の再実装方針。新曲の一般テンプレートではない。

作業メモに書かれた内容と正本が食い違う場合は、まず正本を優先し、必要なら作業メモ側を更新してください。

## 更新ルール

- 新しい恒久ルールは `decisions.md` または該当する正本へ書く。
- 一時的な引き継ぎは `handoff.md` へ書く。
- UIや処理フローを変えたら `workflows.json` も更新する。
- Launch Managerの起動、停止、管理範囲を変えたら `launch-manager-spec.md`、`architecture.md`、`thread-start.md` を確認する。
- 新しい曲の作成ルールを変えたら `song-authoring.md` と `song-visual-independence.md` を確認する。
