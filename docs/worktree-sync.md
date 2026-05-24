# Worktree Sync Notices

並行している Codex スレッド同士で、取り込み可能な区切りを共有するためのローカル通知板です。

## 何を解決するか

複数 worktree で作業していると、ある担当が小さな改善を終えても、他の担当がそれに気づかないまま古い前提で作業し続けることがあります。

このリポジトリでは、各担当が「このコミットは今取り込んでよい」と判断した時点で `ready` 通知を出します。他の担当は `brief` / `check` で確認し、必要なものだけ `merge` します。ready通知は取り込み候補であり、自動的に取り込む命令ではありません。

commitを伴わない質問、ブロッカー、短い方針共有は `note` 通知として出します。他の担当は `brief` / `inbox` で確認します。note通知はmerge対象ではありません。対応済みや担当外と判断した項目は `ack` で自分のbriefから隠せます。

通知は Git の共通ディレクトリ内に保存されるため、ブランチには混ざらず、すべての local worktree から同じ通知板を読めます。

Launch Managerを起動している場合は、管理画面の「担当メッセージ」欄でも同じ通知板を閲覧できます。GUIは読み取り専用です。note、ack、ready、mergeなどの書き込み操作はこの文書のCLI手順を使います。

曲担当から出る共通ノウハウ候補は、通常のnoteとして共有します。ただし、system側の正本docsへ入れる前に `docs/knowledge-review.md` で審議します。

## 使い方

### 1. 共有できる区切りを出す

作業をコミットし、ビルドや最低限の確認が終わったら、その worktree で実行します。

```powershell
npm run sync:ready -- -m "download script validation is ready"
```

この通知は現在の `HEAD` コミットを指します。未コミット変更がある場合は通知できません。

### 2. 他の担当の更新を見る

まず、要対応だけをまとめて確認します。

```powershell
npm run sync:brief
```

`brief` は次をまとめて表示します。

- 自分宛て、または全員宛ての未対応 `question` / `blocker`。
- 未merge、かつ自分のworktreeで未ackの `ready`。
- 最近の `info` / `done`。

担当名の自動判定が合わない場合は `--for` で明示できます。

```powershell
npm run sync:brief -- --for system
```

詳細なready通知だけを見る場合は、従来どおり `check` を使います。

各 worktree で、作業開始時や実装の区切りごとに実行します。

```powershell
npm run sync:check
```

まだ自分のブランチに取り込まれておらず、自分のworktreeで `ack` していない `ready` 通知が表示されます。

ack済みのreadyも含めて確認したい場合:

```powershell
npm run sync:check -- --all
```

### 2.5 他の担当からの連絡を見る

自分宛て、または全員宛ての `note` 通知を確認します。

```powershell
npm run sync:inbox
npm run sync:inbox -- --open
```

すべての連絡を見たい場合:

```powershell
npm run sync:inbox -- --all
```

### 2.6 他の担当へ連絡する

commit不要の短い連絡は `sync:note` を使います。未コミット変更があっても送れます。

```powershell
npm run sync:note -- --from system --to traffic-jam-redo --level question --topic "adapter境界" -m "fixture registryへの曲ID直importを避けられるか確認してください"
```

`--from` には送信者の担当名を入れます。省略した場合は現在branch名が送信者として記録されます。

`--to` には `all`、branch名、またはbranch末尾の短い名前を使えます。

```powershell
npm run sync:note -- --from system --to all --level info -m "system-kit-refactorに共通方針を取り込みました"
npm run sync:note -- --from security --to mesmerizer-signal-lock --level blocker -m "three依存を共通方針commitに混ぜないでください"
```

`--level` は `info`、`question`、`blocker`、`done` のいずれかです。

共通ノウハウ候補を送る場合:

```powershell
npm run sync:note -- --from song-example --to system --level question --topic knowledge-candidate -m "candidate: 区間ごとの画面構成を先に決める。scope: any song. source: song-example. risk: 固定数値や特定構図は含めない。suggested home: docs/song-authoring.md"
```

system担当は、候補を `common` / `conditional` / `song-owned` / `reject` に分け、共通化してよいものだけを正本docsへ入れます。

### 2.7 対応済みにする

`brief` や `inbox` に表示される `#id` を使って、対応済みまたは自分の担当では対応不要と判断した項目を確認済みにできます。

```powershell
npm run sync:ack -- --id abc123def0 --from system -m "確認済み。system側の追加対応なし。"
```

`ack` は現在のworktree / 担当のbriefとcheckから隠すための記録です。他担当のbrief/checkから同じ項目を消すものではありません。ack済みreadyも見直したい場合は `sync:check -- --all` を使います。

### 3. 取り込む

表示されたブランチを取り込む場合は、現在の worktree で実行します。

```powershell
npm run sync:merge -- --from codex/download-security
```

このコマンドは、そのブランチの最新 `ready` 通知が指すコミットだけを取り込みます。ブランチの先端に未通知の追加コミットがあっても、勝手には取り込みません。

履歴が分岐していて merge commit が必要な場合は、明示的に許可します。

```powershell
npm run sync:merge -- --from codex/download-security --allow-merge-commit
```

衝突した場合は通常の Git merge と同じ状態で止まります。その場合は衝突を解消するか、必要なら作業担当に確認してください。

## 作業中に見る

長めの作業では、別端末で次を動かすと定期確認できます。

```powershell
npm run sync:watch -- --interval 20
```

`watch` は `sync:brief` の内容を定期表示します。ただし Codex スレッドでは、長時間の watch よりも作業の節目で `npm run sync:brief` を実行する運用の方が扱いやすいです。

## 運用ルール

- `ready` は「他ブランチに取り込まれてもよい」と判断したコミットにだけ出します。
- `note` は質問、ブロッカー、方針共有、確認依頼に使います。noteを受け取っても自動mergeしません。
- `ack` は対応済み、確認済み、または自分の担当では対応不要という記録に使います。
- `ready` 前には、可能なら `npm run build` など最低限の確認をします。
- 各スレッドは作業開始時、実装途中の区切り、最終報告前に `sync:brief` を見ます。必要に応じて `sync:check` と `sync:inbox` も見ます。
- 新しいスレッドは `docs/thread-start.md` を読み、担当範囲とmerge判断の基準を確認します。
- `sync:merge` は未コミット変更がある worktree では実行できません。
- 大きな衝突が出たら無理に解消せず、担当範囲を確認します。
- Launch Managerの停止範囲や並行port運用を変えた場合は、`docs/thread-start.md` と `AGENTS.md` を更新し、`sync:ready` で他スレッドに通知します。
- 曲固有adapter、曲固有renderer、既存fixtureの見た目をsystem kitへ入れる変更は、ready通知があってもそのままmergeしません。
- `sync:check` に `codex/traffic-jam-effect 81876a7` が表示されても、その実装は破棄予定です。取り込まず、`song-packs/traffic-jam/design/reimplementation-brief.md` を参照してください。
