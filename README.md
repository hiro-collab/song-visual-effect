# Music Effect System Host

音楽に同期したインタラクティブ映像エフェクトを、曲ごとに自由に作るためのWeb system hostです。

このリポジトリの中心は、特定の曲の構成ではありません。system hostは、再生、入力、フレームループ、表示領域、起動管理、optional toolを提供します。曲ごとの演出、データ構造、JSON文法、UI、描画方式は曲パッケージ側で自由に決めます。

## Setup

```powershell
npm install
npm run dev
```

`npm run dev` は起動管理サーバーを立ち上げ、system app と song-pack server をまとめて起動します。

```text
http://127.0.0.1:5172/
```

system appは `?song=<manifest-url>` で曲パッケージを指定して開きます。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/<song-id>/manifest.json
```

manifest URLを指定しない場合、特定の曲へ自動フォールバックしません。これは、システムが既存曲に引っ張られないようにするためです。

個別に起動する場合は、次も使えます。

```powershell
npm run dev:system
npm run dev:songs
```

## System-Neutral Docs

新しい曲を作るときは、既存の曲パッケージを読まず、まず次を読んでください。

```text
docs/system-overview.md
docs/song-authoring.md
```

重要なルール:

- 既存の `song-packs/*` はテンプレートではありません。
- 新しい曲を作るときは、既存曲のmanifest、analysis、design、adapter、演出コードを見ないでください。
- 既存曲を見るのは、その曲自体を直すとき、回帰確認をするとき、またはユーザーが明示的に許可したときだけです。
- 曲ごとの構成は自由です。既存曲の構成に合わせる必要はありません。

## Song Package

曲パッケージは `song-packs/<song-id>/` に置けます。ただし、このディレクトリにある既存曲はテンプレートではなく、あくまで個別の実装例です。

このWeb system hostで曲を読む場合は、入口としてmanifest URLを渡します。manifestの先の構成は、曲ごとに自由に設計して構いません。

最小manifestの考え方:

```json
{
  "id": "song-id",
  "title": "Song Title",
  "artist": "Artist",
  "duration": 180
}
```

必要に応じて、歌詞、解析JSON、音源、クレジット、Web adapterなどへのパスを追加します。

## Included Fixture

この節は動作確認用です。新しい曲を設計するときの入口ではありません。

現在は動作確認用の曲パッケージとして、魔王魂「Shining Star」を同梱しています。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/shining-star/manifest.json
```

これはfixtureであり、次の曲の標準構成ではありません。新しい曲を作るときは、この中身を見ずに `docs/song-authoring.md` から始めてください。

音源ファイルはライセンス上コミットしません。ローカルで再生したい場合は、対象曲パッケージのaudioディレクトリに配置するか、画面下の `Audio` からローカル音源を選んでください。未配置でも内部クロックで映像だけ動きます。

## Optional Lyric Timing Tool

歌詞の切り替わりがずれている場合は、ブラウザ上で手動キーフレームを打てます。この機能はsystem hostのoptional toolです。歌詞がない曲や、別のタイミング構造を使う曲では使わなくても構いません。

基本操作:

- `Lyric Timing` を `On` にする。
- `A`: 現在表示中の歌詞行の開始時刻を現在時刻に登録。
- `D`: 次の歌詞行の開始時刻を現在時刻に登録。
- `Undo` または `Ctrl+Z` / `Backspace`: 直前の調整を戻す。
- `Clear`: 手動キーフレームを消去。
- `Export`: 調整済みJSONを書き出す。
- `Space`: 再生/停止。

`All` は全体補正、`From #n` は現在行以降の補正です。シーケンスバー上のストーンで補正前後の位置を見られます。

## License Safety

- 音源ファイルをAI学習に使わない。
- 音源波形をCodexやアプリ側で解析し直さない。
- ブラウザ上では音源を再生するだけにする。
- 演出タイミングは解析済みJSON、歌詞テキスト、手動マーカー、手動入力などから作る。
- 公開やイベント利用時は、素材とAPIの利用条件を確認する。

## Security Safety

- 既定の開発サーバーは `127.0.0.1` で使い、外部ネットワークへ公開しないでください。
- APIキー、秘密鍵、トークンを曲パッケージ、docs、プロンプト、ログに置かないでください。
- manifest内の曲素材パスは、既定でその曲パッケージ配下だけを読みます。
- system appのoriginを変える場合は、song-pack serverの `SONG_PACK_CORS_ORIGINS` も明示してください。
- 詳細は `docs/security.md` を参照してください。

## Workflow Map

主要な流れは `docs/workflows.html` で確認できます。

```text
http://127.0.0.1:5173/docs/workflows.html
```

表示内容は `docs/workflows.json` から読み込まれます。このJSONは、機能追加やバグ修正時にLLMへシステムの流れを説明するための共有資料としても使えます。

## Agent Context

Codexや別エージェントに作業を渡すときは、まず `AGENTS.md` を読ませます。

新しい曲を作る場合は、既存曲の中身を読ませず、次だけを入口にしてください。

```text
AGENTS.md
docs/system-overview.md
docs/song-authoring.md
docs/decisions.md
```

システム改修や既存機能の修正では、必要に応じて次も読みます。

```text
docs/architecture.md
docs/module-map.md
docs/plans.md
docs/known-issues.md
docs/handoff.md
docs/workflows.json
```

作業後は `docs/handoff.md` と、必要に応じて `docs/plans.md` / `docs/known-issues.md` / `docs/workflows.json` を更新してください。
