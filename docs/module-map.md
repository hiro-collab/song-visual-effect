# Module Map

このファイルは、リポジトリ内の主要ディレクトリとファイルの役割を説明します。

## ルート

- `AGENTS.md`: Codex/エージェント向けの常時指示。詳細は `docs/` へ誘導する。
- `README.md`: 人間向けの起動方法、素材配置、利用方法。
- `index.html`: アプリのDOM骨格。Canvas、Audio、歌詞表示、操作UIを置く。
- `package.json`: npm scriptsと依存関係。
- `vite.config.mjs`: Vite設定。曲データは別サーバーで配信するため、ViteのpublicDirは無効化している。

## src

- `src/main.ts`: 現在の中心ファイル。DOM取得、起動、入力登録、再生制御、フレームループ、歌詞表示、Canvas描画、歌詞タイミングUIをまとめる。
- `src/styles.css`: アプリ本体の見た目。Canvas上の歌詞、操作バー、Lyric Timingパネル、シーケンスバーなど。
- `src/types.ts`: MusicMap、SongManifest、歌詞、beat、markersなどの型定義。

## src/data

- `src/data/assets.ts`: manifestと曲パッケージを読み、アプリ内部で使う `MusicMap` に変換する。Songle JSONの形のゆらぎもここで吸収する。

## src/effects

- `src/effects/damping.ts`: `DampValue`、`clamp`、`smoothstep`、`decayPulse` などの数値制御。
- `src/effects/palette.ts`: paletteから色rampを作る。柔らかい色変化に使う。
- `src/effects/particles.ts`: 背景粒子の描画。
- `src/effects/lightNetwork.ts`: 動点と線を使った光線ネットワーク。

## src/lyrics

- `src/lyrics/manualTiming.ts`: 手動歌詞キーフレーム、全体/範囲補正、Export用JSON生成。

## song-packs

分離構成用の曲パッケージ置き場です。ここを曲データの唯一の本体にします。

- `song-packs/shining-star/manifest.json`: 分離サーバーで読む曲manifest。
- `song-packs/shining-star/CREDITS.md`: 曲のクレジットとライセンス注意。
- `song-packs/shining-star/Lyrics.txt`: 曲ごとの歌詞。
- `song-packs/shining-star/analysis/*.json`: 曲ごとの解析JSONと調整済み歌詞タイミング。
- `song-packs/shining-star/design/`: 演出意図やcue定義。
- `song-packs/shining-star/audio/`: ローカル音源配置用。音源ファイルはコミットしない。

## scripts

- `scripts/download-songle-json.ps1`: Songle Widget APIからJSONを取得するPowerShellスクリプト。
- `scripts/serve-song-packs.mjs`: `song-packs` をCORSつきで配信する静的サーバー。
- `scripts/dev-manager.mjs`: system server と song-pack server をまとめて起動・停止する起動管理サーバー。

## docs

- `docs/architecture.md`: 全体構成と処理の流れ。
- `docs/module-map.md`: このファイル。ディレクトリとファイルの役割。
- `docs/decisions.md`: 設計判断と理由。
- `docs/plans.md`: 今後の作業候補。
- `docs/known-issues.md`: 既知の問題と注意点。
- `docs/handoff.md`: 次のCodexスレッドへ渡す要約。
- `docs/workflows.json`: LLM共有用のフロー定義。
- `docs/workflows.html`: `workflows.json` を可視化する単一HTMLページ。
- `docs/effect_design.md`: Shining Star向けの演出意図。

## .codex

- `.codex/shared_note.md`: 作業中に共有してきた設計メモ。
- `.codex/log.md`: 実装履歴のログ。

`docs/` が今後の正式な引き継ぎ先で、`.codex/` は作業メモとして扱います。
