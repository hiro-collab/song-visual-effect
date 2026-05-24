# Sync Onboarding Quickstart

新しい担当や久しぶりに戻った担当が、最初に確認する短い導線です。
詳しい運用は `thread-start.md` と `worktree-sync.md` を読んでください。

## まず実行する

```powershell
npm run sync:onboard -- --for <担当ラベル>
```

例:

```powershell
npm run sync:onboard -- --for system
npm run sync:onboard -- --for traffic-jam-redo
npm run sync:onboard -- --for igaku-effect
```

表示されるもの:

- 現在のworktree、branch、HEAD、未コミット変更の有無。
- この担当宛として扱われるrecipient label。
- 最初に読むdocs。
- 未対応のquestion/blocker。
- 未取り込みのready。
- 最近のinfo/done。

## 作業開始時

`sync:onboard` のあと、必要に応じて次を確認します。

```powershell
npm run sync:check
npm run sync:inbox -- --open
git status --short --branch
```

`ready` は自動で取り込む命令ではありません。取り込む前に、差分の範囲、曲固有の混入、古いsystem docsの巻き戻し、他曲削除がないか確認します。

## 新しい曲担当

新しい曲を作る場合は、まず次だけを読んでください。

- `docs/system-overview.md`
- `docs/song-authoring.md`
- `docs/song-visual-independence.md`
- `templates/neutral-song-app/visual-brief.md`

読まないもの:

- `song-packs/*`
- 既存曲のmanifest、analysis、design、adapter、演出コード
- fixture rendererや既存effect

中央検証用に `song-preview-lab` や `system-main` に既存曲が入っていても、それらは次の曲のテンプレートではありません。

## readyを出す前

最低限、次を確認します。

```powershell
npm run song:validate -- --id <song-id>
npm run build
npm run sync:brief
```

可能ならpreviewやsnapshotも確認します。

readyメッセージには次を含めます。

- branch
- commit
- song id
- preview URL
- 実行した確認コマンド
- console warn/error
- 追加asset/dependency
- 音源、歌詞全文、画像、記事本文、秘密情報を含めていないこと
- knowledge-candidateの有無

## 共有ノウハウ

曲制作中に共通化できそうな知見を見つけたら、完成後まで待たずに `system` 宛へ送ります。

```powershell
npm run sync:note -- --from <担当> --to system --level question --topic knowledge-candidate -m "candidate: ... scope: ... source: ... risk: ... suggested home: ..."
```

system担当が `common` / `conditional` / `song-owned` / `reject` に分類します。
曲固有の構図、色、値、モチーフ、台詞、歌詞由来表現は、共通ルールへ昇格させないでください。

## 共有ノウハウを自分の映像へ戻す

system担当から `--topic visual-authoring-feedback` のnoteが来た場合は、自分の曲パックだけを見て、反映するか、反映しないか、system支援が必要かを返します。

```powershell
npm run sync:note -- --from <担当> --to system --level info --topic visual-authoring-feedback -m "song: <song-id>; apply: ...; no-apply: ...; need-system-help: ...; checks: ..."
```

詳しくは `docs/visual-authoring-feedback.md` を読んでください。

## 取り込み担当

複数曲を中央へ取り込む場合は、ブランチ全体のmergeにこだわらず、必要なら曲パックだけの手動取り込みにします。

特に注意するもの:

- 他の `song-packs/*` を削除する差分。
- `docs/song-authoring.md` や `docs/knowledge-review.md` を古い内容へ戻す差分。
- `examples/fixtures/*/adapters/registry.ts` への曲固有direct import。
- 音源、歌詞全文、画像、記事本文、base64、大容量asset、秘密情報。

取り込み後は、対象曲の `song:validate` と `npm run build` を通し、処理結果を `sync:note` で担当へ返します。
