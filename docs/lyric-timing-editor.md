# Lyric Timing Editor Boundary

Lyric Timing Editor は、Music Effect から分離した独立プロジェクトです。

- Repository: https://github.com/hiro-collab/lyric-timing-editor
- GitHub Pages: https://hiro-collab.github.io/lyric-timing-editor/

このリポジトリでは、Editor本体、Editor project JSON parser、Editor向けUI、Editor向けテストは持ちません。Music Effect側の責務は、完成した歌詞タイミングJSONを曲パッケージのデータとして読むことだけです。

## 残す境界

- 曲パッケージ側が `analysis.timing` などで完成済みtiming JSONを参照できること。
- `system/kit/core/assets.ts` が `startSec` / `endSec` / `startTimeMs` / `endTimeMs` / `timeUnit` つきJSONを秒へ正規化して読めること。
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

## 権利境界

Editor project JSONや歌詞込みexportは歌詞本文を含みうるため、権利確認なしにMusic Effect repoへコミットしません。公開repoへ置く場合は、歌詞の権利と配布先の利用条件を確認してください。

タイミングのみのJSONは歌詞本文を含みませんが、曲や利用先の方針に応じて公開可否を確認してください。
