# Sync Onboarding Quickstart

新しい担当、または久しぶりに戻った担当が、最初に確認する短い導線です。詳しい運用は `thread-start.md` と `worktree-sync.md` を読んでください。

## まず確認する

```powershell
npm run sync:roster
npm run sync:onboard -- --for <担当ラベル>
```

例:

```powershell
npm run sync:onboard -- --for system
npm run sync:onboard -- --for igaku-effect
npm run sync:onboard -- --for traffic-jam-redo
```

`sync:roster` は、担当名、branch、worktree、宛先ラベルの対応を表示します。正本は `config/sync-participants.json`、人間向けの説明は `docs/team-roster.md` です。

`sync:onboard` は次を表示します。

- 現在の worktree、branch、HEAD、未コミット変更の有無
- この担当として扱われる recipient labels
- 最初に読む docs
- 未対応の question / blocker
- 未取り込みの ready
- 最近の info / done

## 作業開始時

`sync:onboard` のあと、必要に応じて次を確認します。

```powershell
npm run sync:check
npm run sync:inbox -- --open
git status --short --branch
```

`ready` は自動で取り込む命令ではありません。取り込む前に、差分範囲、曲固有素材の混入、古い system docs への巻き戻し、他曲削除がないか確認します。

## 新しい曲担当

新しい曲を作る場合は、まず次だけを読みます。

- `docs/system-overview.md`
- `docs/song-authoring.md`
- `docs/song-visual-independence.md`
- `templates/neutral-song-app/visual-brief.md`

読まないもの:

- `song-packs/*`
- 既存曲の manifest / analysis / design / adapter / 演出コード
- fixture renderer や既存 effect

中央検証用に `song-preview-lab` や `system-main` に既存曲が入っていても、それらは次の曲のテンプレートではありません。

## ready を出す前

最低限、次を確認します。

```powershell
npm run song:validate -- --id <song-id>
npm run build
npm run sync:brief -- --for <担当ラベル>
```

可能なら preview snapshot やブラウザ console も確認します。

ready メッセージには次を含めます。

- branch
- commit
- song id
- preview URL
- 実行した確認コマンド
- console warn/error
- 追加 asset / dependency
- 音源、歌詞全文、記事本文、画像、秘密情報を含めていないこと
- knowledge-candidate の有無

## 共通ノウハウ候補

作業中に共通化できそうな知見を見つけたら、完了後まで待たずに `system` 宛へ送ります。

```powershell
npm run sync:note -- --from <担当ラベル> --to system --level question --topic knowledge-candidate -m "candidate: ... scope: ... source: ... risk: ... suggested home: ..."
```

system 担当は `common` / `conditional` / `song-owned` / `reject` に分類します。曲固有の構図、色、数値、モチーフ、比喩、歌詞由来表現は、共通ルールへ昇格させません。

## 共通ノウハウを自分の映像へ戻す

system 担当から `--topic visual-authoring-feedback` の note が来た場合は、自分の曲パックだけを見て、反映するか、反映しないか、system 支援が必要かを返します。

```powershell
npm run sync:note -- --from <担当ラベル> --to system --level info --topic visual-authoring-feedback -m "song: <song-id>; apply: ...; no-apply: ...; song-owned: ...; need-system-help: ...; checks: ..."
```

詳しくは `docs/visual-authoring-feedback.md` を読んでください。

## 取り込み担当

複数曲を中央へ取り込む場合は、branch 全体の merge にこだわらず、必要な曲パックだけの手動取り込みや cherry-pick を使います。

特に注意するもの:

- 他の `song-packs/*` を削除する差分
- `docs/song-authoring.md` や `docs/knowledge-review.md` を古い内容へ戻す差分
- fixture registry への曲固有 direct import
- 音源、歌詞全文、記事本文、画像、base64、大容量 asset、秘密情報

取り込み後は、対象曲の `song:validate` と `npm run build` を通し、処理結果を `sync:note` で担当へ返します。
