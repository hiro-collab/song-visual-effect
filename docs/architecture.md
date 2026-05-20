# Architecture

この文書は、特定の曲パッケージに依存しないシステム構成を説明します。新しい曲を作る場合は、この文書だけで全体像を把握できるようにし、既存の `song-packs/*` は参照しません。

重要な前提として、音源波形は解析しません。音源はAI学習に使わず、ブラウザで再生するだけにします。映像や歌詞のタイミングは、解析済みJSON、歌詞テキスト、手動入力、曲ごとのマーカーなどから作ります。

## 全体像

このリポジトリは「曲を支配するhost」ではなく、「曲アプリを助けるkit」を中心にします。

```text
dev manager
  fixture player server
  song package server

system/kit
  manifest loading
  safe asset reader
  transport
  frame loop
  timing helpers
  lyric timing data helpers

examples/fixture-player
  small runnable player for regression checks
  optional lyric timing UI
  fixture renderer

song package or song app
  manifest entry
  song-owned assets
  song-owned grammar
  song-owned app / adapter
```

`system/kit` は曲を知りません。曲名、曲ごとのcue文法、演出思想、描画方式を固定しません。

現在のブラウザ画面は `examples/fixture-player` です。これは動作確認用の小さなプレイヤーであり、すべての曲を従わせる本体ではありません。

## 起動管理

分離構成では、複数のサーバーを手作業で起動するとトラブルが増えます。そのため `npm run dev` は起動管理サーバーを立ち上げ、fixture player app と song-pack server をまとめて管理します。

```text
http://127.0.0.1:5172
  dev manager

http://127.0.0.1:5173
  fixture player app

http://127.0.0.1:5174
  song package server
```

fixture player appは `?song=<manifest-url>` で曲パッケージの入口を受け取ります。manifest URLがない場合、特定曲へ自動フォールバックせず、起動エラーとして扱います。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/<song-id>/manifest.json
```

並行worktreeで起動する場合は、`DEV_MANAGER_PORT`、`PLAYER_PORT`、`SONG_PACK_PORT` でポートをずらせます。起動管理サーバー経由でsong-pack serverを立てる場合、`PLAYER_PORT` に合わせたCORS許可originを自動で渡します。

## System Kit

`system/kit` の責務:

- manifest URLを受け取るためのhelper。
- 曲パッケージの入口を読む。
- 曲パッケージ内のassetを境界チェックつきで読む。
- JSONとテキストをサイズ上限つきで取得する。
- 再生、停止、シーク、現在時刻を扱う `Transport`。
- `requestAnimationFrame` のフレームループ。
- beat、chorus、lyricsなどの時刻検索。
- 手動歌詞タイミング調整のデータ処理。
- fixture playerや曲アプリへ渡す最小限の `SongAdapterContext`。

`system/kit` の非責務:

- 曲固有の演出を決めること。
- 曲固有のJSON文法を固定すること。
- 既存曲の構成を標準化すること。
- 描画方式をCanvas2Dに固定すること。
- 歌詞タイミング編集UIを全曲必須にすること。
- 曲ごとのWebアプリを必ずこのfixture playerに載せること。

## Fixture Player

`examples/fixture-player` は、system kitを使った動作確認用アプリです。

役割:

- manifestを読み、画面に曲情報を表示する。
- 既存のsoft light rendererで簡易的に映像確認する。
- optional lyric timing UIを試せるようにする。
- system kitの回帰確認に使う。

非役割:

- 新しい曲のテンプレートになること。
- 曲ごとの標準UIになること。
- 外部Web adapterを安全に読み込むこと。
- 曲専用cue文法をシステム標準として解釈すること。

`index.html` はこのfixture playerを読み込みます。

```text
index.html
  -> examples/fixture-player/main.ts
```

## Song Package

曲パッケージは、曲ごとの素材、演出意図、データ文法、adapter、クレジットを持つ場所です。

曲パッケージ内の構成は自由です。fixture playerで読むにはmanifestが必要ですが、manifestの先の構造は曲ごとに設計できます。

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

## Security Boundary

このシステムはローカル開発向けです。既定では各サーバーを `127.0.0.1` にbindし、外部ネットワークへ公開しません。詳しい運用ルールは `docs/security.md` を参照してください。

重要な境界:

- manifest URLと素材URLは `http:` / `https:` に限定する。
- 曲パッケージ内assetは、既定ではそのパッケージ配下だけを読む。
- JSONとテキストはサイズ上限つきで読み、巨大レスポンスをそのまま処理しない。
- song-pack serverは、既定でfixture playerのoriginからのCORSだけを許可する。
- song-pack serverは隠しファイルと未許可拡張子を配信しない。
- dev managerの起動・停止APIは、同一origin相当のリクエストだけを受け付ける。
- 外部Web adapterを直接読み込む設計は任意コード実行につながるため、まだ採用しない。

## 今後の方向

次段階では、曲ごとのWebアプリが `system/kit` から必要なhelperだけをimportする形へ寄せます。

```text
song app
  imports only what it needs from system/kit

system/kit
  offers helpers
  does not own the song
```

外部Web adapterを扱う場合は、CORS、信頼境界、任意コード実行、保存APIとの関係を別途設計してから導入します。
