# Thread Start Workflow

この文書は、新しく作業を始めるCodexスレッドが最初に読む作業導線です。

目的は、長い会話履歴がなくても、現在の設計方針、並行worktreeの同期方法、merge依頼への対応を同じ前提で始められるようにすることです。

## 最初にやること

新しいスレッドは、まず次を確認します。

```powershell
git status --short --branch
npm run sync:brief
npm run sync:check
npm run sync:inbox
```

確認すること:

- 自分がどのworktreeとbranchにいるか。
- そのbranchが、現在の統合基準 `codex/system-kit-refactor` の最新readyを土台にしているか。
- 未コミット変更があるか。
- 他スレッドからready通知が来ているか。
- 他スレッドから質問、ブロッカー、短い連絡が来ているか。
- そのready通知が、今回の担当範囲に関係するか。

現時点では、`codex/system-kit-refactor` がメイン相当の統合基準です。代表worktreeは `_worktrees/adapter-cues` です。プロジェクトルート直下のworktreeは別branchである場合があるため、新しい曲作業の基準にしないでください。

新しい曲や曲固有エフェクトを始める場合は、既存曲worktreeではなく、`codex/system-kit-refactor` の最新readyを取り込んだ新しいworktree/branchから始めます。既存曲の `song-packs/*` は参考元にしません。

ready通知は「必ず取り込むもの」ではなく、「取り込み候補」です。設計方針に合うか確認してからmergeします。
note通知は「連絡」です。merge可能なcommitを示すものではないため、必要なら返答や相談だけ行います。
`sync:brief` は、自分宛ての未対応question/blocker、未merge ready、最近のinfo/doneをまとめて表示します。

## 次に読むファイル

共通入口:

- `AGENTS.md`
- `docs/thread-start.md`
- `docs/handoff.md`
- `docs/worktree-sync.md`

システム改修の場合:

- `docs/system-overview.md`
- `docs/architecture.md`
- `docs/module-map.md`
- `docs/decisions.md`
- `docs/archive/working-notes/` は過去メモです。正本に必要な情報がない場合だけ確認します。

新しい曲や曲固有エフェクトを作る場合:

- `docs/system-overview.md`
- `docs/song-authoring.md`
- `docs/song-visual-independence.md`
- `templates/neutral-song-app/visual-brief.md`

新しい曲作成では、既存の `song-packs/*`、`examples/fixtures/soft-light-player/renderers/*`、`examples/fixtures/soft-light-player/effects/*` を読まないでください。既存曲やfixture rendererに引っ張られないためです。

## 担当範囲を分類する

作業前に、自分の担当を次のどれかに分類します。

- system kit: `system/kit/*` の補助機能。
- fixture: `examples/fixtures/soft-light-player/*` の動作確認用アプリ。
- song package / song app: 曲ごとの素材、cue、演出コード。
- launch / dev server: 起動管理、ポート、停止、CORS。
- docs / workflow: `docs/*`、`AGENTS.md`、`workflows.json`。

重要:

- system kitに曲固有の見た目や曲専用adapterを入れない。
- fixture playerは回帰確認用であり、新曲の標準UIや標準rendererではない。
- 曲固有のcue文法、主役構造、演出判断は曲側が持つ。
- 曲固有adapterを同一ビルドで試す場合も、直接 `examples/fixtures/soft-light-player/adapters/registry.ts` へ曲IDを追加せず、`song-packs/local-adapters.ts` に登録する。

## Launch Managerの停止範囲

並行worktreeで作業しているとき、Launch Managerの停止操作は必ず範囲を確認します。

基本ルール:

- `全停止` は、そのLaunch Manager自身が起動したmanaged targetだけを止める。
- PC全体から同名プロセスを探して止めない。
- 他worktreeのLaunch Managerや、別portで起動しているtargetを止めない。
- 同じLaunch Manager URLを複数スレッドで見ている場合は、同じLaunch Serverを共同操作している。誰かの停止操作は、そのLaunch Serverのmanaged targetに効く。

並行作業では、worktreeごとにportを分けます。

```powershell
$env:DEV_MANAGER_PORT=5182
$env:PLAYER_PORT=5183
$env:SONG_PACK_PORT=5184
npm run dev
```

停止操作や起動管理の修正をする前に、Launch Manager画面下部の `config` / `runtime` と各targetのportを見て、自分のworktreeを操作していることを確認してください。

## ready通知への対応

`npm run sync:check` で通知が出たら、次の順に判断します。

1. 通知元branchとmessageを読む。
2. 自分の担当範囲に関係するか判断する。
3. system kit方針に合うか判断する。
4. 必要なら差分や関連docsを確認する。
5. 取り込む場合だけ `sync:merge` を実行する。

例:

```powershell
npm run sync:merge -- --from codex/download-security
```

merge commitが必要な場合:

```powershell
npm run sync:merge -- --from codex/download-security --allow-merge-commit
```

取り込まない例:

- 曲固有adapterをsystem kitやfixture registryへ直接追加する変更。
- rejected / redo と明示されている曲実装。
- 既存fixture rendererを新曲テンプレート扱いする変更。
- 自分の未コミット変更と大きく衝突し、担当範囲の確認が必要な変更。

## note通知への対応

`npm run sync:inbox` で自分宛ての連絡を確認します。

例:

```powershell
npm run sync:brief
npm run sync:inbox
npm run sync:inbox -- --open
npm run sync:inbox -- --all
```

返答や共有が必要な場合は `sync:note` を使います。未コミット変更がある状態でも送れます。

```powershell
npm run sync:note -- --from system --to traffic-jam-redo --level question --topic "adapter境界" -m "registry直importを避けられるか確認してください"
```

使い分け:

- `sync:note`: 質問、ブロッカー、方針共有、確認依頼。commit不要。
- `sync:ready`: 他worktreeに取り込ませてよいcommitの通知。cleanなworktreeが必要。
- `sync:merge`: ready通知が指すcommitを取り込む操作。

`--from` を省略すると現在branch名が送信者として表示されます。担当名を明示したい場合は `system`、`beat-sync`、`security`、`mesmerizer` のように短い名前を入れてください。

対応済み、または自分の担当では対応不要と判断した連絡は `sync:ack` で確認済みにします。`sync:brief` には各項目の `#id` が表示されます。

```powershell
npm run sync:ack -- --id abc123def0 --from system -m "確認済み。system側の追加対応なし。"
```

`sync:ack` は現在のworktreeに対する確認済み記録です。他担当のbriefから勝手に消えるものではありません。

## merge後にやること

mergeしたら、最低限これを実行します。

```powershell
npm run build
node -e "JSON.parse(require('node:fs').readFileSync('docs/workflows.json','utf8')); console.log('workflows.json ok')"
```

必要に応じて、Dev Managerやfixture playerをブラウザで確認します。

確認後、変更ができたらcommitします。ほかのスレッドに取り込ませてよい区切りならready通知を出します。

```powershell
npm run sync:ready -- -m "short message"
```

## 作業中の更新

設計や運用に影響する変更をした場合は、次を更新します。

- `docs/handoff.md`
- `docs/archive/working-notes/` は必要時だけ参照する。
- `docs/workflows.json`
- 必要なら `.codex/shared_note.md` と `.codex/log.md`

新しい曲の作成ルールや視覚独立性に関わる変更なら、次も更新します。

- `docs/song-authoring.md`
- `docs/song-visual-independence.md`
- `templates/neutral-song-app/*`

## 終了前チェック

スレッドの最後には、可能な範囲で次を確認します。

```powershell
git status --short --branch
npm run build
npm run sync:brief
npm run sync:check
npm run sync:inbox
```

未コミット変更を残す場合は、理由と次にやることを `docs/handoff.md` または `.codex/log.md` に残します。
