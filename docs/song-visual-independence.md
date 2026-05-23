# Song Visual Independence

この文書は、新しい曲の映像エフェクトが既存fixtureや前作の見た目に引っ張られないようにするためのチェックリストです。

## 背景

「既存の `song-packs/*` を読まない」だけでは不十分な場合があります。曲パッケージを見なくても、`examples/fixtures/soft-light-player` のsoft light renderer、中央発光、放射線、光ネットワーク、粒子、グロー中心の構図に引っ張られることがあります。

新しい曲を作るときは、既存曲だけでなく、既存fixture rendererも視覚テンプレートとして扱わないでください。

## 読んでよいもの

新しい曲の設計開始時に読んでよいもの:

- `AGENTS.md`
- `docs/system-overview.md`
- `docs/song-authoring.md`
- `docs/song-visual-independence.md`
- `docs/decisions.md`
- `system/kit/index.ts`
- 必要な `system/kit/*` helper
- `templates/neutral-song-app/README.md`
- `templates/neutral-song-app/visual-brief.md`
- Canvas2D adapterとして始める場合だけ `templates/neutral-song-app/adapter.ts`

## アンカーになりやすいので読まないもの

新しい曲の初期設計では読まないもの:

- `song-packs/*`
- `examples/fixtures/soft-light-player/renderers/*`
- `examples/fixtures/soft-light-player/effects/*`
- `examples/fixtures/soft-light-player/adapters/fixtureSoftLight.ts`
- `examples/fixtures/soft-light-player/styles.css`
- 既存曲のmanifest、analysis、design、adapter、README

例外:

- そのfixture自体の修正。
- 回帰確認。
- ユーザーが明示して「この見た目を参考に」と言った場合。

## 実装開始前チェック

実装前に、次を文章で固定します。

- この曲の主役構造は何か。
- 画面で最初に見えるべきものは何か。
- 色、構図、線、光、粒子のうち、今回は何を主役にしないか。
- beat、chorus、歌詞、手動cueのうち、何をきっかけにするか。
- 既存fixtureと似やすい表現をどう避けるか。

## 空のadapterから始める

Canvas2D adapterとして始める場合は、`templates/neutral-song-app/adapter.ts` のような空の描画ループから始めます。

この段階で入れないもの:

- 中央から広がる発光。
- 画面中央へ集まる線。
- 放射線。
- 光ネットワーク。
- soft light風の暖色グロー。
- 前作と同じ粒子密度や合成方式。

## 最初のプレビューで見ること

最初の動く版ができたら、次を確認します。

- 構図: 中央発光や放射線に寄っていないか。
- 色: 前作の暖色グロー、淡い光、同じ背景階調に寄っていないか。
- 主役: 曲ごとの主役オブジェクトや場が、光や線より先に見えるか。
- 線: 視線、衝突、関係性をすぐ光線で表していないか。
- カメラ: 前作と同じ正面固定、中央集中、全画面グローになっていないか。
- リズム: beat同期の点滅や膨張だけで曲の個性を済ませていないか。
- 歌詞: 文字の扱いが既存fixtureの歌詞表示に寄っていないか。

## レビュー時の問い

- この曲を無音で見ても、前作とは違う曲のための映像に見えるか。
- 主役構造を一文で説明できるか。
- その一文に「光」「線」「粒子」しか出てこないなら、曲固有の構造が弱い可能性があります。
- 補助表現の線やグローが、曲の主役を追い越していないか。
