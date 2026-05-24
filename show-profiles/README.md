# show-profiles

`show-profiles/` は任意のイベント運用メモ置き場です。

曲映像そのものは `song-packs/<song-id>/` が正本です。show-profile は、イベント、展示、検証会などで複数曲をどう並べ、どう確認し、外部ツールとどうつないだかを補助的に記録するだけです。曲パックのJSON文法、描画方式、adapter構成、外部連携方式を縛りません。

最小構成:

```json
{
  "schemaVersion": 1,
  "id": "demo-show",
  "title": "Demo Show",
  "description": "任意の説明",
  "setlist": [
    {
      "songId": "monitoring",
      "manifest": "song-packs/monitoring/manifest.json",
      "label": "DECO*27 - モニタリング",
      "notes": "現場メモ"
    }
  ]
}
```

Launch Manager は `show-profiles/*/show.json` を読み、`setlist` の曲を曲JSONメニューへ反映できるようにします。未知の項目は無視してよい扱いです。

`capabilities` は任意です。イベントや展示で実際に使う外部入力、LAN操作、TouchDesigner、OSC、MIDI、DMX、観客入力などがある場合だけ、人間が運用範囲を把握するために短く書いてください。曲そのものが持つ連携能力は、曲パック側のREADMEやmanifestにも書けます。

記入例:

```json
{
  "capabilities": ["lan-control", "touchdesigner", "osc"]
}
```

これは固定語彙ではありません。showごとに必要な言葉を使って構いません。

show-profile側でLAN公開や外部ツール連携を使う場合は、README、`operation-notes.md`、または `security-notes.md` に、公開するPC、ネットワーク、操作担当、tokenや別の認可、停止手順を短く残すことを推奨します。これはLaunch Managerや曲の作り方を縛るものではなく、当日の見落としを減らすための運用メモです。

外部URLは、会場資料やライセンス確認などの参照メモとしては残して構いません。ただし、Launch Managerがshow-profile内のURLを自動で開く、取得する、adapterコードとして実行する、iframeで埋め込む、といった動きはしません。

保存しないもの:

- 音源、歌詞全文、記事本文、画像データ、スクリーンショット、base64/data URI。
- APIキー、トークン、秘密鍵、`.env` に相当する値。
- 外部URLや絶対パスのmanifest。setlistの `manifest` は `song-packs/<song-id>/manifest.json` の形にしてください。
