# Neutral Song App Template

このテンプレートは、新しい曲の初期実装が既存fixture rendererの見た目に引っ張られないようにするための、空に近い出発点です。

重要:

- これは視覚デザインのテンプレートではありません。
- 中央発光、放射線、光ネットワーク、粒子、グロー、soft light構図を含めません。
- 既存の `examples/fixtures/soft-light-player/renderers/` や `examples/fixtures/soft-light-player/effects/` をコピー元にしません。
- 曲の主役構造を先に決めるまで、線や光の表現を足さないでください。

使い方:

1. `visual-brief.md` を埋めて、曲の主役構造を決めます。
2. Canvas2D adapterとして始める場合だけ `adapter.ts` をコピーします。
3. WebGL、SVG、DOM、別ランタイムで作る場合は、このTypeScript adapterを使わず、同じ考え方で空のループから始めます。
4. 最初のプレビュー後に `docs/song-visual-independence.md` のレビューを行います。

このテンプレートの目的は「何も似せない」ことです。曲の表現を決めるのは、既存の部品ではなく、その曲の演出意図です。
