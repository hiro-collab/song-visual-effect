# Documentation Map

このディレクトリは、システムの正本、作業メモ、可視化資料が混ざりやすい場所です。
迷ったときは、このファイルを入口にして「何を読むべきか」を決めてください。

## 正本として読むもの

- `sync-onboarding.md`: 新しい担当や久しぶりに戻った担当が最初に使う短い導線。
- `team-roster.md`: 担当名、branch、worktree、宛先ラベルの対応表。
- `project-scope.md`: song-pack、system kit、show-profile、互換性方針の境界。
- `system-overview.md`: 曲に依存しないシステムの考え方。
- `song-authoring.md`: 新しい曲を作るときの手順と注意。
- `song-visual-independence.md`: 既存曲やfixtureの見た目に引っ張られないための確認表。
- `architecture.md`: system kit、fixture、song-pack server、Launch Managerの関係。
- `module-map.md`: ディレクトリと主要ファイルの役割。
- `decisions.md`: 設計判断と理由。
- `security.md`: ローカル開発サーバー、manifest、Songle取得、Launch Managerの信頼境界。
- `knowledge-review.md`: 各曲担当から届く共通ノウハウ候補を審議し、共通化するものと曲側に戻すものを分けるルール。
- `visual-authoring-feedback.md`: 共有ノウハウを各曲映像へ戻し、反映可否やsystem支援要望を集める運用。
- `preview-lab.md`: 複数曲を中央検証用worktreeでまとめて確認する運用。

## 新しい曲を作るとき

まず読むもの:

- `system-overview.md`
- `project-scope.md`
- `song-authoring.md`
- `song-visual-independence.md`
- `decisions.md`

読まないもの:

- `song-packs/*`
- `examples/fixtures/soft-light-player/renderers/*`
- `examples/fixtures/soft-light-player/effects/*`
- 既存曲のmanifest、analysis、design、adapter、演出コード

既存曲やfixtureは実例であって、次の曲の標準構成ではありません。

## システム改修をするとき

必要に応じて読むもの:

- `architecture.md`
- `module-map.md`
- `launch-manager-spec.md`
- `sync-onboarding.md`
- `worktree-sync.md`
- `thread-start.md`
- `worktree-guide.md`
- `preview-lab.md`
- `workflows.json`

`workflows.html` は人間が構成を眺めるための表示です。LLMへ渡す場合は、できるだけ `workflows.json` を使ってください。

## 作業メモとして扱うもの

- `handoff.md`: 次スレッドへの現状要約。新しい曲作成の入口にはしない。
- `archive/working-notes/`: 過去の作業候補、既知問題、詳細メモ。決定済み仕様として読まない。

作業メモに書かれた内容と正本が食い違う場合は、正本を優先してください。恒久仕様へ昇格する場合だけ、該当する正本へ要点を移します。

## 更新ルール

- 新しい恒久ルールは `decisions.md` または該当する正本へ書く。
- 一時的な引き継ぎは `handoff.md` へ書く。
- 曲固有の設計メモ、再実装ブリーフ、演出方針は `song-packs/<song-id>/` 配下へ置く。
- UIや処理フローを変えたら `workflows.json` も更新する。
- Launch Managerの起動、停止、管理範囲を変えたら `launch-manager-spec.md`、`architecture.md`、`thread-start.md` を確認する。
- 新しい曲の作成ルールを変えたら `song-authoring.md` と `song-visual-independence.md` を確認する。
- 曲担当のノウハウを共通化する場合は、先に `knowledge-review.md` で分類してから正本へ反映する。
- 共有ノウハウを各曲映像へ反映できるか確認する場合は、`visual-authoring-feedback.md` のtopicと返答フォーマットを使う。
