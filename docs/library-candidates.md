# Library And Tool Candidates

この文書は、各曲担当から出てきた既存ライブラリ、ツール、エンジン候補を集約するメモです。

目的は「よさそうな依存をすぐsystemへ入れる」ことではありません。曲ごとの自由を守りながら、複数曲で同じ需要が出たときに、どの補助をsystem側へ小さく持つか判断しやすくすることです。

## 基本方針

- system kitは曲の見た目や演出文法を決めない。
- 外部依存はsystemの標準にしない。まずは曲側の任意adapter、または依存なしhelperとして検討する。
- 音楽同期では、独立して進むclockより `frame.time` / beat / chorus / 手動markerから決まる再現可能な状態を優先する。
- seek、previewTime、ループ、停止/再開で破綻する自走timelineは避ける。
- 依存追加前に、ライセンス、bundle size、audit、postinstall/外部binary有無、曲固有性を確認する。

## まず優先する補助

外部依存を増やす前に、次のような小さい補助を優先します。

| 需要 | 方針 | 状態 |
| --- | --- | --- |
| fixture UIと重ならない描画 | `safeArea` / `contentRect` / `visualHost` | 実装済み |
| WebGL/Pixi等の追加レイヤ | `visualHost.createLayer({ canvasContext: "none" })` | 実装済み |
| Canvas2DのDPR/clip/pointer/text fit | `system/kit/contentRect.ts` | 実装済み |
| 参照URL管理 | `references.json` と `npm run song:validate` | 実装済み |
| 指定時刻preview検証 | `preview:snapshot` | 設計候補 |
| 手描き/筆線 | 点列、太さ、色を受け取るstroke helper | 設計候補 |
| timeline/easing | `frame.time` から値を計算するscrubbable helper | 設計候補 |

## 候補別メモ

### perfect-freehand / rough.js / paper.js

用途:
手描き線、筆線、ラフなメモ、揺れる輪郭、生活感のある形。

現時点の判断:
system標準依存にはしない。複数曲で手描き線需要が続くなら、まず依存なしのstroke helperを検討する。外部ライブラリを使う場合は、曲側adapterの任意依存または別bundleとして評価する。

見る点:
ライセンス、bundle size、Canvas2D/WebGL/SVGとの相性、点列入力から決定的に同じ形を再現できるか。

### GSAP / anime.js

用途:
section遷移、stamp演出、easing、timeline。

現時点の判断:
自走timelineとしてsystemへ入れない。音楽同期では `frame.time` とseekから同じ状態を再計算できることが重要です。必要なら、`time -> value` のscrubbable easing/interpolation helperをsystem側へ小さく作る方が安全です。

見る点:
seek時に正しい状態へ戻れるか、loop時に破綻しないか、pause/resumeで曲時間とズレないか。

### PixiJS / Konva / p5.js

用途:
2Dカード、レイヤ、mask、filter、blend、sprite管理。

現時点の判断:
system標準にはしない。曲側が必要な場合に `visualHost.createLayer()` で描画面だけ受け取り、曲側adapter内で使う方向を優先する。

見る点:
曲側だけに閉じられるか、fixture playerのregistryへ曲固有importを増やさないか、bundle sizeが許容できるか。

### Three.js

用途:
奥行き、部屋、ステージ、平面カード、カメラ、depth sorting、3Dライブ会場。

現時点の判断:
system branchでは既に使えるが、曲の3D構図やscene logicは曲側に置く。systemが持つなら、safeArea-aware renderer sizing、orthographic camera、canvas textureなどの薄いstarter patternに留める。

見る点:
曲固有assetsのライセンス、bundle warning、GLB/texture容量、fallbackの必要性。

### Rive

用途:
目、表情、メモ、状態を持つキャラクター的アニメ。

現時点の判断:
制作フローと `.riv` asset管理が必要なため保留。具体的にRive assetを作る曲が出てから評価する。

### Phaser / Matter.js / physics engine

用途:
ゲーム的相互作用、物理シミュレーション。

現時点の判断:
通常の音楽同期映像では過剰になりやすい。曲の主役がゲーム的挙動や物理である場合だけ検討する。決定的再生とseek復元ができることを重視する。

## 採用前チェック

外部依存を追加する前に、担当者は次を共有してください。

- なぜ曲側の素のCanvas/WebGL/DOM helperでは足りないか。
- その依存をsystem標準ではなく曲側任意依存にできるか。
- ライセンス。
- 追加bundle size。
- `npm audit --audit-level=moderate` の結果。
- postinstall、外部binary取得、外部通信の有無。
- seek、pause/resume、loop、previewTimeで同じ状態を再現できるか。
- 曲固有の見た目や文法をsystem側へ持ち込んでいないか。
