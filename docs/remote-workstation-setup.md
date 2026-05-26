# Remote Workstation Setup

別PCで GitHub から clone し、外出先でも同じ前提で実装作業を続けるためのセットアップ手順です。

## 結論

- 公開 system repo だけで、system kit の実装、docs更新、build/test、Launch Manager の基本起動確認はできます。
- 曲ごとの manifest、analysis、design、adapter、asset は private repo 側です。曲制作や曲再生確認をするPCでは、別途 `song-packs/` へ private song-packs repo を clone します。
- GitHub の既定branchに依存せず、作業基準は `codex/system-kit-refactor` を明示して clone します。
- `node_modules/`、`dist/`、`.codex/runtime/`、`_worktrees/`、`song-packs/` はローカル再生成または別repo cloneで用意します。

## 必要なもの

- Git。
- Node.js と npm。`package-lock.json` 上の Vite は Node.js `^18.0.0 || ^20.0.0 || >=22.0.0` を要求します。
- GitHub の `hiro-collab/song-visual-effect` へのアクセス。
- 曲作業をする場合は、private repo `hiro-collab/song-visual-effect-song-packs` へのアクセス。
- preview snapshot を使う場合は、ローカルの Chrome または Edge。

APIキー、個人アクセストークン、音源ファイル、権利未確認の歌詞全文は repo に置かないでください。

## 1. Public System Repo を Clone する

新しいPCでは、まず system 側の公開repoを clone します。

```powershell
git clone --branch codex/system-kit-refactor https://github.com/hiro-collab/song-visual-effect.git music-effect
cd music-effect
git status --short --branch
git remote -v
```

すでに既定branchで clone 済みの場合は、必ず基準branchを確認します。

```powershell
git fetch origin
git switch --track origin/codex/system-kit-refactor
git status --short --branch
```

既存PCではプロジェクトルートが別作業branchで、`_worktrees/system-main` が統合基準になっていることがあります。新しいPCでは、最初の単一cloneを `codex/system-kit-refactor` にしておけば、そのclone rootを基準作業場所として使えます。

## 2. 依存関係を入れて確認する

fresh clone では `npm ci` を使います。依存更新を意図する場合だけ `npm install` を使います。

```powershell
npm ci
npm run build
npm test
npm run docs:check
```

`start-music-effect.cmd` は、`node_modules/` が無い場合に `npm ci` を実行してから Launch Manager を起動します。手動で確認したい場合は次を使います。

```powershell
npm run dev
```

`song-packs/` が未配置でも、system 側の build/test と Launch Manager の基本起動はできます。その場合、Launch Manager の曲一覧は空になります。

## 3. Private Song Packs を配置する

曲再生、曲制作、曲パック検証を行うPCでは、公開repo直下の `song-packs/` に private repo を clone します。

```powershell
git clone https://github.com/hiro-collab/song-visual-effect-song-packs.git song-packs
git -C song-packs status --short --branch
git -C song-packs remote -v
```

配置後、代表曲または担当曲で検証します。

```powershell
npm run song:validate -- --id shining-star
npm run song:smoke -- --id shining-star
```

private repo にアクセスできない場合は、曲一覧、曲固有adapter、曲パック検証、曲のpreviewはできません。system 側の作業だけ進めるか、private repo の権限を用意してください。

音源ファイルは Git 管理しません。必要な場合は、権利と用途を確認したうえで各PCへ個別に置きます。音源をCodexやツールで解析しないでください。

## 4. Launch Manager を起動する

通常は手動で port を割り当てる必要はありません。

```powershell
npm run dev
```

Windows では `start-music-effect.cmd` をダブルクリックしても起動できます。起動後、実際の port は Launch Manager GUI 下部と `.codex/runtime/ports.json` に表示されます。

明示的に固定する場合だけ、起動前のシェルで指定します。

```powershell
$env:DEV_MANAGER_PORT=5182
$env:DECK_A_PLAYER_PORT=5183
$env:DECK_B_PLAYER_PORT=5185
$env:SONG_PACK_PORT=5184
npm run dev
```

Launch Manager の停止操作は、その Launch Manager 自身が起動した managed target だけを対象にします。別worktree、別PC、手動起動した外部プロセスは停止対象にしません。

## 5. Worktree と Codex 作業を再開する

単一作業だけなら、clone root の `codex/system-kit-refactor` 上で作業を始めて構いません。並行作業をする場合は、ローカルに worktree を作り直します。

```powershell
git worktree list
git worktree add _worktrees/feature-topic -b codex/feature-topic codex/system-kit-refactor
cd _worktrees/feature-topic
npm ci
git status --short --branch
```

Codex セッションを始めるときは、まず担当と同期状況を確認します。

```powershell
npm run sync:roster
npm run sync:onboard -- --for system
npm run sync:brief -- --for system
```

担当名、branch、worktree、宛先ラベルは `config/sync-participants.json` と `docs/team-roster.md` を正本にします。新しい担当branchを正式な並行作業にする場合は、名簿更新も検討してください。

## 6. ローカル専用データの扱い

次は GitHub clone では移動しません。

- `node_modules/`: `npm ci` で再生成します。
- `dist/`: build成果物なので再生成します。
- `.codex/runtime/`: port、ログ、snapshotなどのPC固有データです。
- `_worktrees/`: 各PCで `git worktree add` し直します。
- Git共通ディレクトリ配下の `codex-sync/events.jsonl`: ローカル連絡板です。別PCでは空から始まることがあります。
- `song-packs/`: private repo として別途 clone します。
- 音源や未公開素材: Gitではなく、権利と保管先を確認して個別に扱います。

PCをまたぐ作業引き継ぎは、ローカル同期イベントだけに頼らず、commitして GitHub へ push します。未コミット変更がある場合は、commit、stash、patch化、または作業内容のメモ化をしてから移動してください。

## 7. よくある確認

clone後に違うbranchにいる:

```powershell
git branch -a
git switch --track origin/codex/system-kit-refactor
```

private repo の認証で止まる:

```powershell
git -C song-packs remote -v
```

Git Credential Manager や `gh auth login` などでGitHub認証を整えます。トークンをrepo内ファイルへ保存しないでください。

`song:validate` が `manifest.json not found` になる:

```powershell
Test-Path song-packs
Get-ChildItem song-packs
```

`song-packs/` が未配置、または指定した `--id` がprivate repoに無い状態です。

日本語が文字化けする:

```powershell
Get-Content -Encoding UTF8 docs\remote-workstation-setup.md
```

## 作業開始時に読むもの

- `AGENTS.md`
- `docs/thread-start.md`
- `docs/sync-onboarding.md`
- `docs/worktree-guide.md`
- `docs/private-song-packs.md`

新しい曲を作る場合は、既存曲の中身を読まずに `docs/system-overview.md`、`docs/project-scope.md`、`docs/song-authoring.md`、`docs/song-visual-independence.md` から始めます。
