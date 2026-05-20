# Handoff

このファイルは、システム改修や既存機能修正を引き継ぐためのメモです。

新しい曲を作る場合は、このファイルを入口にしないでください。既存fixtureの情報に触れて設計が引っ張られる可能性があります。新しい曲作成では、まず `docs/system-overview.md` と `docs/song-authoring.md` だけを読んでください。

例外的な引き継ぎ:

- 煮ル果実「トラフィック・ジャム」の映像エフェクトは、`codex/traffic-jam-effect` の `81876a7 Add traffic jam visual adapter` を採用しません。
- 別スレッドで作り直す場合は `docs/traffic-jam-redo-brief.md` を読んでください。
- `sync:check` に `codex/traffic-jam-effect 81876a7` が表示されても取り込まないでください。

## 現在の状態

このリポジトリは、曲ごとに自由なインタラクティブ音楽エフェクトを作るための system kit と fixture player です。

現在できること:

- Vite + TypeScriptでfixture player appを起動する。
- 起動管理サーバーで fixture player と song-pack server をまとめて起動、停止、再起動する。
- `?song=<manifest-url>` で曲パッケージを指定して読み込む。
- manifest、歌詞、解析JSON、手動タイミングなどを `MusicMap` に変換する。
- `examples/fixture-player` の柔らかい光表現fixture rendererを動かす。
- Lyric Timing optional toolで、A/Dキーによる歌詞切り替え時刻の手動打刻ができる。
- 全体/途中からのタイミング補正と、シーケンスバー上のストーン可視化がある。
- シーケンスバーをクリック/ドラッグして再生位置を移動できる。
- `docs/workflows.html` / `docs/workflows.json` にワークフロー地図がある。
- `song-packs/traffic-jam/` に、煮ル果実「トラフィック・ジャム」の実装前設計パックがある。音源と歌詞全文は含めず、Songle公開JSON、最小manifest、演出方針ドキュメントだけを置いている。
- 曲アプリ向けに `system/kit/songAdapterContext.ts` を追加し、raw manifest、base URL、`readJson()`、`readText()`、`readDesignCues()` を渡せるようにした。system kitは `design.cues` の中身を固定解釈しない。
- fixture player内に中立的な `builtin:fixture-soft-light` adapter registryを置いている。外部adapter読み込みはまだ無効。
- セキュリティレビューを反映し、manifest素材パスのパッケージ境界チェック、サイズ上限つきfetch、song-pack serverのCORS制限、dev managerのoriginチェックとログ表示無害化を追加した。
- 複数の曲用映像や補助サーバーを扱う簡素版Launch Manager MVPを実装した。`npm run dev` は `scripts/dev-manager.mjs` 互換入口から `scripts/launch-manager/server.mjs` を起動し、`launch/targets.json` のTarget/SetをGUI/APIで管理する。
- Launch Managerの停止操作は、そのLaunch Manager自身が起動したmanaged targetだけに効く。並行worktreeではportを分け、GUI下部の `config` / `runtime` とtarget portを確認してから操作する。

## 新しいスレッドの開始手順

新規スレッドは、最初に `docs/thread-start.md` を読んでください。

最初に実行する確認:

```powershell
git status --short --branch
npm run sync:check
```

ready通知は「必ずmerge」ではなく「取り込み候補」です。system kitに曲固有adapterや既存fixtureの見た目を入れる変更は、そのまま取り込まないでください。

重要:

- 既存の曲パッケージはテンプレートではない。
- 新しい曲を作るときは、既存の `song-packs/*` を読まない。
- 新しい曲作成の入口は `docs/system-overview.md` と `docs/song-authoring.md`。
- 新しい曲の視覚実装は `docs/song-visual-independence.md` と `templates/neutral-song-app/` から始め、`examples/fixture-player/renderers/*` や `examples/fixture-player/effects/*` をテンプレートにしない。
- 既存曲を見るのは、その曲自体の修正、回帰確認、またはユーザーの明示許可がある場合だけ。

## 重要な制約

- 音源ファイルをAI学習に使わない。
- 音源波形をCodexやアプリで解析しない。
- 音源はブラウザで再生するだけにする。
- 歌詞txtはUTF-8として扱い、日本語を壊さない。
- 曲ごとの演出をシステム側に固定しすぎない。
- 音源ファイルはコミットしない。
- 描画方式をCanvas2Dに固定しない。
- 歌詞タイミング編集はoptional toolとして扱う。
- 外部Web adapterは将来許容するが、まずは同一ビルド内でadapter分離する。
- ローカル開発サーバーは外部ネットワークへ公開しない。
- 秘密情報を曲パッケージ、docs、ログ、プロンプトへ置かない。

## 起動方法

通常起動:

```powershell
npm install
npm run dev
```

`npm run dev` はLaunch Managerを立てます。管理画面で `Basic fixture` setを起動すると、fixture player と song-pack server がまとめて起動します。

```text
http://127.0.0.1:5172/
```

fixture player appは曲manifestを明示して開きます。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/<song-id>/manifest.json
```

動作確認用fixture:

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/shining-star/manifest.json
```

このfixtureは新しい曲のテンプレートではありません。

並行worktreeで既定ポートが埋まっている場合:

```powershell
$env:DEV_MANAGER_PORT=5182
$env:PLAYER_PORT=5183
$env:SONG_PACK_PORT=5184
npm run dev
```

ワークフロー地図:

```text
http://127.0.0.1:5173/docs/workflows.html
```

## 主要ファイル

- `AGENTS.md`: エージェント向け入口。
- `README.md`: 利用方法。
- `docs/thread-start.md`: 新しいスレッドの開始手順、ready確認、merge判断。
- `docs/system-overview.md`: 特定曲に依存しないシステム概要。
- `docs/song-authoring.md`: 新しい曲作成時のアンカー回避ルール。
- `docs/song-visual-independence.md`: 既存fixtureの見た目に引っ張られないためのチェックリスト。
- `system/kit/`: 曲に依存しない補助ライブラリ。
- `system/kit/index.ts`: system kitの公開API入口。
- `system/kit/safeFetch.ts`: URL検証、曲パッケージ境界チェック、サイズ上限つきfetch。
- `system/kit/assets.ts`: manifestと曲データの読み込み。
- `system/kit/songAdapterContext.ts`: 曲アプリ向けasset reader。
- `examples/fixture-player/main.ts`: 動作確認用fixture playerの入口。
- `examples/fixture-player/adapters/`: fixture player内adapter registry。曲固有adapterはここへ増やさない。
- `examples/fixture-player/tools/lyricTimingTool.ts`: fixture playerに載せたoptional lyric timing UI。
- `templates/neutral-song-app/`: 新曲向けの空scaffoldとvisual brief。
- `docs/security.md`: 信頼境界と運用ルール。
- `docs/launch-manager-spec.md`: 次に実装する簡素版Launch Manager仕様。
- `docs/workflows.json`: LLM共有用のフロー定義。

## 次にやるとよいこと

優先度が高い順:

1. fixture playerが新しい曲のテンプレートに見えないよう、docsとUI文言を維持する。
2. 新曲実装担当が `templates/neutral-song-app/visual-brief.md` を先に埋める運用を定着させる。
3. Launch ManagerのTargetに、曲ごとの映像サーバーや保存APIを追加する設計を進める。
4. 保存APIを検討し、ライブ中に調整したタイミングを安全に曲パッケージへ保存できるようにする。

Launch Managerを変更する場合:

- まず `docs/launch-manager-spec.md` を読む。
- 最初はmanaged targetだけを扱う。
- 複数Launch Server調停、attached/delegated、自動port再割当、LAN公開、スマホ専用UIはMVPに含めない。
- GUIから任意コマンドを入力させない。起動可能なものはローカルの `launch/targets.json` に書かれたTargetだけ。
- 停止対象はLaunch Serverが起動してPIDを持つtargetだけ。PC全体の同名プロセスや他worktreeのtargetを停止対象にしない。
- `scripts/dev-manager.mjs` は互換入口。実装本体は `scripts/launch-manager/`。

## 新規曲パック: traffic-jam

作業前提:

- 既存の `song-packs/*` は読まず、`docs/system-overview.md` と `docs/song-authoring.md` を入口にした。
- 音源波形解析はしていない。
- 音源ファイルと歌詞全文は追加していない。

現在の中身:

- `song-packs/traffic-jam/manifest.json`: 最小manifest。Songle JSON、palette、markers、設計文書へのパスを持つ。システム側の曲専用adapter指定は持たない。
- `song-packs/traffic-jam/design/effect-direction.md`: 暗い世界、鋭い視線、選択的な衝突ブロー、バッシング、間奏freezeを中心にした演出方針。
- `song-packs/traffic-jam/analysis/`: Songle Widget APIから取得した `song.json`、`beat.json`、`chord.json`、`melody.json`、`chorus.json` と、曲側で作った `visual-cues.json`、`markers.json`、`palette.json`。
- `song-packs/traffic-jam/CREDITS.md`: 外部リンクとクレジットメモ。

次にやるなら:

- 低ポリ車、信号機、標識、矢印、シルエット程度の簡単な素材方針を決める。
- Traffic Jam固有の曲アプリを作る場合は、このスレッドのsystem kitとは分けて、曲側の自由な構成として始める。
- 強いキック/ブロー、責任転嫁が強い歌詞箇所、間奏の入り/戻りを手動マーカーとして追加する。

## 文脈管理の意図

会話の中だけに設計意図を溜めるのではなく、リポジトリ内にCodex用の認識地図を置きます。

新しい曲作成時は、認識地図が既存曲に汚染されないように、system-neutral docsだけを入口にしてください。既存曲の中身を見る必要が出た場合は、理由と許可を明確にします。
