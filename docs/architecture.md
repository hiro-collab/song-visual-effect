# Architecture

この文書は、特定の曲パッケージに依存しないシステム構成を説明します。新しい曲を作る場合は、この文書だけで全体像を把握できるようにし、既存の `song-packs/*` は参照しません。

重要な前提として、音源波形は解析しません。音源はAI学習に使わず、ブラウザで再生するだけにします。映像や歌詞のタイミングは、解析済みJSON、歌詞テキスト、手動入力、曲ごとのマーカーなどから作ります。

## 全体像

```text
dev manager
  system app server
  song package server

browser
  index.html
  src/main.ts
    runtime helpers
    optional tools
    renderer / song adapter

song package
  manifest entry
  song-owned assets
  song-owned grammar
  optional adapter
```

システム側は曲の中身を決めません。system appは `?song=<manifest-url>` を入口として受け取り、そのmanifestを読むだけです。manifest URLがない場合、特定曲へ自動フォールバックせず、起動エラーとして扱います。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/<song-id>/manifest.json
```

## 起動管理

分離構成では、複数のサーバーを手作業で起動するとトラブルが増えます。そのため `npm run dev` は起動管理サーバーを立ち上げ、system app と song-pack server をまとめて管理します。

```text
http://127.0.0.1:5172
  dev manager

http://127.0.0.1:5173
  system app

http://127.0.0.1:5174
  song package server
```

## System Host

system hostの責務:

- manifest URLを受け取る。
- 曲パッケージの入口を読む。
- ブラウザのDOM、Audio、入力、フレームループを準備する。
- 再生、停止、シーク、現在時刻を扱う。
- optional toolを提供する。
- 曲アプリやrendererへ補助contextを渡す。

system hostの非責務:

- 曲固有の演出を決めること。
- 曲固有のJSON文法を固定すること。
- 既存曲の構成を標準化すること。
- 描画方式をCanvas2Dに固定すること。
- 歌詞タイミング編集を全曲必須にすること。

## Song Package

曲パッケージは、曲ごとの素材、演出意図、データ文法、adapter、クレジットを持つ場所です。

曲パッケージ内の構成は自由です。現在のWeb system hostで読むにはmanifestが必要ですが、manifestの先の構造は曲ごとに設計できます。

最小manifest:

```json
{
  "id": "song-id",
  "title": "Song Title",
  "artist": "Artist",
  "duration": 180
}
```

歌詞、解析JSON、音源、クレジット、Web adapterなどは必要な場合だけ追加します。

## 現在の実装モジュール

```text
src/main.ts
  起動、入力登録、song adapter/toolの接続

src/runtime/
  DOM取得、再生制御、フレームループ、song adapter context

src/adapters/
  system hostと曲固有adapterの接続

src/data/assets.ts
  manifest読み込みと最小MusicMap変換

src/music/timing.ts
  beat、chorus、lyricの時刻検索

src/renderers/
  現在同梱しているfixture用の描画実装

src/tools/
  optional tool

src/lyrics/
  歌詞タイミング調整のデータ処理
```

現在は同一ビルド内の `builtin:` adapterだけを許可しています。外部サーバーから任意コードを読み込むadapterは、セキュリティ設計が固まるまで無効です。

`builtin:fixture-soft-light` は既存fixture rendererをadapterとして包みます。`builtin:traffic-jam` は曲専用の `design.cues` を読み、system側でcue文法を固定せずに曲adapter側で解釈する最初の例です。

## フレーム更新

`src/runtime/frameLoop.ts` が `requestAnimationFrame` を使って毎フレームの更新を予約します。各フレームでは現在時刻を読み、曲アプリまたはrendererが必要な表示を更新します。

```text
requestAnimationFrame
  -> current time
  -> song adapter
  -> optional tools
  -> next frame
```

## 曲データ読み込み

`src/data/assets.ts` はmanifestを入口にします。

- manifestの場所を基準に相対パスを解決する。
- 指定された曲パッケージ内の素材だけを読む。
- 別曲のデータへ勝手にフォールバックしない。
- manifest URLがない、またはmanifestが読めない場合は起動失敗として扱う。

この方針により、既存曲が暗黙のデフォルトになることを避けます。

## Optional Tool

歌詞タイミング編集はsystem側のoptional toolです。

```text
baseLyrics
  + manualKeyframes
  + lyricAdjustments
  = workingLyrics
```

歌詞がない曲、別のタイミング構造を使う曲、別ランタイムで動く曲は、このtoolを使わなくて構いません。

## 今後の方向

次段階では、曲固有の演出をより曲パッケージ側のWeb adapterへ移します。

```text
system host
  context: transport, frame, input, assets, surface, tools, storage
    ↓
song web adapter
  createSongApp(context)
```

外部サーバーからWeb adapterを直接読み込む設計は、任意コード実行や信頼境界の問題があります。現在は同一ビルド内でadapterを分離し、外部adapter化はセキュリティ設計を固めてから行います。
