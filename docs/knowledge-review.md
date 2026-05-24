# Shared Knowledge Review

この文書は、各曲担当から届く「共通ノウハウ候補」を審議し、system側に残すものと曲側に留めるものを振り分けるためのルールです。

目的は、便利な知見を共有しつつ、特定曲の演出思想や画面構成を次の曲へ持ち込まないことです。

## 基本原則

- system側に残すのは、複数の曲で使える作法、検証方法、安全ルール、データの読み方だけです。
- 曲固有のモチーフ、構図、色、数値、カメラ、主役の置き方、演出名は、その曲パック側に残します。
- 「ある曲でうまくいった」は、すぐには共通ルールにしません。
- 共通化するときは、見た目の答えではなく、判断の問い、確認観点、選択肢、注意点に変換します。
- 判断に迷うものは、正本docsへ入れず、まずこの文書か該当曲の `design/` に保留します。

## 連絡時の書き方

各担当が共通ノウハウ候補を送るときは、`sync:note` で `topic` を `knowledge-candidate` にします。

```powershell
npm run sync:note -- --from song-example --to system --level question --topic knowledge-candidate -m "candidate: 区間ごとの画面構成を先に決める。scope: any song. source: song-example. risk: 特定構図の数値は含めない。"
```

本文には、できるだけ次を入れます。

- `candidate`: 共有したい主張。
- `scope`: どの曲、どの描画方式、どの作業で使えると思うか。
- `source`: どの曲や作業から出た知見か。
- `risk`: 曲固有の見た目に引っ張る危険がある部分。
- `suggested home`: `docs/song-authoring.md`、`docs/library-candidates.md`、曲パック側 `design/` など。

## 曲担当が確認するタイミング

曲担当は、次のタイミングで連絡板を確認します。

- 作業開始時: system-mainのready、セキュリティ、起動方法、Songle取得まわりの更新を確認する。
- 実装の区切り: 自分の作業に影響するsystem更新が来ていないか確認する。
- 共通ノウハウ候補を送った後: system担当の分類結果を確認する。
- 最終報告前: 自分の候補が `common` として昇格したか、`song-owned` として曲側へ戻されたか確認する。

確認コマンド:

```powershell
npm run sync:brief
npm run sync:check
npm run sync:inbox
```

`song-owned` と判断された内容は、曲パック側の `design/` や `visual-brief.md` に残します。system側の正本docsには移しません。

## 審議の分類

system担当は、候補を小さな主張に分解してから分類します。

| 分類 | 意味 | 置き場所 |
| --- | --- | --- |
| common | ほぼ全曲に使える作法、問い、検証観点 | `docs/song-authoring.md` などの正本 |
| conditional | 条件つきで有用な選択肢。使うかは曲側が決める | `docs/library-candidates.md`、`templates/neutral-song-app/visual-brief.md`、またはこの文書 |
| song-owned | 特定曲の演出、モチーフ、構図、数値、画面語彙 | `song-packs/<song-id>/design/` |
| reject | 誤解を招く、他曲を縛る、権利/安全上危うい | system docsへ入れない |

## 共通化できる例

- 曲の背景調査は、URLと参照用途だけ記録する。
- Songleの `melody` を常にピッチ線と決めつけない。
- 曲のパートごとに、主役、前景、中景、背景、文字位置、密度、色、遷移を先に決める。
- `beat` に直接点滅させるだけでなく、必要に応じて補間、damping、springなどを使う選択肢がある。
- preview後に、前作の構図やfixtureの光表現に寄っていないか確認する。

## 共通化しない例

- 主役は画面中央50-70%を占めるべき、という固定数値。
- サビでは必ずwideへ開く、という固定構成。
- 特定曲のMV由来のモチーフ、生活感、キャラクター配置。
- 特定曲で効いた色、照明、カメラ、3Dレイアウト。
- ある曲の `design/cues.json` 文法を、他曲の標準JSON構成にすること。

## レビュー手順

1. `sync:brief` / `sync:inbox` で `knowledge-candidate` または共通ノウハウらしい連絡を見つける。
2. 候補を1文ごとに分ける。
3. 各文を `common` / `conditional` / `song-owned` / `reject` に分類する。
4. `common` だけを正本docsへ昇格する。
5. `conditional` は「選択肢」や「問い」として書き、必須ルールにしない。
6. `song-owned` は曲パック側に戻し、system docsへ入れない。
7. 判断結果を `sync:note` で担当へ返す。

## 現在の審議メモ

### 2026-05-24: Mesmerizer構成作りノウハウ

元連絡: `#8e4d362772`

- common: 区間ごとの画面構成を先に決める。
- common: 汎用UI形状ではなく、曲の背景調査から意味のあるモチーフを探す。ただしモチーフ自体は曲固有。
- conditional: beatで目標値を切り替え、spring/damping/overshootで追従させる。これは動きの選択肢であり、全曲必須ではない。
- conditional: close / medium / wide / pullback などの語彙で画面構成を考える。これは記述語彙であり、固定カメラ設計ではない。
- song-owned: 主役が中央50-70%を占めるという数値。
- song-owned: サビで同じ構図からwideへ開くという構成判断。

反映済み: `docs/song-authoring.md` と `templates/neutral-song-app/visual-brief.md` には、パートごとの画面構成を先に決める作法だけを入れた。固定数値や特定構図は入れない。
