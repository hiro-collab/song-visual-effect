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

### 手早く曲パックへ入れる

Lyric Timing Editorのv2 exportを手元に用意したら、次のコマンドで曲パックへコピーし、`manifest.json` の `lyrics` と `analysis.timing` を更新できます。

GUIで入れたい場合は、Launch Managerとは別の小さなローカルGUIを起動します。

```powershell
npm run song:lyrics:gui
```

表示されたURLを開き、曲パック、timing v2 JSON、必要ならlyrics txtを選んで投入します。このGUIは起動・再生管理をしません。Launch Managerとは責任を混ぜず、曲パックの歌詞データ投入だけを扱います。

コマンドだけで入れる場合は次を使います。

```powershell
npm run song:lyrics:install -- --id <song-id> --timing <path-to-timing-v2.json>
```

timing-only export (`includesLyrics: false`) の場合は、別のUTF-8歌詞テキストも渡します。

```powershell
npm run song:lyrics:install -- --id <song-id> --timing <path-to-timing-v2.json> --lyrics <path-to-lyrics.txt> --name live
```

出力先は常に曲パック内です。

```text
song-packs/<song-id>/lyrics/<name>.timing.v2.json
song-packs/<song-id>/lyrics/<name>.lyrics.txt
```

同じ `<name>` で入れ直す場合だけ `--force` を付けます。導入後は次を確認します。

```powershell
npm run song:validate -- --id <song-id>
npm test
npm run build
```

## 対応するtiming JSON

推奨形式は Lyric Timing Editor が出力する v2 です。

- `schema: "music-effect.lyrics-timing.v2"`
- `timeUnit: "ms"`
- `durationMs` は `number | null`。
- `slug` は任意です。ある場合は小文字英数字とハイフンだけの照合用文字列として扱います。
- `sourceProjectSchema` はexport元の識別用metadataです。`lyric-timing-editor.project.v1` 以外が入っている場合はwarningを出しますが、Music Effect側がEditor project JSONを入力として読むわけではありません。
- `songle` は任意の参照metadataです。存在しなくても、`null` でも読めます。
- `includesLyrics` は boolean です。
- `rightsNotice` は文字列です。Music Effect側は表示の必須条件にはしませんが、欠落時はwarningを出します。
- `phrases[].id` はデバッグ用に保持できます。欠落時も再生は止めません。
- `phrases[].sourceLine` は歌詞txt上の行番号を示すデバッグ補助です。Music Effect側の `LyricCue.sourceLine` に保持しますが、内部再生には必須にしません。
- `phrases[].startTimeMs` / `phrases[].endTimeMs` は integer milliseconds。
- phrase range は連続区間として扱います。通常はphrase Nの `endTimeMs` がphrase N+1の `startTimeMs` と一致します。ずれている場合はwarningを出しますが、再生は止めません。
- `includesLyrics: true` の場合は `phrases[].text` を表示に使います。
- `includesLyrics: false`、または `phrases[].text` がない場合は、曲パッケージ側の `manifest.lyrics` の歌詞行と `phrases[].index` / 配列順で結合します。
- `phrases[].displayMode: "blank"` は、イントロ、間奏、アウトロなどの意図的な無表示区間として扱います。この場合は歌詞本文がなくてもwarningにせず、標準プレイヤーでは現在行と次行の表示を消します。
- `notes` はexport JSONには含めない前提です。含まれていてもMusic Effect側は無視します。

Music Effect内部の `LyricCue.time` / `LyricCue.end` は従来通り seconds 単位です。v2 importer は `startTimeMs` / `endTimeMs` を seconds に変換します。Editorのproject JSONには依存せず、完成済みのexport JSONだけを読みます。

legacy v1 (`music-effect.lyrics-timing.v1`) は引き続き読めますが、新しく作る完成timing JSONは v2 を優先してください。

## 権利境界

Editor project JSONや歌詞込みexportは歌詞本文を含みうるため、権利確認なしにMusic Effect repoへコミットしません。公開repoへ置く場合は、歌詞の権利と配布先の利用条件を確認してください。

タイミングのみのJSONは歌詞本文を含みませんが、曲や利用先の方針に応じて公開可否を確認してください。

## ライブ時の微調整

本番中の数十ミリ秒単位の調整は、完成済みtiming JSONを書き換えるより、show-profileやDeckごとの運用ラッパーとして別保存する方針を優先します。

これにより、連日イベントで同じ補正を再利用しつつ、Lyric Timing Editorで作った基準timing JSONを保てます。cue単位の補正ラッパー仕様は `docs/lyric-adjustments.md` を正本にします。

最小の共通ラッパーとして、show-profileのsetlist項目とDeck URLで `lyricOffsetMs` を扱えます。単位はmillisecondsで、正の値は歌詞表示を遅らせます。

```json
{
  "setlist": [
    {
      "songId": "example-song",
      "manifest": "song-packs/example-song/manifest.json",
      "label": "Example Song",
      "lyricOffsetMs": 120
    }
  ]
}
```

Launch Managerはこの値をDeck Aへ反映し、player URLへ `?lyricOffsetMs=120` として渡します。これは現場補正であり、曲パック側のtiming JSONを更新する操作ではありません。
