# Song Authoring Rules

この文書は、新しい曲のシステムや演出を作るときのルールです。目的は、既存曲の構成に引っ張られず、曲ごとに自由な設計を始められるようにすることです。

## 最重要ルール

新しい曲を作るときは、既存の `song-packs/*` を見ないでください。

見ない対象:

- 既存曲の `manifest.json`
- 既存曲の `analysis/`
- 既存曲の `design/`
- 既存曲のadapterや演出コード
- 既存曲のREADMEやメモ

例外:

- ユーザーが特定の既存曲を明示して「これを参考にして」と言った場合。
- 既存曲そのものを修正する場合。
- システム変更の回帰確認として、動作確認だけ行う場合。

## 作り始める前に読むもの

新しい曲の作業branchは、現在の統合基準 `codex/system-kit-refactor` の最新readyを取り込んだ状態から始めます。既存曲worktreeや古い実験branchを土台にしないでください。

新しい曲を作るエージェントは、次の順に読みます。

1. `AGENTS.md`
2. `docs/system-overview.md`
3. `docs/song-authoring.md`
4. `docs/song-visual-independence.md`
5. 必要に応じて `docs/decisions.md`
6. 共通ノウハウ候補を共有する場合だけ `docs/knowledge-review.md`

既存曲のフォルダは読まないでください。

## 曲担当の連絡確認フロー

曲担当は、作業開始時、実装の区切り、最終報告前に次を確認します。

```powershell
npm run sync:brief
npm run sync:check
npm run sync:inbox
```

確認すること:

- `codex/system-kit-refactor` からのreadyが来ているか。
- 自分の曲作業に関係するセキュリティ、Launch Manager、Songle取得、検証ツールの連絡があるか。
- 自分が共有したノウハウ候補に対して、system担当から分類結果が返っているか。

曲制作中に「これは他の曲でも使えそう」と思った場合は、すぐ正本docsを編集せず、まず `sync:note` でsystem担当へ候補として送ります。

```powershell
npm run sync:note -- --from song-example --to system --level question --topic knowledge-candidate -m "candidate: 区間ごとの画面構成を先に決める。scope: many songs. source: song-example. risk: 固定数値や特定構図は含めない。suggested home: docs/song-authoring.md"
```

system担当は `docs/knowledge-review.md` に沿って、`common` / `conditional` / `song-owned` / `reject` に分類します。曲担当は分類結果を確認し、`song-owned` と判断された内容は自分の曲パック側の `design/` に残してください。`common` と判断されたものだけがsystem側の正本docsへ昇格します。

## 最初に決めること

既存の曲構成から逆算せず、曲ごとに次を決めます。

- MV、公式ページ、インタビュー、レビュー、考察などを背景理解に使うか。
- この曲をどんな場で使うか。
- ライブ操作が必要か。
- 歌詞が必要か。
- 拍、サビ、コード、手動マーカーのどれを使うか。
- そもそもSongle/TextAlive由来の構造を使うか。
- 描画方式を何にするか。
- 同梱fixture playerを使うか、曲専用Webアプリを作るか、別ランタイムを使うか。
- 曲側にどのデータ文法が必要か。
- 曲のパートごとに、画面構成、主役、密度、色、動き、歌詞位置がどう変わるか。

## 設計の進め方

1. 曲の背景、受容、MV、歌詞、Songle解析を調べ、URLと用途だけを `references.json` に記録する。
2. 曲の演出意図を文章で書く。
3. `templates/neutral-song-app/visual-brief.md` の項目に沿って、主役構造と避ける表現を決める。
4. 曲のパート表を作り、各パートの画面構成を決める。
5. 入力、出力、きっかけ、ライブ操作を洗い出す。
6. 曲専用のデータ構造を決める。
7. 必要な場合だけ、`system/kit` の補助機能を選ぶ。
8. 最小manifestを作る。
9. 曲側の実装を作る。
10. 最初のプレビュー後に `docs/song-visual-independence.md` で前作似チェックをする。

この順番を守ると、既存曲のフォルダ形状に寄りにくくなります。

中立的な曲パックの雛形だけを作る場合は、既存曲を読まずに次のコマンドを使えます。

```powershell
npm run song:scaffold -- --id song-id --title "Song Title" --artist "Artist" --song-url "https://example.com/song" --adapter-id none
```

同一ビルド内で曲owned adapterを始める場合は `--adapter-id song:song-id --with-adapter` を指定できます。ただし、fixture previewで実際に使うには `song-packs/local-adapters.ts` への登録が別途必要です。

MV、公式ページ、歌詞考察などを参照した場合は、本文や画像を保存せず、`references.json` にURLと参照用途だけを記録してください。

```powershell
npm run song:validate -- --id song-id
```

このvalidateは `references.json` がURLメタデータだけになっているかを確認します。歌詞本文、記事本文、画像データ、スクリーンショット、base64埋め込みは保存しないでください。

外部ライブラリや描画エンジンを追加したくなった場合は、まず `docs/library-candidates.md` の採用前チェックを見てください。system標準へ入れるのではなく、曲側の任意adapterや小さなhelperで済むかを先に検討します。

## 曲の背景調査

曲の背景調査は共通の作法として行ってよいです。ただし、調査結果は素材の転載ではなく、演出判断のための理解として扱います。

- 公式MV、公式ページ、配信ページ、制作者コメント、インタビュー、レビュー、考察、ライブ映像の存在を確認する。
- 歌詞は演出意図、区間の意味、文字表示の扱いを考えるために参照する。
- ネット上の記事本文、歌詞全文、画像、スクリーンショット、動画素材を曲パックへ保存しない。
- 参照したものは `references.json` にURL、参照用途、確認日だけを記録する。
- 調査から得た解釈、モチーフ、避けたい表現は曲パック側の `design/` や `visual-brief.md` に自分の言葉で書く。

共通化するのは調査の作法だけです。調査結果からどの画面構成にするか、どの文法を使うかは曲ごとに決めます。

## 曲構成と画面構成

実装前に、曲のパートごとの画面構成を短く決めてください。これは見た目のテンプレートではなく、曲ごとに自由な映像を作るための設計メモです。

各パートで決めること:

- パート名と時刻範囲、またはSongle/手動cue上の区切り。
- 音楽的な役割。導入、説明、緊張、解放、転換、間奏、終止など。
- 画面の主役。人物、場、記号、文字、オブジェクト、空間、カメラ視点など。
- 画面構成。前景、中景、背景、余白、文字位置、視線誘導、投影時の安全領域。
- 密度と動き。静か、詰まる、広がる、切り替わる、止まる、揺れるなど。
- 色と明るさ。区間ごとの色相、明度、コントラスト、暗転、発光の扱い。
- 次のパートへの遷移。カット、フェード、押し出し、回転、カメラ移動、突然の断絶など。

特にサビだけを派手にするのではなく、Aメロ、Bメロ、間奏、落ちサビ、アウトロなどで画面の「読み方」がどう変わるかを先に決めます。これにより、beat点滅や粒子量だけに頼る実装を避けやすくなります。

## Songle URLの選び方

Songle/Songriumから解析JSONを取得する場合は、曲パックごとにcanonical URLを1つ決めてください。

- `nico.ms` や `youtu.be` などの短縮URLをcanonicalにしない。
- できるだけ `www.nicovideo.jp/watch/<id>` や `www.youtube.com/watch?v=<id>` のような公式の通常URLを使う。
- 同じ曲がNico版、YouTube版、別投稿版として複数登録されている場合は、別の解析ソースとして扱う。
- 複数登録が見つかった場合は、beat、chorus、chord、melodyの有無、件数、更新履歴を軽く比較してから1つ選ぶ。
- 選んだURL、確認した代替URL、選定理由は、曲パック側の `references.json` や `credits.md` にURLメタデータとして記録する。

Songleの登録単位が違うと、同じ曲名でもbeatやchordの数、chorus区間、更新者、更新日が変わることがあります。曲側の演出は、選んだcanonical URLの解析結果に対して作ってください。

## Songle解析JSONの見方

Songle由来のJSONは、完全な音楽スコアではなく、演出のきっかけに使う補助データとして扱います。

- `beat` は拍、downbeat、小節感のきっかけとして使う。
- `chorus` や repeat segment は、盛り上がり区間や構成変化の候補として使う。
- `chord` は色、緊張感、場面転換の補助ヒントとして使う。
- `melody` は、手元のJSONに音高や音量カーブが含まれるとは限らない。`notes` のstart、duration、indexだけの場合は、音符密度、休符、長音、入りのタイミングのヒントとして使う。
- `melody = ピッチ線` と決めつけない。pitch、volume、confidenceなどのフィールドが実際にあるかを確認してから使う。
- 盛り上がり推定は、beat/downbeat、chorus、chord変化、melody note密度、休符、長音、手動design cuesを組み合わせて行う。
- Songleのタイミング精度は曲や登録によってずれる。ライブ用に厳密な切り替えが必要なら、曲側で手動cueやタイミング補正を追加する。

## 使ってよいシステム補助

曲ごとに必要なものだけ選んでください。

- transport: 再生、停止、シーク、現在時刻。
- frame loop: 毎フレーム更新。
- input: キー、ポインタ、ボタン。
- surface: Canvas、DOM、全画面などの表示領域。
- storage: localStorageや将来の保存API。
- tools: 歌詞タイミング編集などのoptional tool。
- loader: manifestや素材URL解決。
- visual host: 曲adapter用の追加表示レイヤ、DPR/resize、fixture UIと重ならないsafe area。WebGLなどでcanvasを使う場合は2D contextを作らないレイヤも選べる。
- content rect helper: Canvas2Dを選んだ曲だけが任意で使える、DPR resize、safe area clip、pointer正規化、文字サイズfitの小さな補助。

これらは文法ではなく部品です。曲側が全部使う必要はありません。

## 禁止したい進め方

- 既存曲のmanifestをコピーしてから作り始める。
- 既存曲の `analysis/` 構造を標準スキーマだと思い込む。
- 既存曲のエフェクトを名前だけ変えて流用する。
- `examples/fixtures/soft-light-player/renderers/` や `examples/fixtures/soft-light-player/effects/` を新曲の視覚テンプレートにする。
- soft light rendererの中央発光、放射線、光ネットワーク、粒子、グロー中心の構図を無意識に再利用する。
- 曲側の自由なJSON構成を、システム側の都合で固定する。
- Canvas2D前提で設計を始める。
- 歌詞タイミング編集が必須だと決めつける。

## ニュートラルな出発点

曲アプリやadapterを作る場合は、まず `templates/neutral-song-app/` を見てください。

- `visual-brief.md`: 曲の主役構造を先に固定するための記入シート。
- `adapter.ts`: Canvas2D adapterとして始める場合の、空の描画ループだけを持つ出発点。

このテンプレートは見た目を提供しません。既存fixtureの構図や部品を継承しないための、空白に近い開始地点です。

## どうしても例が必要な場合

まず空の設計から作ってください。それでも例が必要な場合は、ユーザーに確認してから既存曲を読みます。

確認例:

```text
既存曲の構成を見ると新しい曲がその形に引っ張られる可能性があります。
この曲について、既存曲を参考例として読んでもよいですか？
```

許可がない場合は読みません。
