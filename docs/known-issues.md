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

## 既存曲がテンプレートに見える危険

`song-packs/*` に実例が置かれているため、新しい曲を作るときに既存曲の構成へ引っ張られる危険があります。

現在の対策:

- `docs/system-overview.md` を特定曲に依存しない入口にする。
- `docs/song-authoring.md` に「既存曲を見ずに作る」ルールを書く。
- `AGENTS.md` に、新しい曲作成時は既存の `song-packs/*` を読まないと明記する。
- 既存曲はテンプレートではなくfixtureとして扱う。

## fixture rendererがまだsystem側にある

現在同梱している柔らかい光表現は、`src/renderers/softLightRenderer.ts` と `src/effects/` にあります。

次の改善:

- fixture rendererを曲側adapter候補として切り出す。
- system hostは補助contextだけを渡す形に近づける。

## `src/main.ts` の責務分離は進行中

起動、入力登録、transport、renderer、tool接続の中心は `src/main.ts` です。以前より小さくなっていますが、入力やsurfaceはさらに分けられます。

次の改善:

- `src/runtime/input.ts`
- `src/runtime/surface.ts`
- 曲adapter接続層

へ段階的に分離する。

## 起動管理はまだローカル開発向け

`npm run dev` で起動管理サーバーを使えますが、まだローカル開発向けの最小実装です。

次の改善:

- system server、song-pack server、保存APIの状態を一覧できるようにする。
- ポート競合や起動失敗を見つけやすくする。
- サービス停止時に子プロセスをより確実に終了する。

## `docs/workflows.html` は静的ドキュメント

ワークフロー地図は現状、手動更新のJSONです。コードから自動生成されるものではありません。

注意:

- 構成変更や主要フロー変更をしたら `docs/workflows.json` を更新してください。

## 保存APIは未実装

現状の歌詞タイミング保存は、localStorageとExportが中心です。

次の改善:

- ローカル限定の保存APIを検討する。
- 任意ファイル書き込みにならないように制限する。
