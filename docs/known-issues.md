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

## fixture rendererはexamplesに隔離したが、まだ目立ちやすい

既存曲パッケージを読まなくても、fixture rendererやサンプル実装の視覚文法に引っ張られることがあります。

実際に、`codex/traffic-jam-effect` の `81876a7 Add traffic jam visual adapter` は、中央収束、放射線、グロー、光ネットワークの構図が前作に近くなったため採用しません。

現在同梱している柔らかい光表現は、`examples/fixture-player/` にあります。

曲実装担当からのフィードバック:

- 既存 `song-packs/*` を読まなくても、fixture rendererの中央発光、放射線、光ネットワーク、グローに引っ張られることがある。
- 「既存曲を読まない」だけでなく、「既存fixture rendererを視覚テンプレートにしない」ルールが必要。

現在の対策:

- 煮ル果実「トラフィック・ジャム」の再実装方針を `docs/traffic-jam-redo-brief.md` に分離した。
- `docs/song-visual-independence.md` を追加した。
- `templates/neutral-song-app/` に空のadapter scaffoldとvisual briefを追加した。

注意:

- `sync:check` に `codex/traffic-jam-effect 81876a7` が表示されても、その通知は破棄予定の古い実装です。取り込まないでください。

次の改善:

- READMEやdocsで、fixture playerが新しい曲のテンプレートではないことを維持する。
- 必要なら `examples/` をさらに別パッケージ扱いにする。

## 曲専用cue JSONはsystem kitでは解釈しない

`manifest.json` の `design.cues` は、曲adapter contextから `readDesignCues()` で読めるようになりました。

影響:

- 曲ごとの自由なcue文法はsystem kit側で固定解釈しない。
- 現行のfixture adapterは `design.cues` を演出に反映しない。
- 曲専用cueは、今後も曲アプリが解釈する必要があります。

次の改善:

- `markers` は共通/簡易表示用、`design.cues` は曲専用文法として分け続ける。

## fixture playerの責務分離は進行中

起動、入力登録、transport、renderer、tool接続の中心は `examples/fixture-player/main.ts` です。これはfixture player内の都合であり、system kitの標準構成ではありません。

次の改善:

- fixture player側の入力処理を小さく分ける。
- system kitの公開API入口は `system/kit/index.ts` に置いた。今後は公開しすぎないように保つ。

## 起動管理はまだローカル開発向け

`npm run dev` で起動管理サーバーを使えますが、まだローカル開発向けの最小実装です。

現在の対策:

- loopback host以外へのbindを起動時に拒否する。
- 状態変更APIは同一origin相当のブラウザリクエストだけを受け付ける。
- ログはHTMLとして解釈せず、テキストとして表示する。

次の改善:

- fixture player、song-pack server、保存APIの状態を一覧できるようにする。
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

## ローカルサーバーの公開リスク

song-pack serverは、ローカル曲パッケージをブラウザへ配信します。

現在の対策:

- CORSは既定でfixture playerのoriginだけを許可する。
- 隠しファイルと未許可拡張子は配信しない。
- URLデコード失敗や不正な範囲リクエストはエラーとして扱う。

注意:

- `SONG_PACK_HOST=0.0.0.0` のような外部公開設定は起動時に拒否される。
- fixture playerのoriginを変えたら `SONG_PACK_CORS_ORIGINS` を明示する。
