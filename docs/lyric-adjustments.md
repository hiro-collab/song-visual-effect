# Lyric Adjustments

この文書は、完成済み歌詞timing JSONに対する制作、リハーサル、本番用の軽い補正ラッパーを定義します。

正本の歌詞timingは Lyric Timing Editor が出力する `music-effect.lyrics-timing.v2` を優先します。Music Effect側の補正ラッパーは、そのJSONを直接書き換えず、別ファイルの差分として扱います。

## 目的

- 曲パック内の完成済みtiming JSONを汚さず、会場、機材、リハーサル、本番日の微補正を保存する。
- 補正は曲映像ごとに独立させる。
- Deck A/Bの実行中状態はDeckごとに独立させる。
- 複数曲イベントでは、複数曲分の補正をbundleとしてまとめられる余地を残す。
- 歌詞本文や分割構造は編集しない。

## 非目的

- 歌詞本文の修正。
- フレーズ、ワード、文字への分割。
- 完成済みtiming JSONの恒久修正。
- 曲ごとのUI表現の固定。
- 本番VJ卓や外部連携方式の標準化。

歌詞本文の修正、行追加、削除、分割、結合は Lyric Timing Editor 側の責務です。Music Effect側は、読み込まれたtimed lyric cue列をそのまま補正対象にします。

## 用語

### Lyric cue

表示タイミングを持つ最小単位です。現時点のv2 exportでは `phrases[]` が入力になりますが、Music Effect側ではフレーズ、ワード、文字を強く決め打ちせず、`LyricCue[]` に正規化されたcue列として扱います。

### Adjustment wrapper

単一の曲映像に対する補正ファイルです。schemaは `music-effect.lyric-adjustment.v1` です。

### Adjustment bundle

複数曲分の補正をまとめるファイルです。schemaは `music-effect.lyric-adjustment-bundle.v1` です。13曲連続イベントのように、曲ごとに別ファイルを手で指定する負担を減らしたい場合に使えます。

## 対象識別

補正対象は、表示名や曲名ではなく、次の順で結びつけます。

1. `songPackId` / `visualId`
2. `slug`
3. `sourceFingerprint`

`songPackId` と `visualId` は曲映像システムのIDです。通常は同じ値で構いません。`slug` は Lyric Timing Editor やファイル名由来の補助IDです。

`sourceFingerprint` は、元timing JSON全体ではなく、正規化したcue列から作ります。歌詞本文はfingerprintに含めません。含める候補は `cueId`、`index`、`startTimeMs`、`endTimeMs`、`sourceLine` です。

system kitでは `createLyricCueFingerprint()` が `LyricCue[]` から `fnv1a32:<hash>` 形式の軽い変更検出用fingerprintを作ります。これはセキュリティ用途のhashではありません。

## 単一曲補正JSON

```json
{
  "schema": "music-effect.lyric-adjustment.v1",
  "encoding": "utf-8",
  "messageLanguage": "en",
  "createdAt": "2026-05-26T00:00:00.000Z",
  "createdBy": "music-effect rehearsal helper",
  "target": {
    "songPackId": "ope",
    "visualId": "ope",
    "slug": "ope",
    "timingSchema": "music-effect.lyrics-timing.v2",
    "sourceFingerprint": "fnv1a32:1234abcd"
  },
  "summary": {
    "adjustedCueCount": 12,
    "maxAbsOffsetMs": 180,
    "hasEndOffsets": false
  },
  "adjustments": [
    {
      "cueId": "phrase-36",
      "index": 36,
      "startOffsetMs": 120,
      "endOffsetMs": 0
    }
  ]
}
```

補正値は絶対時刻ではなく差分です。`startOffsetMs: 120` は、元のcue開始時刻より120ms遅らせることを意味します。

UI上で全体シフトや途中以降シフトを提供しても、保存時は最終的なcueごとの差分へ展開します。再生側はcueごとの差分を足すだけで済むようにします。

`summary` は任意です。読み込み側は `summary` がなくても動作します。保存側は、人間が補正量を把握しやすいように付けることを推奨します。

## 複数曲補正bundle

```json
{
  "schema": "music-effect.lyric-adjustment-bundle.v1",
  "encoding": "utf-8",
  "messageLanguage": "en",
  "createdAt": "2026-05-26T00:00:00.000Z",
  "createdBy": "music-effect rehearsal helper",
  "items": [
    {
      "target": {
        "songPackId": "ope",
        "visualId": "ope",
        "slug": "ope",
        "timingSchema": "music-effect.lyrics-timing.v2",
        "sourceFingerprint": "fnv1a32:1234abcd"
      },
      "summary": {
        "adjustedCueCount": 12,
        "maxAbsOffsetMs": 180,
        "hasEndOffsets": false
      },
      "adjustments": [
        {
          "cueId": "phrase-36",
          "index": 36,
          "startOffsetMs": 120,
          "endOffsetMs": 0
        }
      ]
    }
  ]
}
```

bundle内では、現在の曲映像に対応する `target.songPackId` / `target.visualId` / `target.slug` を持つitemだけを取り出して適用します。

## 配置例

標準ローカル運用で、show-profileからLaunch Manager経由でDeck URLへ渡す場合の典型例です。これは必須構成ではありません。

```text
song-packs/<song-id>/adjustments/
  lyrics.<songPackId>.json
  lyrics.bundle.json
```

将来、歌詞以外の補正を追加する場合は同じディレクトリに名前を分けて置けます。

```text
song-packs/<song-id>/adjustments/
  beat.<songPackId>.json
  visual-time.<songPackId>.json
  input-latency.<songPackId>.json
```

今回は歌詞補正だけを扱います。

## 読み込み優先順位

補正ラッパーは次の順で探します。

1. URLパラメータ指定。
2. show-profile指定。
3. 画面上での手動読み込み。
4. 指定なし。

URLパラメータは明示指定なので最優先です。show-profileはイベント運用の標準ルートです。手動読み込みはその場だけの一時適用とし、ブラウザを閉じたら消える扱いにします。永続化したい場合はダウンロードして配置します。

最初の実装では、標準playerがURLパラメータ `lyricAdjustment` または `lyricAdjustmentUrl` を読みます。

```text
http://127.0.0.1:<deck-port>/?song=<manifest-url>&lyricAdjustment=<adjustment-json-url>
```

URLから読まれた補正は、曲パックから読み込んだ `LyricCue[]` へ適用されます。`musicMap.lyrics` は補正後、`musicMap.rawLyrics` は補正前として扱います。適用結果のdiagnosticsは `musicMap.lyricAdjustmentDiagnostics` に入ります。

show-profileのsetlist項目では、`lyricAdjustment` に `adjustments/lyrics.<songPackId>.json` のような相対パスを書けます。Launch Managerはこれを曲パック内のファイルとして検証し、Deck URLの `lyricAdjustment` へ変換します。外部URL、絶対パス、別曲パックへの参照は受け付けません。

標準playerのリハーサルUIをOnにすると、画面上から補正JSONを手動読み込みできます。この手動読み込みはそのタブ内だけの一時適用です。永続化したい場合は `Export Adj` で補正ラッパーを書き出し、曲パック内やshow-profileから参照する運用ファイルへ配置します。

## 適用ルール

- `cueId` が一致する場合は `cueId` で適用する。
- `cueId` がない、または一致しない場合は `index` でfallbackする。
- `sourceFingerprint` が一致しない場合も完全拒否しない。
- fingerprint mismatch時は警告を出し、mismatch状態をUIやログで明示する。
- 適用できなかった補正はskippedとして数える。
- 本番用helperではmismatchを制作、リハーサル用helperより目立つ状態にする。

曲ごとの映像UIは固定しません。system側はDOMに依存しないhelperと、必要ならサンプルUIだけを提供します。

## Helperの責務

### 制作、リハーサル用helper

- cue単位の石を表示、移動できる状態を作る。
- 全体シフト、途中以降シフト、選択cueシフトを補助する。
- undo、clear、exportを提供する。
- 保存時はcueごとの差分へ展開する。
- ダウンロード保存を最初の保存手段にする。

### 本番用helper

- Deckごとに独立した補正状態を持つ。
- 誤操作を避けるため、通常は操作UIを表示しない構成をサンプルとして用意する。
- 必要な曲映像は独自UI、外部ツール、TouchDesigner、Unityなどから操作できる。
- 補正状態のsnapshot / restoreを将来追加できる形にする。

## 実装段階

### system本体の責任

- `system/kit/timing/lyricAdjustment.ts` にDOM非依存の純粋helperを置く。
- `applyLyricAdjustment()` は `LyricCue[]` と補正JSONを受け取り、補正後の `LyricCue[]` とdiagnosticsを返す。
- diagnosticsの `code` と `message` はASCII英語を正本にする。日本語表示はUI側で任意に翻訳する。
- `encoding: "utf-8"` と `messageLanguage: "en"` は任意metadataとして扱う。
- fingerprint mismatchでも完全拒否せず、警告しながら適用できるcueだけ適用する。
- 補正後にcueの開始時刻が終了時刻を追い越す場合は、最小長へ丸めて警告する。

### 標準playerのサンプル責任

- URLパラメータ指定の補正ラッパーを読み込み、`musicMap.lyrics` を補正後にする。
- `musicMap.rawLyrics` に補正前のcue列を残す。
- `musicMap.lyricAdjustmentDiagnostics` に適用結果を残す。
- show-profile指定をLaunch ManagerからDeck URLへ反映する。
- 手動読み込みと `Export Adj` をリハーサル用サンプルUIとして提供する。

### 後続候補

- 制作、リハーサル用UIとして、下部シーケンスバーへcue stoneを統合する。
- 本番用helperとして、誤操作を避ける最小UI、snapshot / restore、外部制御APIを検討する。

## Docs consistency

この文書と `docs/show-profiles.md` は同じschema名を参照します。更新時は `npm run docs:check` を実行して、schema名、JSON例、リンクの最低限の整合性を確認してください。
