# System Overview

この文書は、特定の曲パッケージを読まずにシステム全体を把握するための中立的な入口です。

既存の曲パッケージは実例であって、次の曲の設計テンプレートではありません。新しい曲を作るときは、まずこの文書と `docs/song-authoring.md` を読み、既存の `song-packs/*` の構成を参照しないでください。

同じ理由で、`examples/fixtures/soft-light-player` のsoft light rendererやeffect群も新曲の視覚テンプレートではありません。新しい曲の見た目を作る場合は、`docs/song-visual-independence.md` と `templates/neutral-song-app/` から始めてください。

## 目的

このリポジトリのシステム側は、曲ごとの演出を決める親ではなく、曲アプリを支える補助kitです。

システム側が提供するもの:

- 開発用の起動管理。
- 曲パッケージ配信用の静的サーバー。
- ブラウザ上の再生、停止、シーク、現在時刻のhelper。
- フレームループhelper。
- 曲データを読むための最小限のmanifest読み込み。
- 曲パッケージ内assetを安全に読むhelper。
- 歌詞タイミング編集のデータ処理helper。
- 動作確認用のfixture player。

システム側が決めないもの:

- 曲の演出思想。
- 曲固有のデータ構造。
- 曲固有のJSON文法。
- 曲固有のUI。
- 描画方式。
- Canvas2D、WebGL、SVG、DOMなどの選択。
- このWebシステムを使うか、別ランタイムを使うか。

## 境界

```text
song application or fixture player
  imports helper functions from system/kit

system/kit
  transport / frame / assets / timing / manual timing data
```

曲アプリは `system/kit` から必要なものだけをimportします。使わないhelperがあっても構いません。

曲側の自由度を守るため、システム文書では既存曲の内部構成を標準として説明しません。既存曲は動作確認用のfixture、または具体例としてだけ扱います。

## 起動構成

開発時は、起動管理サーバーが複数のローカルサーバーをまとめて管理します。

```text
dev manager
  ↓ starts/stops
fixture player server
song package server
```

通常は次で起動します。

```powershell
npm run dev
```

起動管理画面:

```text
http://127.0.0.1:<manager-port>/
```

実際のportはworktreeごとに自動割当され、GUI下部と `.codex/runtime/ports.json` に表示されます。

同梱のfixture playerは `?song=<manifest-url>` で曲パッケージの入口を受け取ります。manifest URLがない場合、特定の曲を自動選択せず、起動エラーとして扱います。

## 曲パッケージの最小契約

曲パッケージの構成は曲ごとに変えてよいです。ただし、同梱のfixture playerで読む場合は、入口としてmanifestが必要です。

最小manifestの考え方:

```json
{
  "id": "song-id",
  "title": "Song Title",
  "artist": "Artist",
  "duration": 180
}
```

必要に応じて、歌詞、解析JSON、音源、クレジット、Web adapter IDなどを足します。これらのパスやJSON構造は、曲の都合に合わせて設計して構いません。現行のWeb adapterは同一ビルド内の `builtin:*` / `song:*` IDだけを解決し、URLや相対パスのadapterコードは読み込みません。

中立的な雛形だけを作る場合は `npm run song:scaffold` を使えます。このコマンドは既存曲を読まず、manifest、analysis、design、README、CREDITSの空に近い出発点を作ります。

公式URL、MV、歌詞考察などを参照した場合は、曲パック内の `references.json` にURLと参照用途だけを記録します。歌詞本文、記事本文、画像、スクリーンショットは保存せず、`npm run song:validate -- --id <song-id>` で確認します。

## 既存曲との関係

既存の `song-packs/*` は、次の用途にだけ使います。

- その曲自体の修正。
- システム変更後の回帰確認。
- ユーザーが明示的に「この曲を参考に」と言った場合。

新しい曲を作るときには使いません。過去の曲の構造を見てから作り始めると、曲ごとの自由な設計が弱くなるためです。

## ライセンス安全

- 音源ファイルをAI学習に使わない。
- 音源波形をCodexやアプリで解析しない。
- 音源はブラウザ再生用としてだけ扱う。
- 歌詞ファイルはUTF-8として扱う。
- 公開やイベント利用時は、各素材とAPIの利用条件を確認する。
