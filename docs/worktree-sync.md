# Worktree Sync

Encoding note: This file is UTF-8. In Windows PowerShell 5.1, use `Get-Content -Encoding UTF8 docs\worktree-sync.md` if Japanese text looks garbled. 日常運用では `sync:roster` / `sync:onboard` / `sync:brief` の出力を優先してください。

複数の Codex スレッド / 担当が別々の worktree で作業するための連絡板です。

ready 通知は「この commit は取り込み候補です」という合図であり、自動 merge 命令ではありません。note 通知は質問、ブロッカー、方針共有、作業報告に使います。

## 担当を確認する

まず担当名簿を確認します。

```powershell
npm run sync:roster
```

正本は `config/sync-participants.json` です。人間向けの説明は `docs/team-roster.md` です。

Launch Managerを起動している場合は、管理画面の「担当メッセージ」欄でも同じ通知板を閲覧できます。GUIは読み取り専用です。note、ack、ready、mergeなどの書き込み操作はこの文書のCLI手順を使います。

曲担当から出る共通ノウハウ候補は、通常のnoteとして共有します。ただし、system側の正本docsへ入れる前に `docs/knowledge-review.md` で審議します。

## 使い方

### 0. 初回確認をまとめて見る

新しく作業を始める担当は、まず `sync:onboard` を使います。
作業開始時は、自分の担当ラベルで onboarding します。

```powershell
npm run sync:onboard -- --for <担当ラベル>
```

例:

```powershell
npm run sync:onboard -- --for system
npm run sync:onboard -- --for igaku-effect
```

## 状況を見る

要対応だけを短く見る:

```powershell
npm run sync:brief -- --for <担当ラベル>
```

ready 全体を見る:

```powershell
npm run sync:check
```

自分宛の note を見る:

```powershell
npm run sync:inbox -- --for <担当ラベル>
npm run sync:inbox -- --for <担当ラベル> --open
```

全 note を見る:

```powershell
npm run sync:inbox -- --all
```

## 連絡する

commit を伴わない短い連絡は `sync:note` を使います。

```powershell
npm run sync:note -- --from <自分の担当ラベル> --to <相手の担当ラベル> --level <info|question|blocker|done> --topic <topic> -m "短い連絡"
```

例:

```powershell
npm run sync:note -- --from system --to igaku-effect --level question --topic visual-authoring-feedback -m "docs/visual-authoring-feedback.md を見て、自分の曲だけ確認してください"
```

`--to` には、担当名簿の `label`、`branch`、または `aliases` を使えます。迷ったら `label` を使います。

## ready を出す

取り込んでよい commit ができたら、その worktree で ready を出します。

```powershell
npm run sync:ready -- -m "何がreadyか、確認したこと、asset/dependency、注意点"
```

ready 前に最低限確認するもの:

```powershell
npm run sync:brief -- --for <担当ラベル>
npm run build
```

曲担当は加えて:

```powershell
npm run song:validate -- --id <song-id>
```

ready は「作業中の状態を見てください」ではなく、「他worktreeへ取り込んでよい、ひとまとまりのcommit」を知らせるものです。曲担当は、曲固有の変更を自分の `song-packs/<song-id>/` に閉じた状態でreadyにし、systemや他曲の未整理変更を混ぜないでください。

## ack する

対応済み、確認済み、または自分の担当では対応不要の項目は ack します。

```powershell
npm run sync:ack -- --id <event-id> --from <自分の担当ラベル>
```

ack は自分の brief/check から隠すための記録です。他担当の表示から同じ項目を消すものではありません。

## merge する

ready を取り込む前に、差分範囲を見ます。古い branch の全体 merge で system docs や他曲を巻き戻しそうな場合は、cherry-pick または手動取り込みを使います。

```powershell
npm run sync:merge -- --from <branch>
npm run sync:merge -- --from <branch> --allow-merge-commit
```

古い worktree を最新の system 基盤へ追いつかせる場合も、まず clean 状態を確認します。

```powershell
git status --short --branch
npm run sync:brief -- --for <担当ラベル>
```

`sync:merge -- --from <branch>` は、その branch の生の最新HEADではなく、最後に `sync:ready` で通知された commit を取り込みます。生HEADを取り込む `--tip` は、system 担当が明示した場合だけ使います。

`sync:brief` が `merge commit may be needed` と案内したときは、差分範囲を確認し、問題がない場合だけ `--allow-merge-commit` を付けます。`sync:merge` が存在しない、または失敗して理由が判断できないときは、raw `git merge` を使わず `system` 担当へ相談します。

曲担当の worktree が `main` を branch-wide merge するのは、自分の作業枝を最新の共通基盤へ更新するためです。system 側が曲枝を取り込むときは別判断です。古い曲枝の branch-wide merge が他曲削除や docs 巻き戻しを含む場合、system 側では曲所有ファイルだけの cherry-pick / 手動取り込みを優先します。

曲担当は、他曲の ready を自分の worktree へ直接取り込まなくてよいです。他曲 ready は中央の `system` / `song-preview-lab` が扱います。security / support ready も、原則は system 側で統合された後に `main` 経由で取り込みます。直接取り込む必要がある場合は、system または該当担当から明示します。

中央統合の分担:

- `system-main` は、system kit、Launch Manager、security、同期ツール、正本docsを統合します。
- `song-preview-lab` は、複数曲のプレビューをまとめて動作確認するために、採用済みの曲パックを統合します。
- 各曲worktreeは、自分の曲のreadyを出し、他曲readyを横取りmergeしません。
- ある曲だけで例外的に他担当の支援機能を試したい場合は、system担当へ `sync:note` で相談します。system担当が、必要な範囲のcherry-pick、preview-lab取り込み、一時ブランチなどを仲介します。

注意:

- `traffic-jam-effect` は不採用の古い実装です。明示指示なしに merge しません。
- `live-beat-sync-prototype` は参考実装です。明示指示なしに直 merge しません。
- 曲固有の manifest / analysis / design / adapter / asset は `song-packs/<song-id>/` に置きます。
- 曲固有の見た目を system docs へ昇格させる前に、`docs/knowledge-review.md` で分類します。

## 共通ノウハウ候補

曲担当は、作業中にも共通化できそうな知見を共有します。

```powershell
npm run sync:note -- --from <担当ラベル> --to system --level question --topic knowledge-candidate -m "candidate: ... scope: ... source: ... risk: ... suggested home: ..."
```

system 担当は `common` / `conditional` / `song-owned` / `reject` に分類してから、必要なものだけ正本 docs へ反映します。

## visual-authoring-feedback

system から `visual-authoring-feedback` が来た場合、曲担当は自分の曲だけを確認して返します。

```powershell
npm run sync:note -- --from <担当ラベル> --to system --level info --topic visual-authoring-feedback -m "song: <song-id>; apply: ...; no-apply: ...; song-owned: ...; need-system-help: ...; checks: ..."
```

他曲の見た目、構図、色、比喩、演出名はテンプレートにしません。

## Launch Manager GUI

Launch Manager の「担当メッセージ」欄でも同じ通知板を読めます。GUI は読み取り専用です。note / ack / ready / merge はこの CLI で行います。
