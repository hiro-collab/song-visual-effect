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

`sync:brief` が `merge commit may be needed` と案内したときは、差分範囲を確認し、問題がない場合だけ `--allow-merge-commit` を付けます。`sync:merge` が存在しない、または失敗して理由が判断できないときは、raw `git merge` を使わず `system` 担当へ相談します。

曲担当の worktree が `codex/system-kit-refactor` を branch-wide merge するのは、自分の作業枝を最新の共通基盤へ更新するためです。system 側が曲枝を取り込むときは別判断です。古い曲枝の branch-wide merge が他曲削除や docs 巻き戻しを含む場合、system 側では曲所有ファイルだけの cherry-pick / 手動取り込みを優先します。

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
