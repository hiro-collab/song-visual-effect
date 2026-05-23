# Git Worktree Guide

このリポジトリでは、親ディレクトリ `C:\Users\kawai\works` を汚さないため、
作業用 Git worktree をプロジェクト直下の `_worktrees/` に集約します。

## 基本構成

- `C:\Users\kawai\works\music-effect`
  - 管理用のルート worktree、または通常作業用のworktree。
  - `_worktrees/` は `.gitignore` 済みなので、ルートの `git status` を汚しません。
- `C:\Users\kawai\works\music-effect\_worktrees\<name>`
  - 並行作業用の追加worktree。
  - 実際に存在するworktreeとbranchは `git worktree list` で確認します。

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

現時点の開発サーバーは既定ポートを使うため、複数 worktree で同時に起動すると
ポート衝突が起きる可能性があります。

当面は、実際にブラウザで動かす worktree を一つに絞ってください。
並行作業で複数サーバーを同時起動したくなったら、次の改善として
`launch-manager` 側でポート割り当てと一括停止を整備します。

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
