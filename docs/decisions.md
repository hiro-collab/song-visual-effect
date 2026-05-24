# Decisions

このファイルは、現在読み取れる設計判断と理由を記録します。不明な点は推測として明記します。

## D001: 音源波形を解析しない

決定:
音源ファイル自体をアプリやCodexで解析しない。映像タイミングはSongle/TextAlive由来のJSON、歌詞テキスト、手動マーカーから作る。

理由:
魔王魂の音楽はAI学習利用が禁じられているため。ブラウザ再生は行ってよいが、AI学習や波形解析に使わない方針を守る。

影響:
beat、chorus、歌詞タイミングの精度はJSONと手動調整に依存する。

## D002: `music_src` は廃止し、曲データ本体を `song-packs` に一本化する

決定:
`music_src` は今後廃止する。曲データの本体は `song-packs/<song-id>/` に一本化する。

理由:
歌詞、解析JSON、manifest、palette、markersを複数箇所に置くとズレが発生するため。曲パッケージを唯一のソースにした方が、別システムや別ランタイムへ持ち出しやすい。

影響:
Viteの `publicDir: "music_src"` 前提は見直す。システムは分離サーバー上のmanifestを標準入力にする。

## D003: 曲パッケージをmanifest中心にする

決定:
曲ごとの入口を `manifest.json` にし、歌詞、解析JSON、音源、クレジット、設計資料へのパスをmanifestに持たせる。

理由:
システム側に曲固有パスや曲名を固定しないため。別サーバーや別ランタイムへ持ち出しやすくするため。

## D004: システムは曲アプリを束縛しない

決定:
Webシステムは曲ごとの演出を決める親ではなく、補助ランタイムとして扱う。

理由:
曲ごとに求められる演出、UI、ランタイム、ライブ操作は大きく変わるため。別システムを使う可能性も許容する必要がある。

影響:
今後は曲側アプリが `system/kit` から必要なhelperだけをimportする方向へ寄せる。システムは再生、asset読み込み、保存、フレームループなどの能力を小さく提供する。

## D004a: 曲ごとの演出コードは曲パッケージ側へ寄せる

決定:
曲ごとの演出コードは、基本的に曲パッケージ側に置く。システム側は、ほとんどの曲で使う補助機能だけを提供する。

理由:
曲ごとに求められる構成、演出、JSON構造、文脈の持ち方が大きく変わることが予想されるため。システム側が文法や設定構成を固定すると、曲ごとの自由度を奪う。

影響:
fixture用の描画判断は `examples/fixtures/soft-light-player` に隔離する。システム本体は `transport`、`frame`、`assets`、`storage`、timing helper などのkitに留める。

## D004b: 描画方式をCanvas2Dに固定しない

決定:
システムはCanvas2Dを必須の描画方式として固定しない。曲adapterがCanvas2D、WebGL、DOM、SVGなどを選べる余地を残す。

理由:
曲ごとに必要な演出が大きく違うため。2D光表現にはCanvas2Dが合うが、別の曲ではWebGLやDOM表現が適切な場合がある。

## D004c: 歌詞タイミング編集はoptional toolにする

決定:
歌詞タイミング編集はシステム標準ツールとして残すが、必須機能ではなくoptional toolとして扱う。

理由:
歌詞がない曲、歌詞表示を使わない演出、別のタイミング構造を使う曲もありうるため。

## D004d: 外部Web adapterは共通フレームワークで自動実行しない

決定:
共通フレームワークは、外部URLからWeb adapter、演出コード、実行JSを自動で取得、dynamic import、iframe表示、遷移実行しない。外部URLは出典やライセンス確認の参照メモとしては許容するが、実行対象として扱わない。

現行実装:
manifestの `webAdapter` は同一ビルド内の `builtin:*` または `song:*` IDだけとして扱う。URLや相対パスをadapterコードとして解決する処理は持たない。

理由:
外部adapterは任意コード実行、CORS、信頼境界、保存APIとの関係を一段重くするため。外部ツールや外部入力との連携は曲側・show側で自由に設計できるが、共通フレームワークは誤って外部コードを実行する入口を持たない。

## D004e: 起動管理サーバーを検討する

決定:
分離サーバー前提にするが、複数サーバーを手作業で1つずつ起動する運用は避ける。起動用スクリプト、またはGUI付きの起動管理サーバーを検討する。

理由:
ライブ用途では起動ミスがトラブルになりやすい。fixture player、song-pack server、将来の保存APIなどをまとめて管理できる必要がある。

## D005: 歌詞タイミングはリロードなしで即時反映する

決定:
手動キーフレームと補正値を `workingLyrics` に反映し、表示歌詞とシーケンスバーを即時更新する。

理由:
ライブ調整では、JSONを書き換えてリロードする運用は遅い。再生中に調整結果が見える必要がある。

## D006: 操作はLyric Timingモードで明示的に切り替える

決定:
A/Dキーによる歌詞打刻や補正UIは、Lyric TimingモードがOnのときに扱う。

理由:
ライブ中の誤操作を減らすため。

## D007: ワークフロー地図をJSON駆動にする

決定:
`docs/workflows.json` に主要フローを記録し、`docs/workflows.html` で可視化する。

理由:
人間が流れを理解しやすくなるだけでなく、LLMに機能追加やバグ修正の文脈を渡しやすくなるため。

## D008: AGENTS.mdは小さくする

決定:
`AGENTS.md` は常時読む入口にし、詳細は `docs/` に分離する。

理由:
常時読む情報を大きくしすぎると、エージェントが重要な指示を見落としやすくなるため。詳細は必要時に読む形にする。

## D009: 単一親アプリ中心からkit中心へ移す

決定:
旧来の単一入口中心の構成から、`system/kit` と `examples/fixtures/soft-light-player` へ分ける。曲アプリは固定された親アプリに従うのではなく、必要なhelperだけを使う。

根拠:
ユーザーの方針として「システムは手助けに留め、曲ごとの演出を束縛しない」ことが明確になっているため。親アプリが太ると曲を従わせるフレームワークになりやすい。

## D010: 新しい曲作成時は既存曲を読まない

決定:
新しい曲のシステムや演出を作るときは、既存の `song-packs/*` を読まない。既存曲のmanifest、analysis、design、adapter、演出コードはテンプレートとして扱わない。

理由:
過去に作った曲の構成を見ると、新しい曲のデータ文法、演出、UI、描画方式が暗黙に引っ張られるため。曲ごとの自由な設計を守るには、system-neutral docsだけで作り始める必要がある。

影響:
新しい曲作成の入口は `docs/system-overview.md` と `docs/song-authoring.md` にする。既存曲を見るのは、その曲自体の修正、回帰確認、またはユーザーが明示的に許可した場合だけにする。

## D011: 既存fixture rendererも新曲の視覚テンプレートにしない

決定:
新しい曲の映像実装では、既存の `examples/fixtures/soft-light-player/renderers/*` や `examples/fixtures/soft-light-player/effects/*` を視覚テンプレートとして読まない。曲アプリを作る場合は、`templates/neutral-song-app/visual-brief.md` で主役構造を決め、必要なら空の `templates/neutral-song-app/adapter.ts` から始める。

理由:
既存の曲パッケージを読まなくても、fixture rendererの中央発光、放射線、光ネットワーク、粒子、グロー中心の構図に引っ張られることがあるため。曲ごとの自由な見た目を守るには、既存曲だけでなく既存fixtureの視覚文法からも距離を置く必要がある。

影響:
新曲作成時の入口に `docs/song-visual-independence.md` を加える。最初のプレビュー後は、構図、色、主役オブジェクト、線/光の使い方、カメラ視点が前作に似すぎていないか確認する。

## D012: Launch Managerは簡素な単一Launch Serverから始める

決定:
起動管理は、まずPC上に1つのLaunch Serverを立て、`launch/targets.json` に書かれたLaunch TargetとLaunch Setを起動、停止、監視する構成にする。

理由:
複数の曲用映像サーバー、fixture player、song-pack server、保存APIなどを同時に扱う必要がある一方、最初から複数Launch Server調停、delegated mode、自動port再割当、本格的なLAN操作卓、スマホ専用UIまで入れると構成が重くなり、使われなくなる可能性が高いため。

影響:
MVPではmanaged targetだけを扱う。Launch Manager UIは状態の正本を持たず、PC上のLaunch Serverへ操作要求を送るだけにする。曲ごとの映像構成やadapterはLaunch Manager側で決めない。詳細仕様は `docs/launch-manager-spec.md` に置く。

## D013: 曲固有データと曲固有adapterをsystem-wide領域へ置かない

決定:
曲固有のmanifest、analysis、design、再実装ブリーフ、演出コード、adapter登録は `song-packs/<song-id>/` または `song-packs/local-adapters.ts` に置く。`system/kit`、`examples/fixtures/soft-light-player`、`docs/` 直下には、曲IDを直書きした実装や曲専用ブリーフを増やさない。

理由:
system kitとfixture playerは曲を束縛しない補助領域であり、特定曲の構成や演出を混ぜると、新しい曲が既存曲の文法へ引っ張られるため。

影響:
ローカル開発で同一ビルド内の曲adapterを試す場合、曲adapter本体は `song-packs/<song-id>/adapter.ts` に置き、`song-packs/local-adapters.ts` だけに `song:<song-id>` の対応を追加する。`song-packs/local-adapters.ts` は `song:` IDだけを扱い、`builtin:` IDやURL/path形式は扱わない。fixture playerのbuiltin registryへ曲固有adapterを直接importしない。system-wide docsには必要最小限のポインタだけを残し、曲の設計メモは曲パック側へ置く。

## D014: このプロジェクトは曲別Web映像制作キットとして扱う

決定:
このプロジェクトは、OSや巨大ミドルウェアではなく、ブラウザで動く曲別映像を作るための制作キット、検証環境、便利道具箱として扱う。

理由:
最終的な再生先はTouchDesigner、Unity、OBS、自作VJツールなど複数ありうる。特定ツールを中心に置くと、曲ごとの自由な再生、連携、調整の余地を狭めるため。

影響:
system側は薄い補助に留める。TouchDesignerやUnityとの連携は、曲パックまたは任意のshow-profile側で扱う。詳細は `docs/project-scope.md` に置く。

## D015: show-profileは任意のイベント運用層にする

決定:
`show-profile` は、複数曲をイベント、展示、ライブ、検証会でどう並べ、どう起動し、どう調整し、どう外部ツールとつないだかを記録する任意の運用層にする。

理由:
13曲連続イベントのように、曲ごとの自由とイベント全体の共通運用を両立する必要があるため。ただし、イベントごとの運用方法は多様なので、曲パックやsystemに強制する規格にはしない。

影響:
Launch Managerはshow-profileがあればセットリスト表示などを補助してよいが、show-profileが無くても曲パック単体は動く。未知の項目は無視してよい。曲パックとshow-profileは任意で `capabilities` を持てるが、これは機能を有効化する設定ではなく、外部入力、LAN操作、外部ツール連携などを人間に伝えるための記入例ベースのメモとして扱う。

## D016: Launch Managerは検証補助を主役にする

決定:
Launch Managerは、曲パックの単体起動確認、任意show-profileのセットリスト確認、サーバー状態やログ確認を担う軽い起動補助画面にする。本番VJ卓や外部連携本体にはしない。

理由:
Launch Managerが本番切替、TouchDesigner専用操作、Unity専用操作、複雑なタイムライン編集まで背負うと、systemが重くなり、曲ごとの自由を奪いやすいため。

影響:
Launch Managerへ追加する機能は、制作、検証、当日確認に寄せる。外部連携本体は曲パック、bridge、show-profile側へ逃がす。

## D017: 互換性は統合時の検査、変換、警告を重視する

決定:
過去形式の永久実行保証は目標にしない。代わりに、複数担当が別々のkit時期で作った曲パックをイベント統合するとき、古い形式や不足を検出し、可能なら正規化、変換し、無理なら明示的に警告する方針にする。

理由:
曲ごとの自由度が高いため、全世代のadapter APIやplayerを完全互換にするとsystemが重くなる。一方で、イベント統合時に何が噛み合っていないか分かることは重要なため。

影響:
`schemaVersion` を置き、無い場合は `1` として扱う。未知の項目は無視し、既存項目の意味を変えない。必要に応じてloader正規化、`song:validate` 警告、migration scriptを追加する。

## D018: ライブ/VJ再生はDeck A/Bを標準にする

決定:
ライブ/VJ運用では、標準の再生単位としてDeck A/Bを使う。Deckは曲そのものではなく、独立したplayer server、選択中の曲manifest、output URL、将来のDeck-local stateを持つ再生台です。標準サポートは2つのDeckとし、内部実装は将来Deck C/Dへ広げやすい配列/map構造を推奨する。

理由:
一方の映像を出しながら、もう一方の映像を準備し、TouchDesigner、OBS、Unity、自作VJツールなど外部側で合成やクロスフェードを行う運用が想定されるため。映像時間、歌詞補正、ライブ操作を将来入れる場合も、Deckごとに状態を分ける方が混乱しにくい。

影響:
Launch ManagerはDeckごとの起動、停止、曲選択、URL copy/open、status表示を補助する。Song Data Serverは共有でよい。Music Effect標準はクロスフェード、音声ミックス、program/previewの最終切替を背負わない。現在の単一player flowはDeck A互換として扱い、詳細仕様は `docs/deck-playback.md` に置く。
