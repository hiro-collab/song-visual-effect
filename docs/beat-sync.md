# Beat Sync Kit

Beat Sync Kit は、正規化済みの beat 配列から現在の拍状態を読むための
`system/kit` helper です。曲の描画、tap 補正、DOM UI、Songle JSON の
parser ではありません。

目的は、曲アプリが必要なときだけ beat-aware な演出を使えるようにすることです。
system host 側が曲ごとの見た目や演出判断を決めないよう、小さい補助機能として
切り出しています。

## 役割

`system/kit/beatSync.ts` が行うこと:

- 現在再生時刻を受け取る
- 正規化済みの `Beat[]` を受け取る
- 任意の offset 秒数を適用する
- 現在の拍状態を返す
- `解析ビート` や `仮ビート` などの source 情報を返す

行わないこと:

- 外部 URL を取得する
- 特定サービスの JSON 構造を読む
- 音源ファイルや波形を解析する
- ファイルへ保存する
- DOM、Canvas、曲固有 renderer に触る

## 基本的な使い方

```ts
import { createBeatSyncReader } from "../../system/kit";

const beatSync = createBeatSyncReader({
  getTime: () => transport.currentTime(),
  beats: musicMap.beats,
  offset: 0,
  source: {
    label: musicMap.warnings.includes("beat fallback") ? "仮ビート" : "解析ビート",
    isFallback: musicMap.warnings.includes("beat fallback")
  }
});

const state = beatSync.update();
```

`state` には次の情報が入ります。

- `beatIndex`
- `beat`
- `nextBeat`
- `phase`: `0..1`
- `isNearBeat`
- `didEnterBeat`
- `estimatedBpm`
- `source`
- `rawTime`, `time`, `offset`

純粋関数として扱いたい場合は `getBeatSyncState()` を直接使えます。
`createBeatSyncReader()` は作成時に beat 配列を正規化して保持するため、
毎フレーム `normalizeBeatGrid()` を呼びません。beat 配列を差し替える場合は
reader を作り直してください。

## Beat Hit の意味

拍の判定は、似ているけれど用途が違う 2 つの値に分けています。

- `isNearBeat`: 現在の `time` が拍から `hitWindow` 秒以内にいる間 `true`。
  `getBeatSyncState()` の純粋関数呼び出しだけで計算できます。
- `didEnterBeat`: stateful reader が前回 update から `beatIndex` の前進を
  観測したフレームだけ `true`。一拍につき一度だけ発火させたい演出向けです。

発光の幅、メーター、曖昧さを許す UI には `isNearBeat` を使います。
一度だけ鳴らす・出す・切り替える処理には `didEnterBeat` を使います。

曲時間が末尾から先頭に戻った場合や、シークで時刻または `beatIndex` が
巻き戻った場合、reader は前回拍をリセットします。そのフレームでは
`didEnterBeat` を出さず、次に beat index が前進したときから再び発火します。

## Beat Input

kit が期待する beat は、プロジェクト共通の `Beat` 形に正規化済みの配列です。

```ts
type Beat = {
  time: number;
  duration: number;
  position?: number;
  bpm?: number;
};
```

時刻は秒です。配列は `time` 昇順が望ましいですが、`normalizeBeatGrid()` は
コピーを作って sanitize と sort を行えます。

Songle など曲ごとの JSON 形式は、この module の外側で扱います。曲パッケージ
または薄い adapter が、Songle、手入力、その他の beat データを `Beat[]` に
読み替えてから kit に渡してください。

## Fixture Player Tool

fixture player には、診断用の optional tool として
`examples/fixture-player/tools/beatStateTool.ts` があります。

通常は表示されません。確認したいときだけ URL に `beatState=1` を付けます。

```text
http://127.0.0.1:5173/?song=<manifest-url>&beatState=1
```

表示する情報:

- 出所
- 現在の拍
- 次の拍
- 位相
- 推定 BPM
- `isNearBeat`
- `didEnterBeat`

この tool は診断表示のみです。再生、歌詞、映像時刻、曲 renderer の挙動は
変更しません。

## 安全制約

- 音源波形を解析しない
- 音楽ファイルを AI 学習に使わない
- beat 情報は既存 JSON、手入力、または曲側 adapter から渡す
- tap 補正や feedback control は別の optional layer として扱う
