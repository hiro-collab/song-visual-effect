# Shining Star Music Effect

魔王魂「シャイニングスター」の歌詞とSongle解析JSONを使う、Webベースのインタラクティブ音楽エフェクトです。

## Setup

```powershell
npm install
npm run download:songle
npm run dev
```

`music_src` は従来互換の公開素材ディレクトリとして使っています。既存の `music_src/Lyrics.txt` はUTF-8のまま読み込みます。

分離構成を試す場合は、2つのターミナルで起動します。

```powershell
npm run dev:system
npm run dev:songs
```

その後、システム側を次のURLで開きます。

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/shining-star/manifest.json
```

この構成では、Webシステムは曲の中身を決めません。`song` クエリで指定された `manifest.json` を読み、歌詞、Songle JSON、palette、markers、手動タイミング、音源パスを曲パッケージ側から取得します。

## Material Layout

```text
music_src/
  manifest.json
  CREDITS.md
  Lyrics.txt
  analysis/
    song.json
    beat.json
    chord.json
    melody.json
    chorus.json
    palette.json
    markers.json
  audio/
    shining_star.mp3
```

音源を置ける場合は `music_src/audio/shining_star.mp3` に配置してください。未配置でも内部クロックで映像だけ動きます。画面下の `Audio` からローカル音源を選ぶこともできます。

## Song Package Layout

曲ごとの素材は `song-packs/<song-id>/` にも置けます。別サーバーで配信できるよう、曲の入口は `manifest.json` にします。

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

音源ファイルはライセンス上コミットしません。分離サーバーで音源も配信したい場合は、ローカル環境で `song-packs/shining-star/audio/maou_14_shining_star.mp3` のように配置してください。

`manifest.json` は曲パッケージの入口です。相対パスは manifest の場所を基準に解決されます。別の曲や別システムへ持ち出す場合も、この manifest と `design/` の演出意図を中心に扱います。

## Design

- 硬いネオンではなく、柔らかい星光、暖色、淡い青、淡い桃色、中間調を重ねます。
- beatを発火条件にして背景発光と光線を動かします。
- chorus区間では光量、線の密度、粒子の広がりを増やします。
- 色や明るさは即時ジャンプではなく、ダンピング制御で少し遅れて追従します。
- 動点をタイミングよく線で結び、柔らかい光線として描きます。

## Songle JSON

`npm run download:songle` は以下のSongle Widget API JSONを `music_src/analysis/` に保存します。

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

打刻データと補正値はブラウザの `localStorage` に自動保存されます。調整中の歌詞表示は、画面上のストーン位置に即時追従します。確定版として同梱したい場合は、書き出したJSONを `music_src/analysis/lyrics_timing.json` として配置してください。次回起動時にそのタイミングが読み込まれます。

## License Safety

魔王魂の音楽は、生成AIへの学習利用が禁じられています。このプロジェクトでは次を前提にします。

- 音源ファイルをAI学習に使わない。
- 音源波形をCodexやアプリ側で解析し直さない。
- ブラウザ上では音源を再生するだけにする。
- 演出タイミングはSongle/TextAlive由来のJSON、歌詞テキスト、手動マーカーから作る。
- 公開やイベント利用時は、魔王魂とSongle/TextAlive側の利用条件を確認する。

## Architecture Direction

このWebシステムは曲アプリを束縛する親ではなく、補助ランタイムとして扱います。

- System: 再生、入力、フレームループ、全画面、保存、歌詞タイミング編集などを提供する。
- Song Package: 曲ごとの素材、解析JSON、演出意図、クレジット、手動タイミングを持つ。
- Adapter: Web、TouchDesigner、Unityなど、実行環境ごとの接続コードを後付けできるようにする。

今の実装では、まず `manifest.json` と `?song=` により曲データの外部化を始めています。次の段階で、Shining Star固有の演出を曲側の Web adapter へ移す予定です。
