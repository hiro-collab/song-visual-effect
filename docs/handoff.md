# Handoff

次のCodexスレッドや別エージェントは、まずこのファイルを読んでください。

## 現在の状態

このリポジトリは、魔王魂「Shining Star」を題材にしたWebベースのインタラクティブ音楽エフェクトPoCです。

主な機能:

- Vite + TypeScriptのCanvas2Dアプリ。
- Songle解析JSON、歌詞txt、手動タイミングJSONを読み込む。
- 柔らかい光、粒子、光線、歌詞表示を曲時間に合わせて描画する。
- Lyric Timingモードで、A/Dキーによる歌詞切り替え時刻の手動打刻ができる。
- 全体/途中からのタイミング補正と、シーケンスバー上のストーン可視化がある。
- シーケンスバーをクリック/ドラッグして再生位置を移動できる。
- `manifest.json` と `?song=` により、曲パッケージを別サーバーから読める。
- `docs/workflows.html` / `docs/workflows.json` にワークフロー地図がある。
- 仕様方針として、今後は `music_src` を廃止し、`song-packs` を曲データ本体にする。

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

現在の通常起動:

```powershell
npm install
npm run dev
```

今後標準にする分離構成:

```powershell
npm run dev:system
npm run dev:songs
```

分離構成URL:

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/shining-star/manifest.json
```

ワークフロー地図:

```text
http://127.0.0.1:5173/docs/workflows.html
```

## 主要ファイル

- `AGENTS.md`: エージェント向け入口。
- `README.md`: 利用方法。
- `src/main.ts`: 現在の中心実装。
- `src/data/assets.ts`: manifestと曲データの読み込み。
- `src/lyrics/manualTiming.ts`: 歌詞タイミング調整。
- `src/effects/`: 粒子、光線、色、ダンピング。
- `song-packs/shining-star/manifest.json`: 分離構成の曲manifest。
- `docs/workflows.json`: LLM共有用のフロー定義。

## 次にやるとよいこと

優先度が高い順:

1. 未コミットのドキュメント追加分をコミットする。
2. `music_src` を廃止し、`song-packs` を曲データ本体にする。
3. 分離サーバー群をまとめて起動できる起動管理を追加する。
4. `src/main.ts` を小さく分割する。
5. `transport`、`frameLoop`、`input`、`lyricTimingEditor`、`sequenceBar` をシステム側モジュールとして整理する。
6. Shining Star固有の演出配線を、まず同一ビルド内の曲Web adapterへ移す。
7. 保存APIを検討し、ライブ中に `lyrics_timing.json` を直接更新できるようにする。
8. 色味プリセットやライブ用雰囲気切り替えUIを追加する。

## 今回のドキュメント整備の意図

会話の中だけに設計意図を溜めるのではなく、リポジトリ内にCodex用の認識地図を置くために、次を追加しました。

- `AGENTS.md`
- `docs/architecture.md`
- `docs/module-map.md`
- `docs/decisions.md`
- `docs/plans.md`
- `docs/known-issues.md`
- `docs/handoff.md`

今後の作業後は、このhandoffと関連docsを更新してください。
