# Lyric Timing Editor Boundary

Lyric Timing Editor は、Music Effect から分離した独立プロジェクトです。

- Repository: https://github.com/hiro-collab/lyric-timing-editor
- GitHub Pages: https://hiro-collab.github.io/lyric-timing-editor/

このリポジトリでは、Editor本体、Editor project JSON parser、Editor向けUI、Editor向けテストは持ちません。Music Effect側の責務は、完成した歌詞タイミングJSONを曲パッケージのデータとして読むことだけです。

## 残す境界

- 曲パッケージ側が `analysis.timing` などで完成済みtiming JSONを参照できること。
- `system/kit/core/assets.ts` が legacy v1 と Lyric Timing Editor の `music-effect.lyrics-timing.v2` export JSONを秒へ正規化して読めること。
- fixture player内の optional Lyric Timing tool は、Music Effect上での簡易微調整UIとして残すこと。

## 分離したもの

- 独立Editor本体。
- 歌詞txt parser。
- Editor project JSON schemaとvalidation。
- Editor export helper。
- GitHub Pages配布設定。
- Editorの自動保存、選択編集、UI言語切り替え。

これらは `hiro-collab/lyric-timing-editor` 側を正本にします。

## ファイル配置

Music Effect内の推奨配置:

```text
song-packs/<song-id>/lyrics/timing.json
```

既存manifest構造では、必要に応じて `analysis.timing` から参照してもよいです。どちらの置き場にするかは各曲パッケージ側の設計で決めます。

## 対応するtiming JSON

推奨形式は Lyric Timing Editor が出力する v2 です。

- `schema: "music-effect.lyrics-timing.v2"`
- `timeUnit: "ms"`
- `phrases[].startTimeMs` / `phrases[].endTimeMs` は integer milliseconds。
- `includesLyrics: true` の場合は `phrases[].text` を表示に使います。
- `includesLyrics: false`、または `phrases[].text` がない場合は、曲パッケージ側の `manifest.lyrics` の歌詞行と `phrases[].index` / 配列順で結合します。

Music Effect内部の `LyricCue` は従来通り seconds 単位です。v2 importer は `startTimeMs` / `endTimeMs` を seconds に変換します。Editorのproject JSONには依存せず、完成済みのexport JSONだけを読みます。

legacy v1 (`music-effect.lyrics-timing.v1`) は引き続き読めますが、新しく作る完成timing JSONは v2 を優先してください。

## 権利境界

Editor project JSONや歌詞込みexportは歌詞本文を含みうるため、権利確認なしにMusic Effect repoへコミットしません。公開repoへ置く場合は、歌詞の権利と配布先の利用条件を確認してください。

タイミングのみのJSONは歌詞本文を含みませんが、曲や利用先の方針に応じて公開可否を確認してください。

## ライブ時の微調整

本番中の数十ミリ秒単位の調整は、完成済みtiming JSONを書き換えるより、show-profileやDeckごとの運用ラッパーとして別保存する方針を優先します。

これにより、連日イベントで同じ補正を再利用しつつ、Lyric Timing Editorで作った基準timing JSONを保てます。ラッパーの具体的なschemaは、イベント運用・Deck制御・外部ツール連携の仕様が固まってから決めます。
