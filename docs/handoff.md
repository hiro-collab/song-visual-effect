# Handoff

このファイルは、システム改修や既存機能修正を引き継ぐためのメモです。

新しい曲を作る場合は、このファイルを入口にしないでください。既存fixtureの情報に触れて設計が引っ張られる可能性があります。新しい曲作成では、まず `docs/system-overview.md` と `docs/song-authoring.md` だけを読んでください。

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
- `song-packs/traffic-jam/` に、煮ル果実「トラフィック・ジャム」の実装前設計パックがある。音源と歌詞全文は含めず、Songle公開JSON、最小manifest、演出方針ドキュメントだけを置いている。
- 曲adapter向けに `SongAdapterContext` を追加し、raw manifest、base URL、`readJson()`、`readText()`、`readDesignCues()` を渡せるようにした。system hostは `design.cues` の中身を固定解釈しない。
- 同一ビルド内の `builtin:` adapter registryを追加した。外部adapter読み込みはまだ無効。
- `song-packs/traffic-jam/manifest.json` は `webAdapter: "builtin:traffic-jam"` を指定し、adapterが `analysis/visual-cues.json` を読む。
- セキュリティレビューを反映し、manifest素材パスのパッケージ境界チェック、サイズ上限つきfetch、song-pack serverのCORS制限、dev managerのoriginチェックとログ表示無害化を追加した。

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
- ローカル開発サーバーは外部ネットワークへ公開しない。
- 秘密情報を曲パッケージ、docs、ログ、プロンプトへ置かない。

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
- `src/adapters/`: 同一ビルド内adapter registryとbuiltin adapters。
- `src/runtime/`: DOM、transport、frame loop。
- `src/runtime/safeFetch.ts`: URL検証、曲パッケージ境界チェック、サイズ上限つきfetch。
- `src/data/assets.ts`: manifestと曲データの読み込み。
- `src/tools/lyricTimingTool.ts`: optional lyric timing tool。
- `docs/security.md`: 信頼境界と運用ルール。
- `docs/workflows.json`: LLM共有用のフロー定義。

## 次にやるとよいこと

優先度が高い順:

1. Traffic Jam adapterを、現在のsoft light流用から曲専用の見た目へ発展させる。
2. 曲固有のfixture rendererを、system標準ではなく曲側adapter候補としてさらに切り出す。
3. `docs/workflows.json` に「新しい曲作成時は既存曲を読まない」フローを反映し続ける。
4. 保存APIを検討し、ライブ中に調整したタイミングを安全に曲パッケージへ保存できるようにする。
5. 色味プリセットやライブ用雰囲気切り替えUIを追加する。

## 新規曲パック: traffic-jam

作業前提:

- 既存の `song-packs/*` は読まず、`docs/system-overview.md` と `docs/song-authoring.md` を入口にした。
- 音源波形解析はしていない。
- 音源ファイルと歌詞全文は追加していない。

現在の中身:

- `song-packs/traffic-jam/manifest.json`: 最小manifest。Songle JSON、palette、markers、設計文書へのパスと `builtin:traffic-jam` adapter指定を持つ。
- `song-packs/traffic-jam/design/effect-direction.md`: 暗い世界、鋭い視線、選択的な衝突ブロー、バッシング、間奏freezeを中心にした演出方針。
- `song-packs/traffic-jam/analysis/`: Songle Widget APIから取得した `song.json`、`beat.json`、`chord.json`、`melody.json`、`chorus.json` と、曲側で作った `visual-cues.json`、`markers.json`、`palette.json`。
- `song-packs/traffic-jam/CREDITS.md`: 外部リンクとクレジットメモ。

次にやるなら:

- 低ポリ車、信号機、標識、矢印、シルエット程度の簡単な素材方針を決める。
- `SongAdapterContext.assets.readDesignCues()` を使って `analysis/visual-cues.json` を読む曲専用adapterの表現を強化する。
- 強いキック/ブロー、責任転嫁が強い歌詞箇所、間奏の入り/戻りを手動マーカーとして追加する。

## 文脈管理の意図

会話の中だけに設計意図を溜めるのではなく、リポジトリ内にCodex用の認識地図を置きます。

新しい曲作成時は、認識地図が既存曲に汚染されないように、system-neutral docsだけを入口にしてください。既存曲の中身を見る必要が出た場合は、理由と許可を明確にします。
