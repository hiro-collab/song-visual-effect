# Song Packs

このディレクトリには曲ごとのパッケージを置きます。

重要:

- ここにある既存曲はテンプレートではありません。
- 新しい曲を作るときは、既存の曲パッケージを見ないでください。
- 既存曲は、その曲自身の修正や回帰確認にだけ使います。
- 曲ごとの構成、JSON文法、演出コード、UI、描画方式は自由に変えて構いません。
- 同一ビルドで曲固有adapterを試す場合、adapter本体は `song-packs/<song-id>/adapter.ts` に置き、登録は `song-packs/local-adapters.ts` にだけ追加します。
- `system/kit` や `examples/fixture-player/adapters/registry.ts` に曲ID直書きのadapter importを追加しないでください。

新しい曲を作るときは、先に次を読んでください。

```text
docs/system-overview.md
docs/song-authoring.md
```

同梱のfixture playerで読む場合は、入口としてmanifest URLが必要です。ただしmanifestの先の構造は曲ごとに設計して構いません。
