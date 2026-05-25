# Fixture Player

このディレクトリは、system kitの動作確認用アプリです。
新しい曲の標準構成、標準UI、標準rendererではありません。

## ここに置くもの

- system kitの回帰確認に必要な最小のプレイヤー実装。
- optional toolの検証UI。
- fixtureとして使うbuiltin adapter。
- 既存fixture rendererの保守に必要なeffectコード。

## ここに置かないもの

- 新しい曲の曲固有adapter。
- 曲ごとの本番用renderer。
- 曲ごとのcue文法やデータ構造を決めるコード。
- 既存fixtureの見た目を一般テンプレート化するコード。

曲固有adapterをローカルで同一ビルドに載せる必要がある場合も、adapter本体と登録は private repo 側の `song-packs/` に置きます。

新しい曲を作る場合は、このディレクトリを入口にせず、`docs/song-authoring.md` と `templates/neutral-song-app/` から始めてください。
