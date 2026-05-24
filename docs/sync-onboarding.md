# Sync Onboarding Quickstart

Encoding note: This file is UTF-8. In Windows PowerShell 5.1, use `Get-Content -Encoding UTF8 docs\sync-onboarding.md` if Japanese text looks garbled. 通常は文書を直接読むより、下記の `sync:roster` / `sync:onboard` の出力を優先してください。

新しい担当、または久しぶりに戻った担当が、最初に確認する短い導線です。詳しい運用は `thread-start.md` と `worktree-sync.md` を読んでください。

## 古い worktree を最新化する

古い worktree では、まだ `sync:roster` や新しい `sync:onboard` が存在しないことがあります。その場合も、いきなり raw `git merge` は使わず、まず worktree が clean か確認します。

```powershell
git status --short --branch
```

clean でなければ、先に自分の未コミット変更を commit / stash / 相談のいずれかで整理します。

clean なら、既に使える場合は次を実行します。

```powershell
npm run sync:brief -- --for <担当ラベル>
```

`sync:brief` が表示する取り込みコマンドを正本として使います。`sync:merge -- --from <branch>` は、その branch の生の最新HEADではなく、最後に `sync:ready` で通知された commit を取り込みます。生HEADを取り込む `--tip` は、system 担当が明示した場合だけ使います。

分岐済み worktree で `merge commit may be needed` と表示された場合は、差分範囲を確認し、問題なければ `--allow-merge-commit` 付きのコマンドを使ってよいです。

```powershell
npm run sync:merge -- --from codex/system-kit-refactor --allow-merge-commit
```

`sync:merge` 自体が存在しない、または失敗して判断できない場合は、raw `git merge` へ進まず `system` 担当へ連絡してください。

曲担当が `codex/system-kit-refactor` を branch-wide merge するのは、自分の作業枝を最新の共通基盤へ追いつかせるためです。逆向きに、古い曲枝を system 側へ丸ごと merge する意味ではありません。曲実装を system へ取り込むときは、古い docs や他曲削除を混ぜないよう、曲所有ファイルだけの cherry-pick / 手動取り込みを優先します。

曲担当は、他曲の ready を自分の worktree へ直接取り込まなくてよいです。他曲 ready は中央の `system` / `song-preview-lab` が扱います。security / support ready も、原則は system 側で統合された後に `codex/system-kit-refactor` 経由で取り込みます。例外的に直接取り込む必要がある場合は、system または該当担当から明示されます。

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

`ready` は自動で取り込む命令ではありません。取り込む前に、差分範囲、曲固有素材の混入、古い system docs への巻き戻し、他曲削除がないか確認します。曲担当が見るべき中心は、自分宛の question / blocker と、system から案内された共通基盤更新です。

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
