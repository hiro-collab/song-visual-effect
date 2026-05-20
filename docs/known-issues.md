# Known Issues

## 歌詞タイミングの元データ精度

Songleに登録されている歌詞タイミングは、曲によって大きくずれることがあります。

現在の対策:

- A/Dキーで手動キーフレームを打つ。
- `All` で全体を前後に送る。
- `From #n` で現在歌詞以降を前後に送る。
- シーケンスバー上のストーンで変化を可視化する。

## 音源ファイルの扱い

音源ファイルはライセンス上コミットしません。ローカル配置のみです。

注意:

- `song-packs/*/audio/*` も `.gitignore` で除外されています。
- 音源波形を解析しないでください。

## `src/main.ts` が大きい

現状では、起動、入力、再生、描画、歌詞調整UIが `src/main.ts` に集まっています。

次の改善:

- `core/transport`
- `core/frameLoop`
- `core/input`
- `tools/lyricTimingEditor`
- `tools/sequenceBar`

へ段階的に分離する。

## 起動管理はまだローカル開発向け

`npm run dev` で起動管理サーバーを使えますが、まだローカル開発向けの最小実装です。

次の改善:

- system server、song-pack server、保存APIの状態を一覧できるようにする。
- ポート競合や起動失敗を見つけやすくする。
- サービス停止時に子プロセスをより確実に終了する。

## 曲固有演出がまだシステム側にある

Shining Star向けの柔らかい光表現は、現在 `src/main.ts` と `src/effects/` に寄っています。

次の改善:

- 曲側Web adapterを導入する。
- システムは補助contextだけを提供する。

## `docs/workflows.html` は静的ドキュメント

ワークフロー地図は現状、手動更新のJSONです。コードから自動生成されるものではありません。

注意:

- 構成変更や主要フロー変更をしたら `docs/workflows.json` を更新してください。

## 保存APIは未実装

現状の歌詞タイミング保存は、localStorageとExportが中心です。

次の改善:

- ローカル限定の保存APIを検討する。
- 任意ファイル書き込みにならないように制限する。
