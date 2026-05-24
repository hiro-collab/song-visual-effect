# Deck Playback Spec

この文書は、ライブ/VJ運用で複数の曲映像を準備、切替、外部ツールへ渡すためのDeck再生仕様です。

現時点では次の実装方針を定める仕様書です。既存の単一再生画面は、Deck Aだけを使う互換的な形として扱います。

## 目的

Music Effectは本番のVJ卓やミキサーそのものにはなりません。曲ごとのWeb映像を、TouchDesigner、OBS、Unity、自作ツールなどが読み込めるURLとして安定して出すことを助けます。

ライブでは、片方の映像を表示しながらもう片方の映像を準備し、外部ツール側でクロスフェードや合成を行うことがあります。そのため、標準の起動補助としてDeck A / Deck Bの2つの独立した再生単位を用意します。

## 用語

### Deck

Deckは、独立した再生単位です。曲そのものではなく、「あるplayer server上で、ある曲manifest URLを開いている再生台」を指します。

Deckごとに持つもの:

- deck id。例: `deck-a`、`deck-b`。
- 表示名。例: `Deck A`、`Deck B`。
- player server port。
- player server status。
- 選択中の曲manifest。
- 外部ツールへ渡すoutput URL。
- 将来のDeck-local state。例: `visualTime`、`rate`、`offset`、歌詞タイミング補正、live session state。

### Player Server

`npm run dev:player` で起動するWeb再生画面です。Deckごとに別portで起動します。

```powershell
npm run dev:player -- --port <deck-a-port>
npm run dev:player -- --port <deck-b-port>
```

### Song Data Server

`song-packs/` を配信する共有サーバーです。Deck A/Bは同じSong Data Serverからmanifestやassetを読みます。

```powershell
npm run dev:songs
```

### Output URL

外部ツールが読み込むDeckごとのURLです。

```text
http://127.0.0.1:<deck-port>/?song=http://127.0.0.1:<song-pack-port>/<song-id>/manifest.json
```

TouchDesignerのWeb Browser TOP、OBSのブラウザソース、UnityのWebView、自作ブラウザ表示などは、このURLを個別に読み込みます。

MVPでは、Deckの曲変更は「Launch Manager内の選択曲とoutput URLを更新する」操作です。既に開いているDeck player画面や外部ツール内のWebViewへ、Launch Managerから直接曲差し替え命令は送りません。曲を切り替える場合は、更新されたDeck URLを `open` するか、`copy` して外部ツール側で読み直します。

## 標準サポート範囲

標準で扱うDeck数は2つです。

- Deck A: 表示中、または次に表示する候補。
- Deck B: 次の曲の準備、比較、切替候補。

実装内部は将来Deck C/Dを増やせるよう、固定変数ではなく配列やmapで扱うことを推奨します。ただし100個のDeckのような大規模運用は標準サポート外です。その場合はshow-profileや外部運用ツール側で専用に設計してください。

## 構成

```text
Launch Manager
  Deck A player server
    http://127.0.0.1:<deck-a-port>/?song=<manifest-url>

  Deck B player server
    http://127.0.0.1:<deck-b-port>/?song=<manifest-url>

  Song Data Server
    http://127.0.0.1:<song-pack-port>/

External tool
  reads Deck A URL
  reads Deck B URL
  owns compositing, crossfade, program output
```

Deck AとDeck Bは同じplayerアプリを別portで起動します。同じplayer serverに複数タブで別URLを開く運用もブラウザ上は可能ですが、将来のライブ制御、タイムライン補正、外部入力状態を考えると、標準運用ではDeckごとに別player serverを使います。

## 責務分担

### Launch Manager

- Deck A/Bのplayer serverを起動、停止、再起動する。
- 共有Song Data Serverを起動、停止、再起動する。
- Deckごとに曲manifestを選ぶ。
- Deckごとのoutput URLを表示、コピー、ブラウザで開く。
- Deckごとのstatus、port、PID、log、healthを表示する。
- 状態マップでLaunch Manager、Deck A/B、Song Data Server、選択曲の関係を見せる。

### Deck Player

- `?song=<manifest-url>` で曲パックを読み込む。
- 曲adapterを実行する。
- 将来、Deck-localなvisual sequencer stateを持てるようにする。
- 将来、Deck-local control APIを持てるようにする。

### Song Data Server

- `song-packs/` のmanifest、analysis、asset、README/CREDITSなどを配信する。
- Deck A/Bの両方から参照される。

### External Tool

- Deck A/BのURLを読み込む。
- 合成、クロスフェード、program/preview切替、最終出力を決める。
- TouchDesigner、OBS、Unity、自作VJツールなど、イベントごとの運用に合わせて選ぶ。

## 非目的

Music Effect標準は次を背負いません。

- Deck A/B間のクロスフェード。
- 音声ミックス。
- program/previewの最終切替判断。
- TouchDesigner専用の操作卓。
- Unity専用の操作卓。
- OSC/WebSocket/JSON pollingなど特定の外部入力方式の強制。
- 曲ごとの連携方式の固定。

外部連携は、曲パックまたはshow-profileで必要に応じて設計します。

## Launch Manager UI MVP

最初のDeck対応UIは、凝ったVJ卓ではなく、起動とURL管理を中心にします。

```text
Deck A
  曲: [manifest dropdown]
  URL: [copy] [open]
  Server: [start] [stop] [restart]
  Status: running / stopped / starting / error

Deck B
  曲: [manifest dropdown]
  URL: [copy] [open]
  Server: [start] [stop] [restart]
  Status: running / stopped / starting / error

Song Data Server
  [start] [stop] [restart]
  Status: running / stopped / starting / error
```

標準の「選択曲を再生」は、既存互換としてDeck Aを使う形から始めてよいです。Deck Bの実装が入った後は、Deckごとに曲選択とopen/copyを持ちます。

MVPの曲変更ルール:

- Deckの曲dropdownを変えると、そのDeckのselected manifestとoutput URLを更新する。
- `open` は、その時点のoutput URLをブラウザで開く。
- `copy` は、その時点のoutput URLをクリップボードへコピーする。
- 既に開いているDeck player画面へ、同一ページ内で曲を差し替えるAPI呼び出しは行わない。
- 既に外部ツールがDeck URLを読み込んでいる場合、外部ツール側の再読み込みやURL差し替えは利用者が行う。
- 曲変更時にDeck-local stateをどう引き継ぐかはMVPでは扱わない。URLを読み直すことで、基本的に新しい曲の初期状態から始める。

## 起動と停止

### 起動

Deckごとにplayer serverを起動します。Song Data Serverは共有です。

```text
Deck A start
  ensure Song Data Server if needed
  start Deck A player server
  build Deck A output URL

Deck B start
  ensure Song Data Server if needed
  start Deck B player server
  build Deck B output URL
```

### 停止

- Deck A停止: Deck Aのplayer serverだけを停止する。Song Data ServerとDeck Bは止めない。
- Deck B停止: Deck Bのplayer serverだけを停止する。Song Data ServerとDeck Aは止めない。
- Deck全停止: Deck A/Bのplayer serverを止める。Song Data Serverを止めるかどうかは別操作にする。
- Song Data Server停止: 曲データ配信を止める。起動済みDeckの再読み込みやasset取得に影響するため、UIで警告する。
- Launch Managerの全停止: 既存のmanaged target停止ルールに従う。ただしUIではDeck停止とSong Data Server停止を区別して見せる。

### 停止保証

複数曲を同時に再生しているときでも、Launch Managerが起動したDeck playerは停止できることを実装要件にします。

保証したいこと:

- Launch ManagerはDeckごとに起動したprocessのPIDを保持する。
- 停止対象は、Launch Manager自身が起動してPIDを持つmanaged targetだけにする。
- `Deck A停止` はDeck AのPIDだけを停止し、Deck BとSong Data Serverを止めない。
- `Deck B停止` はDeck BのPIDだけを停止し、Deck AとSong Data Serverを止めない。
- `Deck全停止` は起動中のDeck targetを列挙し、それぞれのPIDへ停止要求を出す。
- `Deck全停止` はSong Data Serverを暗黙に止めない。必要な場合は別操作にする。
- 同じ曲をDeck A/Bで開いていても、PIDとportで停止対象を区別する。
- 停止後はprocess生存確認とhealth確認を行い、残っているDeckがあれば `error` または `stopping failed` としてUIに出す。
- PC全体から同名の `node`、`vite`、`npm` を探して停止しない。
- 他worktree、他Launch Manager、手動起動のplayerは停止対象にしない。

停止の確認方法:

```text
1. Deck AとDeck Bを別portで起動する。
2. Deck A/Bに別々の曲、または同じ曲を読み込む。
3. Deck A停止でDeck Aだけがstoppedになり、Deck BとSong Data Serverがrunningのまま残ることを確認する。
4. Deck B停止でDeck Bだけがstoppedになることを確認する。
5. Deck A/Bを再起動し、Deck全停止でDeck A/Bが両方stoppedになり、Song Data Serverがrunningのまま残ることを確認する。
6. Launch Managerの全停止では、managed targetだけが止まり、他worktreeのtargetを止めないことを確認する。
```

## Deck-local State

将来、映像時間制御やライブ調整を入れる場合、状態はDeckごとに分けます。

Deck-local stateの例:

- `visualTime`: 映像側が参照する現在時刻。
- `rate`: 映像時間の進行速度。
- `offset`: 曲時刻に対する映像時刻の補正。
- `lyricOffset`: 歌詞表示の現場補正。
- `manualKeyframes`: 現場で打った歌詞切替キーフレーム。
- `liveControls`: Glow、intensity、modeなどの一時操作。

Deck AとDeck Bが同じ曲を開いていても、これらの状態は混ぜません。

映像用の `visualTime`、`rate`、`offset`、pause、scrub、nudge、snapshot/restore は、`system/kit/core/visualSequencer.ts` の `createVisualSequencer()` をDeckごとに1インスタンス作って扱うことを標準の出発点にします。このhelperはDOMやplayer serverを正本にせず、`rawTime` と `nowMs` を外部から受け取るだけに留めます。

## Future Control API

Deckごとの操作APIを追加する場合、Launch Manager全体ではなくDeckを宛先にします。

これはMVPには含めません。特に `load-song` は、既に開いているDeck playerへ曲差し替え命令を送るための将来APIとして予約します。実装する場合は、前の曲のadapter state、audio state、lyrics state、visual sequencer snapshot、localStorage key、エラー表示をどうリセットまたは移行するかを別途仕様化してから入れます。

Player操作の `play`、`pause`、`seek` はraw/player timeを動かす操作として扱います。Visual Sequencerだけを操作するAPIを追加する場合は、音声やplayer pauseと混ざらないよう、`visual` を含む名前を予約します。例: `set-visual-rate`、`set-visual-offset`、`set-visual-mode`、`nudge-visual`、`scrub-visual-to`、`pause-visual`、`resume-visual`、`sync-visual-to-raw`、`snapshot-visual`、`restore-visual`。

例:

```text
POST /api/decks/:deckId/load-song
POST /api/decks/:deckId/play
POST /api/decks/:deckId/pause
POST /api/decks/:deckId/seek
POST /api/decks/:deckId/set-visual-rate
POST /api/decks/:deckId/set-visual-offset
POST /api/decks/:deckId/set-visual-mode
POST /api/decks/:deckId/nudge-visual
POST /api/decks/:deckId/scrub-visual-to
POST /api/decks/:deckId/pause-visual
POST /api/decks/:deckId/resume-visual
POST /api/decks/:deckId/sync-visual-to-raw
POST /api/decks/:deckId/snapshot-visual
POST /api/decks/:deckId/restore-visual
POST /api/decks/:deckId/set-live-control
```

これは将来案です。最初のDeck実装では、URL生成、起動、停止、open/copyを優先します。

## show-profileとの関係

show-profileは任意のイベント運用層です。Deck運用を使うイベントでは、show-profileにDeck割当や外部ツール接続メモを置けます。

例:

```json
{
  "schemaVersion": 1,
  "id": "demo-show",
  "decks": [
    {
      "id": "deck-a",
      "label": "Deck A",
      "defaultSongId": "monitoring"
    },
    {
      "id": "deck-b",
      "label": "Deck B",
      "defaultSongId": "igaku"
    }
  ],
  "externalRouting": {
    "tool": "TouchDesigner",
    "notes": "Deck A/B URLs are loaded as separate Web Browser TOPs."
  }
}
```

未知の項目は無視してよいです。show-profileが無くてもDeck A/Bの基本起動は動きます。

## セキュリティ

Deck playerとSong Data Serverは既定でloopbackにbindします。LAN公開やスマホ操作、外部入力を使う場合は、`docs/security.md` のLaunch Manager LAN opt-in、control token、capabilitiesの方針に従います。

Deck URLを外部ツールへ渡す場合も、次を守ります。

- 外部adapter URLを共通フレームワークで自動実行しない。
- 曲固有の外部入力や外部連携は、曲パックまたはshow-profileに責任範囲を記録する。
- 本番イベントでは、操作担当、停止手順、LAN公開範囲、token有無を事前に確認する。

## 移行方針

現在の単一player flowは、Deck A互換として扱います。

段階的な実装順:

1. Deck仕様を文書化する。
2. Launch Managerの内部モデルをDeck配列に寄せる。
3. Deck Aだけで既存挙動を保つ。
4. Deck Bを追加し、別player portで起動できるようにする。
5. UIでDeckごとの曲選択、open、copy、start、stopを分ける。
6. Deckの曲変更はURL更新とopen/copyに留め、既存Deck画面への曲差し替えAPIは入れない。
7. Deck A/Bの個別停止、Deck全停止、Launch Manager全停止の停止保証テストを追加する。
8. 必要になったらDeck-local visual sequencer stateとcontrol APIを追加する。

この順に進めることで、既存の動作確認を壊さずにライブ/VJ運用へ拡張します。
