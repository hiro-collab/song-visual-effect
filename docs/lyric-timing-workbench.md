# Lyric Timing Workbench

Lyric Timing Workbench は、歌詞表示タイミングを作成、確認、書き出しするための付属ツールです。
music-effect repo 内で開発しますが、本体 player や Launch Manager の機能ではなく、将来単体配布や別repo分離ができる独立したソフトとして扱います。

## 目的

- ローカル音源と歌詞txtをブラウザで読み込み、歌詞フレーズのタイミングを編集する。
- 編集作業の正本として Workbench project JSON を保存する。
- 必要に応じて Music Effect 用の完成 lyric timing JSON を書き出す。
- Songle / TextAlive 周辺の考え方に寄せ、将来 import/export 変換を追加しやすい構造にする。

## 配置

- `system/kit/lyrics/`: UIを持たない共通ロジック。型、txt parser、validation、export、runtime適用helperを置く。
- `tools/lyric-timing-workbench/`: 独立したViteアプリ。Music Effect本体playerやLaunch ManagerのDOM/CSSへ依存しない。
- `docs/lyric-timing-workbench.md`: 方針と境界の正本。

## UI方針

- 主役は歌詞表示です。中央に現在のフレーズを大きく表示し、右側に次のフレーズを表示する。
- 準主役は再生と時間方向制御です。Current Phrase / Next Phraseの直下に再生、シーク、打刻操作、簡易シーケンスバーを置く。
- 曲名、アーティスト、音源ファイル名、長さは上部に常時表示し、URLやメモなど細かい情報はProject Detailsへ隠す。
- 歌詞と音源の読み込み入口は上部へまとめる。歌詞貼り付けはLoad Lyricsの特殊経路としてMore Source内に置く。
- 下部は縦のフレーズ表にし、現在/次の周辺フレーズを見ながら編集できるようにする。
- 色はWorkbench固有の緑を主軸にする。SongleのマゼンタやTextAliveの青を大きくコピーしない。
- 日本語/英語表示を切り替えられるようにする。歌詞本文、曲名、アーティスト、URL、メモは翻訳対象にしない。

## 境界

- 音源ファイルは project JSON や export JSON に含めない。
- ローカル音源はブラウザ内で再生、またはmetadata確認に使うだけにする。
- 音源をアップロードしない。AI学習や波形解析に使わない。
- project JSON には `audioRef.fileName` と、取得できる場合だけ `audioRef.durationMs` を保存してよい。
- ローカル絶対パス、音源バイナリ、音源ハッシュは保存しない。
- 歌詞本文を含む Workbench project JSON はローカル編集作業ファイルであり、権利確認なしにGitHubや公開配布へ置かない。
- 歌詞本文を含む export を公開、配布、アップロード、コミットする前に、歌詞の権利と配布先の利用条件を確認する。
- Workbenchはブラウザ内のIndexedDBへ自動保存下書きを作る。下書きは同じブラウザ/同じorigin内だけに残り、音源ファイル本体、ローカル絶対パス、音源ハッシュは含めない。
- 自動保存下書きには歌詞本文を含みうるため、復元用のローカル作業データとして扱う。不要になったらWorkbench内の破棄操作で削除できる。

## データ方針

Workbench project JSON の schema は `music-effect.lyric-timing-workbench.project.v1` です。

- 時刻正本はミリ秒整数。
- project 内の時刻フィールドは `startTimeMs` / `endTimeMs` とする。
- 未打刻フレーズは `startTimeMs: null` で表す。
- `endTimeMs` は未指定なら `null` でよい。
- export時は未指定の `endTimeMs` を次フレーズの `startTimeMs`、最後は `durationMs` またはfallback durationから補完する。
- project JSON は操作履歴や補正差分を正本として保存しない。
- Undo/Redo はUI操作として持つが、保存ファイルには最終的な各フレーズ時刻を保存する。
- 自動保存下書きはProject JSON相当のproject、元テキスト、表示中の選択状態だけを保持する。正式な受け渡しやコミットの正本は手動保存したWorkbench project JSONとする。

Music Effect v2 export の schema は `music-effect.lyrics-timing.v2` です。

- v2 export も `startTimeMs` / `endTimeMs` のミリ秒正本にする。
- `includesLyrics: true` の場合だけ各phraseへ `text` を含める。
- `includesLyrics: false` の timing only export は歌詞本文を含めない。
- 現行runtimeへ渡す必要がある場合は、`lyricTimingExportToLyricCues()` で秒ベースの `LyricCue` へ変換できる。

## 歌詞txt parser

MVPの編集単位は TextAlive でいうフレーズ、つまり歌詞txtの1行です。

Workbench project は将来 `words` / `chars` を持てる階層構造にしますが、MVPで編集するのは `phrases` のみです。

parser は2つのモードを持ちます。

- `textalive`: 行頭 `#` をコメントとして扱う。TextAlive互換を優先する。
- `literal`: 行頭 `#` も歌詞本文として扱う。

どちらのモードでも空行は歌詞cueにせず、section breakとしてprojectへ残します。
`textalive` モードでも `\#` で始まる行は、先頭の `#` を歌詞本文として扱います。

フレーズIDは `phrase-0001` のように歌詞行だけへ連番で付け、元txtとの対応用に `sourceLine` を保存します。

## MVP範囲

最初の実装範囲:

- 共通ロジックの型、parser、validation、export helper。
- 独立Viteアプリの起動骨格。
- 歌詞txt読み込み。
- TextAlive互換 / Literal parser切り替え。
- Current Phrase / Next Phrase表示。
- ローカル音源のブラウザ内再生/停止/シーク。
- 現在フレーズと次フレーズの打刻。
- 打刻解除。
- Undo/Redo。
- 縦型のフレーズ表。
- project JSON 読み込みと保存。
- v2 export with lyrics / timing only のvalidationとダウンロード。
- audioRef用のローカル音源metadata読み取り。

次段階:

- 全体ずらし、選択行以降ずらし。
- `startTimeMs` の数値編集。
- 打刻履歴や操作ログの見やすい表示。
- word/char単位の表示、選択、打刻UI。

MVP外:

- `endTimeMs` 手動上書きUI。
- フレーズ分割/結合UI。
- word/char単位編集UI。
- TextAlive完全互換export。
- Launch Manager連携。

## 起動

```powershell
npm run dev:lyric-timing
```

ビルド:

```powershell
npm run build:lyric-timing
```

このツールは単体のViteアプリとして起動します。Launch Managerとの連携は後回しです。
