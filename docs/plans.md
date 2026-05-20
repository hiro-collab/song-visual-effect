# Plans

今後の作業候補を、小さい実装単位で整理します。

## P0: 現在の土台を安定させる

- `docs/workflows.html` / `docs/workflows.json` を必要に応じて更新する。
- `AGENTS.md` と `docs/handoff.md` を作業後に更新する運用を定着させる。
- `docs/system-overview.md` と `docs/song-authoring.md` を、新しい曲作成時の中立入口として維持する。
- 新しい曲作成では既存の `song-packs/*` を読まない運用を守る。
- 歌詞タイミングJSONの更新手順を明確にする。
- 仕様変更前のドキュメント追加分をコミット済み。

確認方法:

- `npm run build`
- `http://127.0.0.1:5173/docs/workflows.html`
- `http://127.0.0.1:5173/?song=<manifest-url>`

## P1: 曲に依存しないsystem hostを維持する

目的:
`src/main.ts` と周辺runtimeを、曲に依存しない補助ランタイムへ近づける。

現状:

- `src/runtime/transport.ts`: 再生、停止、現在時刻、シーク。
- `src/runtime/frameLoop.ts`: `requestAnimationFrame` の登録とtick管理。
- `src/runtime/dom.ts`: DOM要素取得。
- `src/tools/lyricTimingTool.ts`: optional lyric timing tool。

次の候補:

- `src/runtime/input.ts`: キー、ポインタ、ボタン入力。
- `src/runtime/surface.ts`: 表示領域、fullscreen。
- fixture rendererを曲adapter候補へ切り出す。

非目的:

- この段階では見た目を大きく変えない。
- 新しい依存ライブラリは追加しない。

## P2: `song-packs` を曲データの唯一の本体にする

目的:
`music_src` を廃止し、曲素材の重複管理をなくす。

作業候補:

- `vite.config.mjs` の `publicDir: "music_src"` 前提を外す。完了。
- `loadMusicMap()` を分離サーバーmanifest前提へ寄せる。完了。
- `music_src` の互換フォールバックを削除する。完了。
- 音源ファイルをコミットしない方針は維持する。

非目的:

- いきなり外部Web adapterの任意コード読み込みはしない。
- 曲パッケージのJSONスキーマを過度に固定しない。

## P3: 曲別Web adapterを導入する

目的:
曲固有の演出判断を曲パッケージ側へ移す。

案:

新しい曲を作るときは既存曲のadapterを読まず、曲ごとに空の設計から始める。

インターフェース案:

```ts
export function createSongApp(context) {
  context.frame.onFrame(({ time, dt }) => {
    // 曲固有の演出をここで決める
  });
}
```

非目的:

- Web以外のadapterをこの段階で実装しない。
- 別サーバーから任意のadapterコードを読み込まない。
- 既存の歌詞タイミング編集機能を壊さない。

次段階:

- 安全な外部adapter読み込み方式を設計する。
- `song-packs/<song-id>/adapters/web/` への移動を検討する。
- manifestの `design.cues` のような曲専用cue JSONを、system hostが固定スキーマへ潰さずadapterへ渡せるようにする。初期helperは実装済み。
- adapterには `MusicMap` だけでなく、raw manifest、base URL、任意の曲所有JSONを安全に読むためのhelperを渡す。初期helperは実装済み。

## P3a: 曲専用cueとfixture向けmarkersを分離する

目的:
曲ごとに自由な演出cueを持てるようにしつつ、現在のfixture renderer向け `markers` と混同しない。

現状:

- `MusicMap.markers` は `warmSections` / `lineEmphasis` など、現在のrenderer寄りの形になっている。
- 新しい曲では、間奏、バッシング、視線、衝突ブローなど、曲専用のcue文法が必要になる。
- `manifest.design.cues` は `SongAdapterContext.assets.readDesignCues()` で読み込める。

候補:

- 曲adapter実装を導入し、`SongManifest.design.cues` を曲側の文法として解釈する。
- system共通の `markers` は後方互換/簡易renderer用に残す。
- 曲専用cueはschema名だけ確認し、中身は曲adapterが解釈する。
- Songle由来の拍/サビと、手動で打つキック/ブロー/歌詞アクセントを別レイヤーとして扱う。

## P4: 起動管理を追加する

目的:
system server、song-pack server、将来の保存APIを手作業で1つずつ起動しなくてよいようにする。

候補:

- まずは `npm run dev` でローカル起動管理サーバーを立てる。完了。
- さらに必要ならGUI付きランチャー。

リスク:

- プロセス終了処理。
- ポート競合。
- ログ表示。
- ライブ前の状態確認。

## P5: 保存APIを追加する

目的:
ライブ調整した `lyrics_timing.json` をExportだけでなく、曲パッケージ側へ保存できるようにする。

候補:

- `scripts/serve-song-packs.mjs` に限定的なPOST保存APIを追加する。
- 保存対象を `analysis/lyrics_timing.json` に限定する。
- 安全面のためローカル開発用途に限定する。

リスク:

- ブラウザから任意ファイルを書ける設計にしないこと。
- 保存前にバックアップを作るか検討すること。

## P6: ライブ用操作を増やす

候補:

- BPM表示。
- グローバルタイミング微調整。
- 色味プリセット。
- 雰囲気切り替え。
- 操作が増えた場合のメニューバー/ドロップダウン整理。

非目的:

- ショートカットキーを増やしすぎない。
- 初期画面をライブ中に読みにくくしない。

## P7: 別ランタイムadapterの検討

候補:

- TouchDesigner用cue export。
- Unity用JSON schema。
- OBS/browser source向け軽量モード。

この段階では、Webシステムを唯一の実行環境として固定しないことが重要。

## P8: Songle取得ツールを改善する

目的:
新しい曲パッケージ作成時に、必要なSongle JSONだけを安全に取得しやすくする。

現状:

- `scripts/download-songle-json.ps1` は `-Targets` と `-SkipMelody` で取得対象を選べる。
- `SongId`、`SongUrl`、target名は検証される。
- 取得したJSONはUTF-8で構文検証してから保存する。

候補:

- 取得後に、拍数、推定BPM、サビ候補、認識日時を短く表示する。
- `manifest.json` のanalysis欄を生成する補助オプションを検討する。
- セキュリティ専用レビューで、許可URL、最大サイズ、保存先、ログ出力を再確認する。
