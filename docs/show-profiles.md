# Show Profiles

show-profileは任意のイベント運用層です。曲パックや曲映像の作り方を縛るものではありません。

詳しい位置づけは `docs/project-scope.md` を参照してください。この文書では、show-profileから任意の歌詞補正を参照する入口だけを説明します。

## 役割

show-profileには、イベント、展示、ライブ、検証会で複数の曲映像をどう並べ、どう起動し、どう調整し、どう外部ツールとつなぐかを記録できます。

ただし次を守ります。

- show-profileは必須ではありません。
- show-profileがなくても曲パック単体は動きます。
- show-profileは曲パックのデータ構造、演出、UI、連携方式を決めません。
- Launch Managerは読める範囲だけ補助し、未知の項目は無視してよいです。

## 歌詞補正との関係

show-profileは、イベントや会場ごとの歌詞補正ラッパーを任意で参照できます。詳しいJSON形式、fingerprint、適用順序、mismatch時の挙動は `docs/lyric-adjustments.md` を正本にします。

配置例です。`show-profile` からLaunch Manager経由でDeck URLへ渡す場合、標準playerがHTTPで読める場所に置く必要があります。標準ローカル運用では、曲パック内の `adjustments/` を参照します。

```text
song-packs/<song-id>/adjustments/
  lyrics.<songPackId>.json
  lyrics.bundle.json
```

単一曲用のschemaは `music-effect.lyric-adjustment.v1`、複数曲bundle用のschemaは `music-effect.lyric-adjustment-bundle.v1` です。

show-profile側の歌詞補正は、曲パック内の完成済みtiming JSONを書き換えるものではありません。連日イベント、会場固有遅延、リハーサル中の確認などに使う一時補正です。

## 最小例

```json
{
  "schemaVersion": 1,
  "id": "demo-show",
  "title": "Demo Show",
  "description": "動作確認用の任意show profile",
  "setlist": [
    {
      "songId": "monitoring",
      "manifest": "song-packs/monitoring/manifest.json",
      "label": "モニタリング",
      "notes": "必要なら現場メモを書く",
      "lyricOffsetMs": 120,
      "lyricAdjustment": "adjustments/lyrics.monitoring.json"
    }
  ]
}
```

`lyricOffsetMs` は最小のDeck-localな現場補正です。より細かいcue単位補正は `lyricAdjustment` などで補正ラッパーを参照する形にします。

`lyricAdjustment` は外部URLや絶対パスではなく、相対パスだけを受け付けます。`adjustments/lyrics.monitoring.json` のように書くと、setlist項目の曲パック内のファイルとして扱います。`song-packs/<song-id>/adjustments/lyrics.monitoring.json` のように明示することもできますが、同じ曲パック内に限ります。

標準playerは、URLパラメータ `lyricAdjustment` / `lyricAdjustmentUrl` から補正ラッパーを読めます。Launch Managerはshow-profileのsetlist項目に `lyricAdjustment` があれば、Deck URLへ反映します。
