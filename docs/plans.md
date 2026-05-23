# Plans

今後の作業候補を、小さい実装単位で整理します。

## P0: 現在の土台を安定させる

- `docs/workflows.html` / `docs/workflows.json` を必要に応じて更新する。
- `AGENTS.md` と `docs/handoff.md` を作業後に更新する運用を定着させる。
- `docs/README.md` をdocs内の読み分け入口として維持する。
- `docs/system-overview.md` と `docs/song-authoring.md` を、新しい曲作成時の中立入口として維持する。
- 新しい曲作成では既存の `song-packs/*` を読まない運用を守る。
- 歌詞タイミングJSONの更新手順を明確にする。
- `docs/security.md` の信頼境界とローカルサーバー運用ルールを維持する。
- 仕様変更前のドキュメント追加分をコミット済み。

確認方法:

- `npm run build`
- `http://127.0.0.1:5173/docs/workflows.html`
- `http://127.0.0.1:5173/?song=<manifest-url>`

## P1: 曲に依存しないsystem kitを維持する

目的:
曲に依存しない補助機能を `system/kit` に集約し、fixture playerを `examples/fixture-player` に隔離する。

現状:

- `system/kit/transport.ts`: 再生、停止、現在時刻、シーク。
- `system/kit/frameLoop.ts`: `requestAnimationFrame` の登録とtick管理。
- `system/kit/assets.ts`: manifest読み込みとMusicMap変換。
- `system/kit/songAdapterContext.ts`: 曲アプリ用のasset reader。
- `examples/fixture-player/`: 動作確認用プレイヤー。新しい曲のテンプレートではない。

次の候補:

- `system/kit/index.ts` で公開API入口を明示した。今後はここを太らせすぎず、必要なhelperだけをexportする。
- fixture playerのUIやrendererをさらに「例」として隔離する。`examples/fixture-player/README.md` で標準テンプレートではないことを明示済み。
- 曲アプリ雛形を作る場合も、既存曲やfixture rendererではなく `templates/neutral-song-app/` の空scaffoldから始める。
- `docs/song-visual-independence.md` の前作似チェックを新曲実装フローに組み込む。

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
既存fixture rendererも視覚テンプレートとして読まず、必要なら `templates/neutral-song-app/adapter.ts` の空ループから始める。

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
- manifestの `design.cues` のような曲専用cue JSONを、system kitが固定スキーマへ潰さず曲アプリへ渡せるようにする。初期helperは実装済み。
- adapterには `MusicMap` だけでなく、raw manifest、base URL、任意の曲所有JSONを安全に読むためのhelperを渡す。初期helperは実装済み。
- 同一ビルド内で曲固有adapterを試す場合、曲adapter本体と登録は `song-packs/` 側に置き、fixture playerのbuiltin registryへ曲IDを直接追加しない。外部adapter読み込みはまだ無効。

## P3a: 曲専用cueとfixture向けmarkersを分離する

目的:
曲ごとに自由な演出cueを持てるようにしつつ、現在のfixture renderer向け `markers` と混同しない。

現状:

- `MusicMap.markers` は `warmSections` / `lineEmphasis` など、現在のrenderer寄りの形になっている。
- 新しい曲では、間奏、バッシング、視線、衝突ブローなど、曲専用のcue文法が必要になる。
- `manifest.design.cues` は `SongAdapterContext.assets.readDesignCues()` で読み込める。
- fixture playerは曲専用cueを標準解釈しない。曲ごとのcue文法は曲アプリ側で扱う。

候補:

- 曲アプリ実装を作る場合、`SongManifest.design.cues` を曲側の文法として解釈する。
- kit共通の `markers` は後方互換/簡易renderer用に残す。
- 曲専用cueはschema名だけ確認し、中身は曲アプリ/adapterが解釈する。
- Songle由来の拍/サビと、手動で打つキック/ブロー/歌詞アクセントを別レイヤーとして扱う。

## P4: 起動管理を追加する

目的:
fixture player、song-pack server、曲ごとの映像サーバー、将来の保存APIを手作業で1つずつ起動しなくてよいようにする。

状態:
MVP実装済み。`scripts/dev-manager.mjs` は互換入口として残し、実体は `scripts/launch-manager/` に分割した。`launch/targets.json` のTarget/SetをLaunch Manager GUI/APIから起動、停止、監視できる。

仕様:

- 簡素版の正本は `docs/launch-manager-spec.md`。
- 最初は「PC上に1つのLaunch Server + targets.json + 起動カード一覧」とする。
- 複数Launch Server調停、attached/delegated、自動port再割当、LAN公開、スマホ専用UIはMVPに含めない。

候補:

- まずは `npm run dev` でローカル起動管理サーバーを立てる。完了。
- `DEV_MANAGER_PORT`、`PLAYER_PORT`、`SONG_PACK_PORT` でworktreeごとにポートをずらせる。完了。
- 既存 `scripts/dev-manager.mjs` を互換入口として残しつつ、`scripts/launch-manager/` へ分割する。完了。
- Launch ManagerのHTTP APIと管理画面HTMLを `server.mjs` / `ui.mjs` に分ける。完了。
- `launch/targets.json` を導入し、targetとsetを宣言的に管理する。完了。
- GUIでtarget/setの起動、停止、再起動、全停止、PID/port/log/resourceを確認できるようにする。完了。
- 次段階では、曲ごとの映像サーバーや保存APIをTargetとして追加する。

リスク:

- プロセス終了処理。
- ポート競合。
- ログ表示。
- ライブ前の状態確認。
- Launch Serverを太らせすぎて、曲側の自由な構成を束縛すること。

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
- 最大サイズと保存先境界を確認してから `song-packs/<song-id>/analysis/` へ保存する。

候補:

- 取得後に、拍数、推定BPM、サビ候補、認識日時を短く表示する。
- 取得後の拍数、推定BPM、サビ候補、認識日時の表示は実装済み。
- `manifest.json` のanalysis欄を生成する補助オプションを検討する。
- 許可URL、最大サイズ、保存先、ログ出力の条件を変更した場合は `docs/security.md` も更新する。
