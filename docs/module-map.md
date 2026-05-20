# Module Map

このファイルは、リポジトリ内の主要ディレクトリとファイルの役割を説明します。

## ルート

- `AGENTS.md`: Codex/エージェント向けの常時指示。詳細は `docs/` へ誘導する。
- `README.md`: 人間向けの起動方法、素材配置、利用方法。
- `index.html`: アプリのDOM骨格。Canvas、Audio、歌詞表示、操作UIを置く。
- `package.json`: npm scriptsと依存関係。
- `vite.config.mjs`: Vite設定。曲データは別サーバーで配信するため、ViteのpublicDirは無効化している。

## src

- `src/main.ts`: system hostの入口。DOM取得、起動、入力登録、transport、song adapter、optional toolを接続する。
- `src/styles.css`: アプリ本体の見た目。Canvas上の歌詞、操作バー、Lyric Timingパネル、シーケンスバーなど。
- `src/types.ts`: MusicMap、SongManifest、歌詞、beat、markersなどの型定義。

## src/runtime

- `src/runtime/dom.ts`: system appのDOM要素を取得する。
- `src/runtime/transport.ts`: 再生、停止、シーク、現在時刻を扱う。
- `src/runtime/frameLoop.ts`: `requestAnimationFrame` によるフレーム更新。
- `src/runtime/safeFetch.ts`: manifestや曲素材を安全に読むためのURL検証、パッケージ境界チェック、サイズ上限つきfetch。
- `src/runtime/songAdapterContext.ts`: 曲adapterへ渡す補助context。manifest、base URL、曲パッケージ内asset readerを持つ。

## src/adapters

- `src/adapters/types.ts`: system hostと曲adapterの最小インターフェース。
- `src/adapters/registry.ts`: 同一ビルド内の `builtin:` adapterだけを選択する。外部adapterはまだ読み込まない。
- `src/adapters/builtin/fixtureSoftLight.ts`: 既存fixture rendererをadapterとして包む。
- `src/adapters/builtin/trafficJam.ts`: `design.cues` を曲専用文法として読み、Traffic Jam向けにchorus候補と間奏強調を解釈する。

## src/data

- `src/data/assets.ts`: manifestと曲パッケージを読み、アプリ内部で使う `MusicMap` に変換する。既存曲へ暗黙フォールバックしない。

## src/music

- `src/music/timing.ts`: beat、chorus、lyricsなどの時刻検索。

## src/renderers

- `src/renderers/softLightRenderer.ts`: 現在同梱しているfixture用の柔らかい光表現。新しい曲のテンプレートではない。

## src/effects

- `src/effects/damping.ts`: `DampValue`、`clamp`、`smoothstep`、`decayPulse` などの数値制御。
- `src/effects/palette.ts`: paletteから色rampを作る。柔らかい色変化に使う。
- `src/effects/particles.ts`: 背景粒子の描画。
- `src/effects/lightNetwork.ts`: 動点と線を使った光線ネットワーク。

## src/lyrics

- `src/lyrics/manualTiming.ts`: 手動歌詞キーフレーム、全体/範囲補正、Export用JSON生成。

## src/tools

- `src/tools/lyricTimingTool.ts`: 歌詞タイミング編集UI。system hostのoptional tool。

## song-packs

分離構成用の曲パッケージ置き場です。ここを曲データの本体にします。

重要:

- 既存の曲パッケージはテンプレートではない。
- 新しい曲を作るときは、既存の `song-packs/*` を読まない。
- 曲ごとの構成、JSON文法、UI、演出コード、描画方式は自由に変えてよい。
- Web system hostで読む場合は、入口としてmanifest URLを渡す。
- `song-packs/*/audio/`: ローカル音源配置用。音源ファイルはコミットしない。

## scripts

- `scripts/download-songle-json.ps1`: Songle Widget APIからJSONを取得するPowerShellスクリプト。許可URL、保存先、取得対象、最大サイズを検証し、取得後に曲長、拍数、BPM、サビ候補を要約する。
- `scripts/serve-song-packs.mjs`: `song-packs` をCORSつきで配信する静的サーバー。
- `scripts/dev-manager.mjs`: system server と song-pack server をまとめて起動・停止する起動管理サーバー。

## docs

- `docs/system-overview.md`: 特定曲に依存しないシステム概要。
- `docs/song-authoring.md`: 新しい曲を作るときのアンカー回避ルール。
- `docs/architecture.md`: 全体構成と処理の流れ。
- `docs/module-map.md`: このファイル。ディレクトリとファイルの役割。
- `docs/decisions.md`: 設計判断と理由。
- `docs/security.md`: ローカル開発サーバー、manifest、曲素材、Songle取得ツールの信頼境界と対策。
- `docs/plans.md`: 今後の作業候補。
- `docs/known-issues.md`: 既知の問題と注意点。
- `docs/handoff.md`: 次のCodexスレッドへ渡す要約。
- `docs/workflows.json`: LLM共有用のフロー定義。
- `docs/workflows.html`: `workflows.json` を可視化する単一HTMLページ。

## .codex

- `.codex/shared_note.md`: 作業中に共有してきた設計メモ。
- `.codex/log.md`: 実装履歴のログ。

`docs/` が今後の正式な引き継ぎ先で、`.codex/` は作業メモとして扱います。
