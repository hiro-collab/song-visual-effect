# Security Notes

この文書は、このローカル開発向け music-effect system kit / fixture player の信頼境界と
最低限のセキュリティ対策をまとめます。

## 前提

- このリポジトリは公開Webサービスではなく、ローカル開発用のsystem kitとfixture playerです。
- サーバーはloopback hostだけにbindします。外部ネットワークへ公開しないでください。
- 音源ファイルはコミットせず、AI学習や波形解析に使いません。
- APIキー、秘密鍵、トークンを曲パッケージやdocsへ置かないでください。

## 信頼境界

主な入力面は次です。

- fixture player の `?song=<manifest-url>`
- manifest から参照される歌詞、解析JSON、音源、design cue
- `song-packs/` を配信するローカル静的サーバー
- Songle JSON ダウンロードスクリプトの `SongId` と `SongUrl`
- dev manager の起動・停止API

## 現在の対策

- manifest URL と曲素材URLは `http:` / `https:` のみ許可します。
- manifest内の相対パスは、既定でmanifestが置かれた曲パッケージ配下に閉じます。
- JSONとテキスト取得はサイズ上限を持ち、巨大レスポンスをそのまま処理しません。
- 同梱音源の自動検出はHEADまたはRange probeだけを使い、確認目的で音源全体を読みません。
- song-pack server のCORSは既定で fixture player のoriginだけを許可します。
- song-pack server は隠しファイルと未許可拡張子を配信しません。
- dev manager の状態変更APIは、同一origin相当のブラウザリクエストだけを受け付けます。
- dev manager のログ表示は `textContent` / DOM生成で行い、HTMLとして解釈しません。
- Songle取得スクリプトは `SongId`、対象URL、取得target、保存先、サイズ、JSON構文を検証します。

## 運用ルール

- `DEV_MANAGER_HOST` や `SONG_PACK_HOST` に `0.0.0.0` などloopback以外を指定すると起動を拒否します。
- fixture player のポートやoriginを変える場合は、`SONG_PACK_CORS_ORIGINS` を明示してください。
- 起動管理サーバー経由で `PLAYER_PORT` を変える場合は、song-pack serverへ対応するCORS許可originを渡します。個別起動では手動で合わせてください。
- localStorage は作業用キャッシュです。秘密情報や未公開の権利素材情報を保存しないでください。
- 外部Web adapterを直接読み込む設計は、任意コード実行になるため未許可です。
- 保存APIを追加する場合は、保存先を曲パッケージ内の限定ファイルに固定し、任意パス書き込みを禁止してください。

## 残る注意点

- ユーザーが明示した外部manifestは、外部JSONとして読み込まれます。コードとしては実行しませんが、
  大量データや不正な構造は常にあり得る入力として扱います。
- ローカルサーバーを起動中に、ブラウザ内の別サイトから `127.0.0.1` へアクセスされる可能性があります。
  そのためCORSとoriginチェックを維持してください。
- lyricsやcreditsは画面表示時にHTMLとして挿入しないでください。
