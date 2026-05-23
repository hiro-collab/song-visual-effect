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

新しい曲を作るエージェントは、次の順に読みます。

1. `AGENTS.md`
2. `docs/system-overview.md`
3. `docs/song-authoring.md`
4. `docs/song-visual-independence.md`
5. 必要に応じて `docs/decisions.md`

既存曲のフォルダは読まないでください。

## 最初に決めること

既存の曲構成から逆算せず、曲ごとに次を決めます。

- この曲をどんな場で使うか。
- ライブ操作が必要か。
- 歌詞が必要か。
- 拍、サビ、コード、手動マーカーのどれを使うか。
- そもそもSongle/TextAlive由来の構造を使うか。
- 描画方式を何にするか。
- 同梱fixture playerを使うか、曲専用Webアプリを作るか、別ランタイムを使うか。
- 曲側にどのデータ文法が必要か。

## 設計の進め方

1. 曲の演出意図を文章で書く。
2. `templates/neutral-song-app/visual-brief.md` の項目に沿って、主役構造と避ける表現を決める。
3. 入力、出力、きっかけ、ライブ操作を洗い出す。
4. 曲専用のデータ構造を決める。
5. 必要な場合だけ、`system/kit` の補助機能を選ぶ。
6. 最小manifestを作る。
7. 曲側の実装を作る。
8. 最初のプレビュー後に `docs/song-visual-independence.md` で前作似チェックをする。

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
- `examples/fixture-player/renderers/` や `examples/fixture-player/effects/` を新曲の視覚テンプレートにする。
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
