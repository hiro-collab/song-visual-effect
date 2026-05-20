# Shining Star Music Effect

魔王魂「シャイニングスター」の歌詞とSongle解析JSONを使う、Webベースのインタラクティブ音楽エフェクトです。

## Setup

```powershell
npm install
npm run download:songle
npm run dev
```

`npm run dev` は起動管理サーバーを立ち上げ、system app と song-pack server をまとめて起動します。

```text
http://127.0.0.1:5172/
```

アプリ本体は次のURLで開きます。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/shining-star/manifest.json
```

個別に起動する場合は、次のコマンドも使えます。

```powershell
npm run dev:system
npm run dev:songs
```

この構成では、Webシステムは曲の中身を決めません。`song` クエリで指定された `manifest.json` を読み、歌詞、Songle JSON、palette、markers、手動タイミング、音源パスを曲パッケージ側から取得します。

## Song Package Layout

曲ごとの素材は `song-packs/<song-id>/` に置きます。別サーバーで配信できるよう、曲の入口は `manifest.json` にします。

```text
song-packs/
  shining-star/
    manifest.json
    CREDITS.md
    Lyrics.txt
    analysis/
      song.json
      beat.json
      chord.json
      melody.json
      chorus.json
      lyrics_timing.json
      markers.json
      palette.json
    audio/
      .gitkeep
    design/
      effect_design.md
      cues.json
```

音源ファイルはライセンス上コミットしません。音源を配信したい場合は、ローカル環境で `song-packs/shining-star/audio/maou_14_shining_star.mp3` のように配置してください。未配置でも内部クロックで映像だけ動きます。画面下の `Audio` からローカル音源を選ぶこともできます。

`manifest.json` は曲パッケージの入口です。相対パスは manifest の場所を基準に解決されます。別の曲や別システムへ持ち出す場合も、この manifest と `design/` の演出意図を中心に扱います。

## Design

- 硬いネオンではなく、柔らかい星光、暖色、淡い青、淡い桃色、中間調を重ねます。
- beatを発火条件にして背景発光と光線を動かします。
- chorus区間では光量、線の密度、粒子の広がりを増やします。
- 色や明るさは即時ジャンプではなく、ダンピング制御で少し遅れて追従します。
- 動点をタイミングよく線で結び、柔らかい光線として描きます。

## Songle JSON

`npm run download:songle` は以下のSongle Widget API JSONを `song-packs/shining-star/analysis/` に保存します。

- song
- beat
- chord
- melody
- chorus

音源ファイル自体は解析しません。映像タイミングはJSONと手動マーカーを入力にします。

## Manual Lyric Timing

歌詞の切り替わりがずれている場合は、ブラウザ上で手動キーフレームを打てます。

1. 画面右上の `Lyric Timing` パネルで `Off` ボタンを押して `On` にします。
2. 曲を再生しながら、切り替えたい瞬間にキーを押します。
3. `A` は「現在表示中の歌詞行の開始時刻」を現在時刻に登録します。
4. `D` は「次の歌詞行の開始時刻」を現在時刻に登録します。
5. `Undo` または `Ctrl+Z` / `Backspace` で直前の打刻を戻せます。
6. `Clear` で手動キーフレームを全消去できます。
7. `Export` で `lyrics_timing.manual.json` を書き出せます。

`Space` で再生/停止を切り替えられます。

`Shift` では、打刻済みの歌詞切り替えタイミングをリロードなしで補正できます。

- `All`: 全ての歌詞切り替えストーンを前後に送ります。
- `From #n`: 現在の歌詞行以降のストーンだけを前後に送ります。
- `Sequence`: 薄い点が補正前、明るいストーンが補正後の歌詞切り替え位置です。
- `Sequence` バーをクリック/ドラッグすると、その位置へ再生時刻を移動できます。

打刻データと補正値はブラウザの `localStorage` に自動保存されます。調整中の歌詞表示は、画面上のストーン位置に即時追従します。確定版として同梱したい場合は、書き出したJSONを `song-packs/shining-star/analysis/lyrics_timing.json` として配置してください。次回起動時にそのタイミングが読み込まれます。

## License Safety

魔王魂の音楽は、生成AIへの学習利用が禁じられています。このプロジェクトでは次を前提にします。

- 音源ファイルをAI学習に使わない。
- 音源波形をCodexやアプリ側で解析し直さない。
- ブラウザ上では音源を再生するだけにする。
- 演出タイミングはSongle/TextAlive由来のJSON、歌詞テキスト、手動マーカーから作る。
- 公開やイベント利用時は、魔王魂とSongle/TextAlive側の利用条件を確認する。

## Architecture Direction

このWebシステムは曲アプリを束縛する親ではなく、補助ランタイムとして扱います。

- System: 再生、入力、フレームループ、全画面、保存、歌詞タイミング編集などを補助機能として提供する。
- Song Package: 曲ごとの素材、解析JSON、演出意図、クレジット、手動タイミング、演出コードを持つ。
- Adapter: Web、TouchDesigner、Unityなど、実行環境ごとの接続コードを後付けできるようにする。

`music_src` は廃止し、曲データ本体は `song-packs/` に一本化します。描画方式はCanvas2Dに固定せず、歌詞タイミング編集もoptional toolとして扱います。外部Web adapterは将来許容しますが、まずは同一ビルド内でadapter分離します。

## Workflow Map

主要な流れは `docs/workflows.html` で確認できます。

```text
http://127.0.0.1:5173/docs/workflows.html
```

左の操作名を選ぶと、関係するコンポーネントと受け渡しが強調表示されます。表示内容は `docs/workflows.json` から読み込まれます。このJSONは、機能追加やバグ修正時にLLMへ「このアプリの流れ」を説明するための共有資料としても使えます。

## Agent Context

Codexや別エージェントに作業を渡すときは、まず `AGENTS.md` と `docs/handoff.md` を読ませます。

```text
AGENTS.md
docs/architecture.md
docs/module-map.md
docs/decisions.md
docs/plans.md
docs/known-issues.md
docs/handoff.md
```

`AGENTS.md` は短い入口に留め、全体設計、判断、未解決事項、次の作業は `docs/` に分けています。作業後は `docs/handoff.md` と、必要に応じて `docs/plans.md` / `docs/known-issues.md` / `docs/workflows.json` を更新してください。
