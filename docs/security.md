# Security Notes

この文書は、このローカル開発向け music-effect system kit / fixture player の信頼境界と
最低限のセキュリティ対策をまとめます。

## 前提

- このリポジトリは公開Webサービスではなく、ローカル開発用のsystem kitとfixture playerです。
- サーバーは既定でloopback hostだけにbindします。LANへ公開する場合は明示的にopt-inし、下の運用ルールを確認してください。
- 音源ファイルはコミットせず、AI学習や波形解析に使いません。
- APIキー、秘密鍵、トークンを曲パッケージやdocsへ置かないでください。
- この文書を親文書として推奨します。ただし、曲パックやshow-profile側のREADMEに必要な注意を書いても構いません。

## 信頼境界

主な入力面は次です。

- fixture player の `?song=<manifest-url>`
- manifest から参照される歌詞、解析JSON、音源、design cue
- `song-packs/` を配信するローカル静的サーバー
- Songle JSON ダウンロードスクリプトの `SongId` と `SongUrl`
- dev manager の起動・停止API
- `show-profiles/<show-id>/show.json` のsetlist、運用メモ、任意の `capabilities`
- 曲パックやshow-profileが独自に持つ外部入力、LAN制御、外部ツール連携

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
- Launch Manager は既定でloopback以外にbindしません。`LAUNCH_MANAGER_ALLOW_LAN=1` を明示した場合だけLAN公開を許可します。
- Launch Manager をLAN公開した場合、管理画面に「LAN公開中」の警告を表示します。
- Launch Manager の状態変更APIは、LAN公開中は `LAUNCH_MANAGER_CONTROL_TOKEN` が設定されていない限り実行できません。tokenが設定されている場合は `X-Control-Token` または `Authorization: Bearer` で一致した操作だけを受け付けます。
- Launch Manager のsync message viewerは `codex-sync/events.jsonl` の末尾だけを読み、イベント由来のcommit/ref文字列をgit引数に使う前に形式検証します。
- Launch Manager のshow-profile読み込みは `show-profiles/<show-id>/show.json` に限定し、実パスが `show-profiles/` 外へ出る項目、外部URL/絶対パスのmanifest、巨大JSON、埋め込みdata URI、HTML断片、秘密情報らしき文字列、歌詞本文や画像本文を示すキーを拒否します。
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

## capabilities と責任分界

`capabilities` は、曲パックやshow-profileが「どんな外部入力や運用能力を使う可能性があるか」を人間に伝えるための任意メモです。機能を有効化する設定ではなく、レビュー、運用、責任分界のための申告として扱います。

曲パック側の `capabilities` は、その曲映像が持つ性質を書きます。show-profile側の `capabilities` は、そのイベントや検証会で使う運用上の性質を書きます。同じ曲でも、あるshowでは使わない連携があるため、両方に置けます。

記入例:

```json
{
  "capabilities": ["touchdesigner", "osc", "lan-control", "audience-input"]
}
```

これは語彙の固定リストではありません。`websocket`、`midi`、`dmx`、`serial`、`external-input`、`remote-control` などを使ってもよいですし、曲やshowに合う独自語を使って構いません。未知の `capabilities` はvalidatorで拒否しません。

通信、外部入力、外部ツール連携を書く場合は、READMEまたは任意の `security-notes.md` に短く「何とつながるか」「誰が操作できる想定か」「公開範囲」「停止・復旧方法」を残すことを推奨します。共通validatorは、この説明不足をwarningにしません。説明の十分さは人間レビューと各曲・show側の設計で確認します。

曲側やshow側で外部入力、LAN操作、観客入力を実装する場合は、そのシステム自身が必要に応じて警告表示、接続状態表示、認可状態表示、rate limit、debounceを設計してください。共通フレームワークは、Launch ManagerのLAN警告やcontrol tokenのように安全側に倒せる部品や例を提供しますが、曲の映像表現や連携方式を固定しません。

## LAN公開とcontrol API

通常は `npm run dev` や `start-music-effect.cmd` で起動したまま、同じPCのブラウザから使ってください。この状態ではLaunch Manager、fixture player、song-pack serverはloopback前提です。

LAN上の別端末からLaunch Managerを見る必要がある場合だけ、信頼できるネットワークで `LAUNCH_MANAGER_ALLOW_LAN=1` と非loopback hostを明示してください。例:

```powershell
$env:LAUNCH_MANAGER_ALLOW_LAN="1"
$env:DEV_MANAGER_HOST="0.0.0.0"
$env:LAUNCH_MANAGER_CONTROL_TOKEN="<random local show token>"
npm run dev
```

LAN公開すると、同じネットワーク上の端末から管理画面やAPIへ到達できる可能性があります。会場LAN、配信PC、TouchDesigner用PC、スマホ操作端末などを使う場合は、公開するPC、ネットワーク、操作担当、停止手順を確認してから使ってください。インターネットへ直接公開しないでください。

`localhost` 以外へ公開するcontrol API、外部入力、状態変更通信では、認可なし運用を推奨しません。標準のLaunch Manager状態変更APIは、LAN公開中にtokenが未設定の場合は実行を拒否します。より複雑な構成では、曲側またはshow側で別方式を採用して構いません。

## 外部URLと外部コード

外部URLは、出典、ライセンス、参照用途を人間が確認するためのメモとしては許可します。`references.json`、`CREDITS.md`、READMEなどにURLを残す場合も、本文、歌詞全文、画像データ、スクリーンショット、base64/data URIは保存しないでください。

外部URLからadapter、演出コード、実行JSを自動でダウンロード、dynamic import、iframe表示、遷移実行する仕組みは共通フレームワークには入れません。manifestやshow-profileに外部URLがあっても、それは参照メモであり、実行対象ではありません。

## 運用ルール

- `DEV_MANAGER_HOST` や `LAUNCH_MANAGER_HOST` に `0.0.0.0` などloopback以外を指定する場合は、`LAUNCH_MANAGER_ALLOW_LAN=1` を明示してください。明示しない場合は起動を拒否します。
- Launch ManagerをLAN公開する場合は、状態変更API用に `LAUNCH_MANAGER_CONTROL_TOKEN` を設定してください。未設定でも管理画面の表示はできますが、状態変更APIは拒否されます。
- `SONG_PACK_HOST` は引き続きloopback以外を拒否します。LAN上の別端末へ曲データを配信したい場合は、CORS、公開範囲、認可、素材配信範囲を別途設計してください。
- fixture player のポートやoriginを個別起動で変える場合は、`SONG_PACK_CORS_ORIGINS` を明示してください。
- 起動管理サーバー経由で起動する場合は、自動割当されたplayer portに合わせて、song-pack serverへ対応するCORS許可originを渡します。個別起動では手動で合わせてください。
- localStorage は作業用キャッシュです。秘密情報や未公開の権利素材情報を保存しないでください。
- Launch Manager のruntimeログは `.codex/runtime/` に生成されます。Gitでは無視しますが、targetのstdout/stderrに秘密情報を出さないでください。
- 外部Web adapterを直接読み込む設計は、任意コード実行になるため未許可です。manifestの `webAdapter` にURLや相対パスを書いても、adapterコードとして解決しません。
- 保存APIを追加する場合は、保存先を曲パッケージ内の限定ファイルに固定し、任意パス書き込みを禁止してください。

## 残る注意点

- ユーザーが明示した外部manifestは、外部JSONとして読み込まれます。コードとしては実行しませんが、
  大量データや不正な構造は常にあり得る入力として扱います。
- ローカルサーバーを起動中に、ブラウザ内の別サイトから `127.0.0.1` へアクセスされる可能性があります。
  そのためCORSとoriginチェックを維持してください。
- lyricsやcreditsは画面表示時にHTMLとして挿入しないでください。
