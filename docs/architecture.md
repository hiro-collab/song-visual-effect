# Architecture

このプロジェクトは、Songle/TextAlive由来の解析JSON、歌詞テキスト、手動タイミングを使い、ブラウザ上で音楽に同期したインタラクティブ映像エフェクトを動かすPoCです。

重要な前提として、音源波形は解析しません。魔王魂の音楽はAI学習に使わず、ブラウザで再生するだけにします。映像や歌詞のタイミングは、解析済みJSON、歌詞テキスト、手動入力から作ります。

## 全体像

```text
ブラウザ
  index.html
    ↓
src/main.ts
  起動、入力、再生、フレーム更新、歌詞表示、Canvas描画
    ↓
src/data/assets.ts
  manifestと曲データをMusicMapへ変換
    ↓
song-packs/<song-id>/
  manifest、歌詞、Songle JSON、手動タイミング、palette、markers
```

分離構成では、システム本体と曲パッケージを別サーバーで動かせます。

```text
http://127.0.0.1:5173
  system app

http://127.0.0.1:5174
  song pack server
```

この分離構成を標準にします。`music_src` は廃止し、曲データ本体は `song-packs/<song-id>/` に一本化します。複数サーバーを手作業で起動するとトラブルが増えるため、`npm run dev` は起動管理サーバーを立ち上げ、system app と song-pack server をまとめて管理します。

システム側は次のように曲を指定します。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/shining-star/manifest.json
```

## 主要な処理

### 起動

`src/main.ts` の `boot()` が起動処理です。

1. DOM要素とCanvasを準備する。
2. `setupInput()` でボタン、キー、ポインタ操作を登録する。
3. `loadMusicMap()` でmanifestと曲データを読む。
4. 歌詞タイミングの手動補正を復元する。
5. paletteと音源パスを設定する。
6. `requestAnimationFrame(tick)` でフレームループを開始する。

### フレーム更新

`tick()` は毎フレーム呼ばれます。

1. 現在時刻を読む。
2. beat、chorus、markersから演出強度を計算する。
3. `DampValue` で光や色を滑らかに追従させる。
4. 背景、光線、粒子、クリック波紋をCanvasへ描画する。
5. 現在歌詞、次歌詞、シーケンスバーを更新する。
6. 次の `requestAnimationFrame(tick)` を予約する。

### 曲データ読み込み

`src/data/assets.ts` は `manifest.json` を入口にします。

manifestがある場合:

- manifestの場所を基準に相対パスを解決する。
- その曲パッケージ内のJSONだけを読む。
- 別曲のデータに勝手にフォールバックしない。

manifestが読めない場合:

- 起動失敗として扱う。
- `npm run dev` の起動管理サーバーで song-pack server が起動しているか確認する。

### 歌詞タイミング編集

`src/lyrics/manualTiming.ts` は、手動打刻と補正値から表示用歌詞タイミングを作ります。

```text
baseLyrics
  + manualKeyframes
  + lyricAdjustments
  = workingLyrics
```

`workingLyrics` が実際の歌詞表示とシーケンスバーに使われます。

### ワークフロー地図

`docs/workflows.json` は、人間とLLMの両方に向けたフロー定義です。`docs/workflows.html` はそのJSONを読み、クリック可能な図として表示します。

## 今後の方向

現在は `src/main.ts` がまだ大きく、Shining Star向けの演出配線も含んでいます。次段階では、曲固有の演出を曲パッケージ側のWeb adapterへ移し、システム側は補助contextを渡すだけにします。

```text
system host
  context: transport, frame, input, assets, surface, tools, storage
    ↓
song web adapter
  createSongApp(context)
```

この分離により、Web以外のTouchDesigner、Unity、OBSなどへadapterを作る余地を残します。

ただし外部サーバーからWeb adapterを直接読み込む設計は、任意コード実行や信頼境界の問題があります。最初は同一ビルド内で曲adapterを分離し、外部adapter化はセキュリティ設計を固めてから行います。

描画方式もCanvas2Dに固定しません。システムは表示領域や入力、時間、保存などを提供し、曲adapterがCanvas2D、WebGL、DOM、SVGなどを選べるようにする方針です。歌詞タイミング編集は標準ツールとして残しますが、必須ではなくoptional toolとして扱います。
