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

保存しないもの:

- 音源、歌詞全文、記事本文、画像データ、スクリーンショット、base64/data URI。
- APIキー、トークン、秘密鍵、`.env` に相当する値。
- 外部URLや絶対パスのmanifest。setlistの `manifest` は `song-packs/<song-id>/manifest.json` の形にしてください。
