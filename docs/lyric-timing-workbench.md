# Lyric Timing Workbench

歌詞タイミング調整ツールは、Music Effect本体に密結合しない付属ソフトとして開発する。

この文書は、system側と専用Workbench担当の境界だけを決める。細かいUI、ショートカット、編集手順は専用スレッドで詰める。

## 位置づけ

- 開発場所はこのリポジトリ内に置く。
- 肥大した場合は別プロジェクトへ分離できるようにする。
- 本体player、Launch Manager、既存fixtureのDOM/CSSには依存しない。
- 音源はブラウザ内でローカル再生するだけにし、アップロード、保存、AI解析、AI学習に使わない。
- 完成した歌詞タイミングJSONを曲パックや曲別映像へコピーして使う。

想定配置:

- `system/kit/lyrics/`: DOM非依存の型、正規化、検証、export helper。
- `tools/lyric-timing-workbench/`: 単体で起動できる編集UI。
- `docs/lyric-timing-workbench.md`: systemとの境界と引き継ぎ。

## 入力

Workbenchは、歌詞テキストだけでも開始できるようにする。

- 歌詞テキスト: 1行を1cue候補として扱う。
- 既存タイミングJSON: Songle由来、旧Music Effect形式、Workbench project形式など。
- 音源ファイル: ローカルブラウザ再生用。project/export JSONへ同梱しない。

Songle由来の区切り、重複、欠落、誤字がある場合に備え、cueの追加、削除、分割、結合、本文修正もWorkbench側の責務に含める。

## 時間単位

曖昧な `start` / `time` だけに依存しない。新しく作るデータは単位を明示する。

推奨:

- Workbench project内の正本: `startTimeMs` / `endTimeMs` のミリ秒整数。
- Music Effect向けexport: `startSec` / `endSec` の秒小数。
- export全体に `timeUnit: "seconds"` を置いてもよい。

例:

```json
{
  "schema": "music-effect.lyrics-timing.v1",
  "timeUnit": "seconds",
  "lyrics": [
    {
      "index": 0,
      "startSec": 12.345,
      "endSec": 15.678,
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

## exportの扱い

Music Effect向けexportは、差分ではなく完成済みの歌詞タイミングJSONとして扱う。

- 各cueは表示順、本文、開始時刻、終了時刻を持つ。
- すべてのcueに時刻が入っている状態を完成形とする。
- 音源ファイル、歌詞全文の権利条件、出典は曲パック側のREADME/CREDITSで管理する。

既存の手動タイミングexportは互換性のため `start` / `end` も残せるが、新しい読み取りでは `startSec` / `endSec` を優先する。
