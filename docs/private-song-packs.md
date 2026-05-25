# Private Song Packs

`song-packs/` は、公開リポジトリには含めない曲パッケージのローカル配置場所です。
曲ごとの manifest、analysis、design、adapter、asset、CREDITS、README は private repo 側で管理します。

## リポジトリ

- public system repo: `https://github.com/hiro-collab/song-visual-effect.git`
- private song-packs repo: `https://github.com/hiro-collab/song-visual-effect-song-packs.git`

private repo は、公開repoの `song-packs/` 直下へ clone します。
private repo のルートが、そのまま旧 `song-packs/` の中身です。

```powershell
cd C:\Users\kawai\works\music-effect\_worktrees\system-main
git clone https://github.com/hiro-collab/song-visual-effect-song-packs.git song-packs
```

すでに `song-packs/` が存在する場合は、そこが private repo になっているか確認します。

```powershell
git -C song-packs status --short --branch
git -C song-packs remote -v
```

## 公開repo側の扱い

- `song-packs/` は `.gitignore` で除外します。
- system kit、Launch Manager、fixture player は `song-packs/` が空または未配置でも起動できるようにします。
- 曲パッケージがない場合、Launch Managerの曲一覧は空になります。
- `song-packs/local-adapters.ts` は private repo 側に置きます。fixture playerはこのファイルが存在する場合だけ optional に読み込みます。

## 曲担当へのルール

- 曲固有の変更は private repo 側の `song-packs/<song-id>/` に閉じます。
- 公開repo側の `system/kit`、`examples/fixtures/soft-light-player`、`docs/` 直下へ曲ID直書きの実装を増やしません。
- 音源、歌詞全文、権利不明素材、秘密情報をコミットしません。
- 追加assetは、出典、ライセンス、容量、利用条件を `README.md` / `CREDITS.md` に記録します。

## 履歴の注意

この分離は、今後の公開ブランチ先端から `song-packs/` を外すためのものです。
過去に公開repoへpush済みのGit履歴から完全に消すには、別途履歴を書き換える作業が必要です。
履歴書き換えは既存branchや他担当worktreeへ影響が大きいため、実施前に明示的に判断します。
