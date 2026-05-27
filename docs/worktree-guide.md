# Git Worktree Guide

このリポジトリでは、親ディレクトリ `C:\Users\kawai\works` を汚さないため、
作業用 Git worktree をプロジェクト直下の `_worktrees/` に集約します。

## 基本構成

別PCへ新しく clone する場合は、まず `docs/remote-workstation-setup.md` を読んでください。既存PCの `_worktrees/` をコピーせず、GitHubから `main` を明示してcloneし、必要なworktreeを作り直します。

- `C:\Users\kawai\works\music-effect`
  - 管理用のルート worktree。ここが常に最新基準とは限りません。
  - `_worktrees/` は `.gitignore` 済みなので、ルートの `git status` を汚しません。
- `C:\Users\kawai\works\music-effect\_worktrees\system-main`
  - 現在のメイン相当の統合基準です。
  - branchは `main` です。
  - 新しい作業や新しい曲のworktreeは、原則としてここから分岐します。
- `C:\Users\kawai\works\music-effect\_worktrees\<name>`
  - 並行作業用の追加worktree。
  - 実際に存在するworktreeとbranchは `git worktree list` で確認します。

## worktree名の目安

新しいworktree名は、担当範囲が一目で分かる名前にします。

- `system-main`: メイン相当の統合基準。通常は直接大きな実装を抱え込まない。
- `feature-<topic>`: Launch Manager、保存API、検証ツールなどのシステム機能。
- `song-<song-id>`: 曲ごとの映像、adapter、cue、design。
- `security-<topic>`: セキュリティレビューや境界強化。
- `retired-<topic>`: 参照だけ残す古い実装。新規作業の土台にしない。

既存の古いworktree名はすぐに全部変えなくて構いません。ただし、新しく始める作業はこの命名に寄せてください。

## よく使う確認コマンド

```powershell
git worktree list
git status --short --branch
npm run sync:brief
npm run sync:check
npm run sync:inbox
```

各 worktree で作業するときは、そのディレクトリに移動してから状態を確認します。

```powershell
cd C:\Users\kawai\works\music-effect\_worktrees\download-security
git status --short --branch
```

## 新しい作業worktreeを作る

新しい曲や新しい機能は、原則として `main` から分岐します。

プロジェクトルート `C:\Users\kawai\works\music-effect` で実行する例:

```powershell
git worktree add _worktrees\song-new-song -b codex/song-new-song main
```

システム機能の場合:

```powershell
git worktree add _worktrees\feature-launch-gui -b codex/feature-launch-gui main
```

作成後は、そのworktreeへ移動して `git status --short --branch` と `npm run sync:brief` を確認します。

## 並行作業の通知

各 worktree は、他の担当に取り込ませてよいコミットができた時点で
ready 通知を出せます。

```powershell
npm run sync:ready -- -m "short explanation"
```

他の worktree は次で未取り込みの ready 通知を確認します。

```powershell
npm run sync:brief
npm run sync:check
```

取り込む場合は次を使います。

```powershell
npm run sync:merge -- --from codex/download-security
```

詳細は `docs/worktree-sync.md` を見てください。

commitを伴わない質問や確認依頼は note 通知を使います。

```powershell
npm run sync:note -- --from system --to traffic-jam-redo --level question -m "CREDITS.mdを新構成で戻せますか"
npm run sync:inbox
```

`sync:note` は未コミット変更があっても送れます。取り込んでよいcommitを知らせる場合は、これまで通り `sync:ready` を使ってください。
対応済みの連絡は `sync:brief` に表示される `#id` を使って確認済みにできます。

```powershell
npm run sync:ack -- --id abc123def0 --from system
```

## 開発サーバーの注意

複数 worktree で同時に起動する場合も、通常は手でポート番号を割り当てません。`npm run dev` と `start-music-effect.cmd` はworktree rootから安定した候補帯を作り、Launch Manager、Deck A player、Deck B player、song-pack server用の空きポートを自動で選びます。実際の値はGUI下部と `.codex/runtime/ports.json` に記録されます。

明示的に固定したい場合だけ、次のように環境変数を指定します。

```powershell
$env:DEV_MANAGER_PORT=5182
$env:DECK_A_PLAYER_PORT=5183
$env:DECK_B_PLAYER_PORT=5185
$env:SONG_PACK_PORT=5184
npm run dev
```

`PLAYER_PORT` はDeck A互換値として残っています。`npm run dev` 経由で起動する場合、`launch/targets.json` がDeck A/Bのplayer portに合わせた `SONG_PACK_CORS_ORIGINS` を song-pack server へ渡します。

個別に `npm run dev:songs` だけを起動する場合は、player側のoriginに合わせて `SONG_PACK_CORS_ORIGINS` を手動で指定してください。

```powershell
$env:SONG_PACK_PORT=5184
$env:SONG_PACK_CORS_ORIGINS="http://127.0.0.1:5183,http://localhost:5183"
npm run dev:songs
```

Launch Managerの停止操作は、そのLaunch Manager自身が起動したmanaged targetだけを止めます。別worktreeのサーバーや手動起動した外部プロセスは停止対象にしません。

## 依存関係

`node_modules/` は Git 管理外です。新しい worktree で初めてビルドや起動を行う場合は、
その worktree 内で依存関係を用意してください。

```powershell
npm install
npm run build
```

## 重要な運用ルール

- 曲ごとの演出を作るときは、既存曲パッケージの構成に引っ張られないようにします。
- まず `AGENTS.md` と `docs/system-overview.md`、必要なら `docs/song-authoring.md` を読みます。
- 既存曲の実装は参考例ではなく、あくまでその曲専用のアプリケーションとして扱います。
- システム側は曲を縛らず、補助機能だけを提供する方針を保ちます。
