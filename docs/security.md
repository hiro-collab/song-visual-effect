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
- song-pack server のCORS許可originは、loopback の `http:` / `https:` originだけに限定します。
- song-pack server は隠しファイルと未許可拡張子を配信しません。
- song-pack server は曲パッケージ内の `.js` / `.css` を配信しません。adapterコードは同一ビルド内の静的登録だけで読み込みます。
- song-pack server は配信直前に実パスを確認し、シンボリックリンクやジャンクションで `song-packs/` 外へ出るファイルを配信しません。
- dev manager の状態変更APIは、同一origin相当のブラウザリクエストだけを受け付けます。
- dev manager のログ表示は `textContent` / DOM生成で行い、HTMLとして解釈しません。
- Launch Manager の管理画面はCSP、frame拒否、権限拒否ヘッダーを付け、同一originのAPIだけに接続します。
- Launch Manager のtarget定義は、作業ディレクトリをリポジトリ配下に限定し、commandを単純なコマンド名に限定します。
- Launch Manager のtarget定義では、`PATH`、`COMSPEC`、`SYSTEMROOT`、`NODE_OPTIONS` などrunner側の重要環境変数を上書きできません。
- Windows上の `npm` / `npx` target は `cmd.exe /c` を介すため、target引数にshellメタ文字が含まれる場合は起動前に拒否します。
- 同一ビルド内の曲固有adapterは `song-packs/local-adapters.ts` の `song:` 静的登録だけを使います。`builtin:` はfixture player側、`song:` は曲パック側のIDとして分け、外部URLや任意文字列からの動的importは行いません。
- Songle取得スクリプトは `SongId`、対象URL、取得target、保存先、サイズ、JSON構文を検証します。
- song-pack scaffold は対象の `song-packs/<song-id>/` 外へ出る実パスやシンボリックリンク上書きを拒否します。
- song-pack validation は `references.json` 参照が対象曲パッケージ外へ出る場合を拒否します。
- preview snapshot の出力先はリポジトリ配下に限定し、シンボリックリンク出力先を拒否します。
- `references.json` はURLと参照用途だけを記録するメタデータとして扱い、`npm run song:validate` で歌詞本文、記事本文、画像データ、base64埋め込み、HTML断片の混入を拒否します。
- `npm run song:validate` は song-pack 全体も走査し、symlink/junction、`.env` や秘密鍵系ファイル、音源ファイル、埋め込みdata URI、`<script>` / `<img>` / `<iframe>`、秘密情報らしきトークンを拒否します。

## 運用ルール

- `DEV_MANAGER_HOST` や `SONG_PACK_HOST` に `0.0.0.0` などloopback以外を指定すると起動を拒否します。
- fixture player のポートやoriginを個別起動で変える場合は、`SONG_PACK_CORS_ORIGINS` を明示してください。
- 起動管理サーバー経由で起動する場合は、自動割当されたplayer portに合わせて、song-pack serverへ対応するCORS許可originを渡します。個別起動では手動で合わせてください。
- localStorage は作業用キャッシュです。秘密情報や未公開の権利素材情報を保存しないでください。
- Launch Manager のruntimeログは `.codex/runtime/` に生成されます。Gitでは無視しますが、targetのstdout/stderrに秘密情報を出さないでください。
- 外部Web adapterを直接読み込む設計は、任意コード実行になるため未許可です。manifestの `webAdapter` にURLや相対パスを書いても、現行実装ではadapterコードとして解決しません。
- 保存APIを追加する場合は、保存先を曲パッケージ内の限定ファイルに固定し、任意パス書き込みを禁止してください。

## 残る注意点

- ユーザーが明示した外部manifestは、外部JSONとして読み込まれます。コードとしては実行しませんが、
  大量データや不正な構造は常にあり得る入力として扱います。
- ローカルサーバーを起動中に、ブラウザ内の別サイトから `127.0.0.1` へアクセスされる可能性があります。
  そのためCORSとoriginチェックを維持してください。
- lyricsやcreditsは画面表示時にHTMLとして挿入しないでください。
