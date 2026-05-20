# Handoff

このファイルは、システム改修や既存機能修正を引き継ぐためのメモです。

新しい曲を作る場合は、このファイルを入口にしないでください。既存fixtureの情報に触れて設計が引っ張られる可能性があります。新しい曲作成では、まず `docs/system-overview.md` と `docs/song-authoring.md` だけを読んでください。

例外的な引き継ぎ:

- 煮ル果実「トラフィック・ジャム」の映像エフェクトは、`codex/traffic-jam-effect` の `81876a7 Add traffic jam visual adapter` を採用しません。
- 別スレッドで作り直す場合は `docs/traffic-jam-redo-brief.md` を読んでください。
- `sync:check` に `codex/traffic-jam-effect 81876a7` が表示されても取り込まないでください。

## 現在の状態

このリポジトリは、曲ごとに自由なインタラクティブ音楽エフェクトを作るためのWeb system hostです。

現在できること:

- Vite + TypeScriptでsystem appを起動する。
- 起動管理サーバーで system app と song-pack server をまとめて起動、停止、再起動する。
- `?song=<manifest-url>` で曲パッケージを指定して読み込む。
- manifest、歌詞、解析JSON、手動タイミングなどを `MusicMap` に変換する。
- 柔らかい光表現のfixture rendererを動かす。
- Lyric Timing optional toolで、A/Dキーによる歌詞切り替え時刻の手動打刻ができる。
- 全体/途中からのタイミング補正と、シーケンスバー上のストーン可視化がある。
- シーケンスバーをクリック/ドラッグして再生位置を移動できる。
- `docs/workflows.html` / `docs/workflows.json` にワークフロー地図がある。

重要:

- 既存の曲パッケージはテンプレートではない。
- 新しい曲を作るときは、既存の `song-packs/*` を読まない。
- 新しい曲作成の入口は `docs/system-overview.md` と `docs/song-authoring.md`。
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

## 起動方法

通常起動:

```powershell
npm install
npm run dev
```

`npm run dev` は起動管理サーバーを立て、system app と song-pack server をまとめて起動します。

```text
http://127.0.0.1:5172/
```

system appは曲manifestを明示して開きます。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/<song-id>/manifest.json
```

動作確認用fixture:

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/shining-star/manifest.json
```

このfixtureは新しい曲のテンプレートではありません。

ワークフロー地図:

```text
http://127.0.0.1:5173/docs/workflows.html
```

## 主要ファイル

- `AGENTS.md`: エージェント向け入口。
- `README.md`: 利用方法。
- `docs/system-overview.md`: 特定曲に依存しないシステム概要。
- `docs/song-authoring.md`: 新しい曲作成時のアンカー回避ルール。
- `src/main.ts`: system hostの入口。
- `src/runtime/`: DOM、transport、frame loop。
- `src/data/assets.ts`: manifestと曲データの読み込み。
- `src/tools/lyricTimingTool.ts`: optional lyric timing tool。
- `docs/workflows.json`: LLM共有用のフロー定義。

## 次にやるとよいこと

優先度が高い順:

1. 曲固有のfixture rendererを、system標準ではなく曲側adapter候補として切り出す。
2. `docs/workflows.json` に「新しい曲作成時は既存曲を読まない」フローを反映し続ける。
3. 保存APIを検討し、ライブ中に調整したタイミングを安全に曲パッケージへ保存できるようにする。
4. 色味プリセットやライブ用雰囲気切り替えUIを追加する。

## 文脈管理の意図

会話の中だけに設計意図を溜めるのではなく、リポジトリ内にCodex用の認識地図を置きます。

新しい曲作成時は、認識地図が既存曲に汚染されないように、system-neutral docsだけを入口にしてください。既存曲の中身を見る必要が出た場合は、理由と許可を明確にします。
