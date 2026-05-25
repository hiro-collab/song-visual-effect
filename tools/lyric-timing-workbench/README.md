# Lyric Timing Workbench

独立した歌詞タイミング編集ツールです。Music Effect本体playerやLaunch ManagerのDOM/CSSには依存しません。

```powershell
npm run dev:lyric-timing
```

現在の実装では、歌詞txtを読み込み、TextAlive互換モードまたはLiteralモードでフレーズ一覧へ変換できます。ローカル音源のブラウザ内再生、Current Phrase / Next Phrase表示、A/Dキーまたは画面ボタンでの打刻、Undo/Redo、Workbench project JSONの保存/読み込み、`music-effect.lyrics-timing.v2` の with lyrics / timing only export validationも入っています。

編集内容はブラウザ内のIndexedDBへ自動保存されます。リロード後に未保存下書きが見つかった場合は、復元、破棄、Projectとして保存を選べます。自動保存下書きにも音源ファイル本体は含めません。

UIは日本語/英語を切り替えられます。初期表示はブラウザ言語が日本語なら日本語、それ以外なら英語です。

音源ファイル本体、ローカル絶対パス、音源ハッシュはprojectへ保存しません。projectに保存するのは、ローカル音源のファイル名と取得できた場合のdurationだけです。

歌詞本文を含むproject/exportを公開、配布、アップロード、GitHubへコミットする前に、歌詞の権利と配布先の利用条件を確認してください。
