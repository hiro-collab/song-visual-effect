# Lyric Timing Workbench

Lyric Timing Workbench は、歌詞表示タイミングを作成、確認、書き出しするための付属ツールです。
music-effect repo 内で開発しますが、本体 player や Launch Manager の機能ではなく、将来単体配布や別repo分離ができる独立したソフトとして扱います。

この文書は、system側とWorkbench担当の境界を決める正本です。細かいショートカットや編集手順は、専用Workbench側で詰めます。

## 目的

- ローカル音源と歌詞txtをブラウザで読み込み、歌詞フレーズのタイミングを編集する。
- 編集作業の正本として Workbench project JSON を保存する。
- 必要に応じて Music Effect 用の完成 lyric timing JSON を書き出す。
- Songle / TextAlive 周辺の考え方に寄せ、将来 import/export 変換を追加しやすい構造にする。

## 配置

- `system/kit/lyrics/`: UIを持たない共通ロジック。型、txt parser、validation、export、runtime適用helperを置く。
- `tools/lyric-timing-workbench/`: 独立したViteアプリ。Music Effect本体playerやLaunch ManagerのDOM/CSSへ依存しない。
- `docs/lyric-timing-workbench.md`: 方針と境界の正本。

## 境界

- 開発場所はこのリポジトリ内に置く。
- 肥大した場合は別プロジェクトへ分離できるようにする。
- 本体player、Launch Manager、既存fixtureのDOM/CSSには依存しない。
- 音源はブラウザ内でローカル再生するだけにし、アップロード、保存、AI解析、AI学習に使わない。
- 完成した歌詞タイミングJSONを曲パックや曲別映像へコピーして使う。
- 音源ファイルは project JSON や export JSON に含めない。
- `audioRef.fileName` と、取得できる場合だけ `audioRef.durationMs` を保存してよい。
- ローカル絶対パス、音源バイナリ、音源ハッシュは保存しない。
- 歌詞本文を含む Workbench project JSON はローカル編集作業ファイルであり、権利確認なしにGitHubや公開配布へ置かない。
- 歌詞本文を含む export を公開、配布、アップロード、コミットする前に、歌詞の権利と配布先の利用条件を確認する。
- Workbenchはブラウザ内のIndexedDBへ自動保存下書きを作れる。下書きは同じブラウザ/同じorigin内だけに残り、音源ファイル本体、ローカル絶対パス、音源ハッシュは含めない。
- 自動保存下書きには歌詞本文を含みうるため、復元用のローカル作業データとして扱う。不要になったらWorkbench内の破棄操作で削除できる。

## 入力

Workbenchは、歌詞テキストだけでも開始できるようにする。

- 歌詞テキスト: 1行を1cue候補として扱う。
- 既存タイミングJSON: Songle由来、旧Music Effect形式、Workbench project形式など。
- 音源ファイル: ローカルブラウザ再生用。project/export JSONへ同梱しない。

Songle由来の区切り、重複、欠落、誤字がある場合に備え、cueの追加、削除、分割、結合、本文修正もWorkbench側の将来責務に含める。ただしMVPではフレーズ分割/結合UIは扱わない。

## UI方針

- 主役は歌詞表示です。中央に現在のフレーズを大きく表示し、右側に次のフレーズを表示する。
- 準主役は再生と時間方向制御です。Current Phrase / Next Phraseの直下に再生、シーク、打刻操作、簡易シーケンスバーを置く。
- 曲名、アーティスト、音源ファイル名、長さは上部に常時表示し、URLやメモなど細かい情報はProject Detailsへ隠す。
- 歌詞と音源の読み込み入口は上部へまとめる。歌詞貼り付けはLoad Lyricsの特殊経路としてMore Source内に置く。
- 下部は縦のフレーズ表にし、現在/次の周辺フレーズを見ながら編集できるようにする。
- 色はWorkbench固有の緑を主軸にする。SongleのマゼンタやTextAliveの青を大きくコピーしない。
- 日本語/英語表示を切り替えられるようにする。歌詞本文、曲名、アーティスト、URL、メモは翻訳対象にしない。

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

- v2 export は `startTimeMs` / `endTimeMs` のミリ秒正本にする。
- `includesLyrics: true` の場合だけ各phraseへ `text` を含める。
- `includesLyrics: false` の timing only export は歌詞本文を含めない。
- 現行runtimeへ渡す必要がある場合は、`lyricTimingExportToLyricCues()` で秒ベースの `LyricCue` へ変換できる。

既存の手動タイミングexportや単純なruntime cue JSONでは、互換性のため `start` / `end` や `startSec` / `endSec` を使ってよい。ただし新しく作るJSONでは、必ず単位が分かるfield名か `timeUnit` を持たせる。

## 時間単位

曖昧な `start` / `time` だけに依存しない。新しく作るデータは単位を明示する。

推奨:

- Workbench project内の正本: `startTimeMs` / `endTimeMs` のミリ秒整数。
- Workbench v2 export: `startTimeMs` / `endTimeMs` のミリ秒整数。
- 直接runtime cueへ渡す簡易export: `startSec` / `endSec` の秒小数。
- export全体に `timeUnit: "seconds"` または `timeUnit: "milliseconds"` を置いてもよい。

例:

```json
{
  "schema": "music-effect.lyrics-timing.v2",
  "timeUnit": "milliseconds",
  "phrases": [
    {
      "id": "phrase-0001",
      "index": 0,
      "startTimeMs": 12345,
      "endTimeMs": 15678,
      "text": "hello"
    }
  ]
}
```

system loaderは、以下の順で読む。

1. `timeSec` / `startSec` / `endSec` / `durationSec` など、秒がfield名で分かる値。
2. `timeMs` / `startTimeMs` / `endTimeMs` / `durationMs` など、ミリ秒がfield名で分かる値。
3. `timeUnit` があるobject配下の `time` / `start` / `end` / `duration`。
4. 旧データ向けのlegacy推測。数値が1000より大きい場合だけミリ秒扱いする。

Songleの生JSONには、1000未満のミリ秒値が含まれる可能性がある。新規toolや新規exportでは必ず単位を明示し、legacy推測へ依存しない。

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
