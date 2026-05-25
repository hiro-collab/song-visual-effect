# Project Scope

この文書は、このプロジェクトが何を作る場所なのか、何を作りすぎない場所なのかを記録します。

## 位置づけ

このプロジェクトは、OSでも巨大なミドルウェアでもありません。

目的は、ブラウザで動く曲別映像を作るための制作キット、検証環境、便利道具箱を提供することです。

最終的な再生先は固定しません。TouchDesigner、Unity、OBS、自作VJツール、スマホ操作、その他の環境から使われる可能性があります。最初の検証対象としてTouchDesignerのWeb Browser TOPを想定しても、プロジェクト全体をTouchDesigner専用にはしません。

## 三層構造

### song-pack

必須の作品単位です。

`song-packs/<song-id>/` には、その曲の映像、素材、manifest、adapter、クレジット、設計メモを置きます。曲ごとのデータ構造、描画方式、UI、外部連携方式は曲パック側が自由に決めます。

曲を作るときは、映像本体だけでなく、その曲をどう再生、連携、調整するかの最小メモや設定も曲パック側へ同梱してよいです。ただし、それらは任意情報です。systemがすべてを理解する必要はありません。

### system kit

制作と検証を助ける道具箱です。

system側は、manifest読み込み、asset配信、起動補助、検証、タイミングhelper、optional toolなど、複数の曲で使いやすい薄い機能だけを提供します。

system側が曲の演出思想、曲固有のJSON文法、描画方式、外部連携方式を決めないことを重視します。

### show-profile

任意のイベント運用層です。

`show-profile` は、複数の曲映像をあるイベント、展示、ライブ、検証会でどう並べ、どう起動し、どう調整し、どう外部ツールとつないだかを記録する任意の運用パッケージです。

たとえば13曲連続のイベントでは、セットリスト、起動URL、表示解像度、当日のタイミング補正、使用ポート、TouchDesignerやUnity側の接続メモをまとめられます。

重要な制約:

- `show-profile` は必須ではありません。
- `show-profile` は曲パックを縛りません。
- Launch Managerは読める範囲だけ補助します。
- 未知の項目は無視してよいです。

最小例:

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
      "notes": "必要なら現場メモを書く"
    }
  ]
}
```

## Launch Managerの役割

Launch Managerは、制作、検証、当日確認のための軽い起動補助画面です。

当面の役割:

- `song-pack` を選んで単体起動確認する。
- `show-profile` があれば、セットリストを表示する。
- ライブ/VJ確認では、`docs/deck-playback.md` に従ってDeck A/BのURL、起動、停止、状態確認を補助する。
- サーバー状態、port、health、ログ、起動待ち上限を確認する。

やりすぎないこと:

- 本番VJ卓の中心にしない。
- TouchDesigner専用やUnity専用の操作卓にしない。
- Deck A/B間のクロスフェード、音声ミックス、program/previewの最終切替を背負わない。
- 外部入力プロトコルを曲やイベントへ強制しない。
- 曲ごとの演出編集や複雑なタイムライン編集を背負わない。

## 外部連携

外部連携は、特定ツール固定ではなく、曲ごとまたはshow-profileごとに決めます。

TouchDesigner、Unity、OSC、WebSocket、HTTP、JSON file pollingなど、連携方法はいくつもあります。system側はすべての連携方法を本体に抱え込まないでください。

Deck A/Bを使う場合も、system側が保証するのはDeckごとのWeb URLを起動、表示、コピーしやすくするところまでです。外部ツールはそれぞれのDeck URLを別入力として読み込み、合成や切替はイベント側で決めます。

共通化する場合も、重い統一ランタイムではなく、薄いcontrol eventの型やbridgeのサンプルとして扱います。曲映像は、必要なら曲パック側で専用adapterや連携メモを持ちます。イベント全体で共通の連携方法を使う場合は、show-profile側にまとめます。

外部入力やLAN操作を使う場合は、曲パックまたはshow-profile側に任意の `capabilities`、README、`security-notes.md`、`operation-notes.md` で責任範囲を書けます。これらは発想を縛る規格ではなく、公開範囲、操作担当、tokenなどの認可、停止手順を見落とさないためのメモです。詳しい共通方針は `docs/security.md` を参照してください。

## タイミング補正

タイミング補正は、曲パック側の調整値とshow-profile側の現場補正を分けて考えます。

- 曲パック側: 曲そのものの調整済みタイミング。
- show-profile側: そのイベント、会場、機材、再生環境に合わせる一時補正。

必要な場合、最終表示タイミングは両者の合算として扱えます。ただしshow-profile側の補正は恒久修正ではなく、そのイベント用の運用値です。

歌詞表示の現場補正は、最初の共通形式として `lyricOffsetMs` を使います。単位はmillisecondsで、正の値は歌詞表示を遅らせます。たとえば `lyricOffsetMs: 120` は基準タイミングより約120ms遅く表示する運用値です。

この値は曲パック側の完成timing JSONを書き換えるものではありません。連日イベントや会場固有の遅延補正として、show-profileのsetlist項目やDeck側のURLに載せる一時ラッパーです。

## 互換性方針

このプロジェクトは、過去形式の永久実行保証を目標にしません。

代わりに、イベント統合時に古い曲パックを検出し、可能なら正規化、変換し、無理なら明示的に警告する方針を取ります。

軽い互換性として今から守ること:

- `schemaVersion` を置く。
- `schemaVersion` が無い既存データは `1` として扱う。
- 未知の項目は無視する。
- 既存項目の意味を変えない。

中くらいの互換性として必要に応じて追加すること:

- loaderでraw JSONを正規化済みobjectへ変換する。
- `song:validate` やshow-profile検証で古い形式や不足を警告する。
- 必要になった時点でmigration scriptを追加する。
- 変換できない曲パックは、手直しが必要だと明示する。

重い互換性として今は避けること:

- 全世代adapter APIの完全互換層。
- 古いplayerの同梱。
- 複雑なschema registry。
- 常時自動migration。

## 実装判断の基準

迷ったら次の順で判断します。

1. 曲パックの自由を守る。
2. system側は薄い補助に留める。
3. show-profileは任意の運用メモとして扱う。
4. Launch Managerは検証補助を優先し、本番卓化しない。
5. 互換性は、永続保証よりも統合時の検査、変換、警告を重視する。
