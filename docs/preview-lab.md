# Song Preview Lab

この文書は、複数の曲担当が作った映像を、中央の検証環境でまとめて確認するための運用メモです。

## 役割

- `system-main`: system kitの正本。新曲担当が土台にする。曲固有の映像実装を集めすぎない。
- `song-preview-lab`: 動作検証用の全部入りworktree。ready済みの曲パックを取り込み、Launch Managerの曲メニューからまとめて確認する。
- 各曲worktree: 曲ごとの制作場所。曲固有のmanifest、analysis、design、adapter、assetを保持する。

`song-preview-lab` は配布用ではありません。重くなってよく、複数曲の比較、起動確認、依存確認、表示崩れ確認に使います。

## 作り方

```powershell
git worktree add _worktrees/song-preview-lab -b codex/song-preview-lab codex/system-kit-refactor
```

既に存在する場合は、そのworktreeでsystem-mainのreadyを取り込みます。

```powershell
cd _worktrees/song-preview-lab
npm run sync:brief
npm run sync:check
```

曲担当からreadyが出たら、system担当がライセンス、依存、曲固有配置、音源/歌詞混入を確認してから `song-preview-lab` にだけ取り込みます。`system-main` へ戻すのは、曲に依存しない共通改善だけです。

## 起動

```powershell
npm run dev
```

Launch Managerはworktreeごとに空きポートを自動割当します。実際の値はGUI下部と `.codex/runtime/ports.json` を見てください。

## 確認すること

- 曲メニューに取り込んだ曲が出るか。
- `選択曲を再生` で必要なtargetが起動するか。
- player URLの `song=` が、同じworktreeのsong-pack serverを向いているか。
- console warn/errorが出ていないか。
- CPU、memory、port、logの表示が追えるか。
- 停止操作が、このLaunch Managerのmanaged targetだけに効くか。

## 注意

- 新しい曲を作る担当は、`song-preview-lab` を参考にしない。既存曲の構成に引っ張られるため。
- `song-preview-lab` に入った曲パックは検証対象であり、systemの標準テンプレートではない。
- 配布用に軽い状態を作る場合は、`system-main` を土台にし、必要な曲パックだけを明示的に含める。
