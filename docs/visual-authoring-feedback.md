# Visual Authoring Feedback Loop

この文書は、共有ノウハウを各曲映像へ戻して改善するための運用です。

目的は、曲ごとの見た目を揃えることではありません。共有された考え方や検証観点を、それぞれの曲担当が自分の曲に合う形で使えるか確認し、必要なら映像側へ反映することです。

## 基本方針

- system担当は「答え」ではなく「問い」と「確認観点」を配る。
- 曲担当は既存曲の見た目を真似ず、自分の曲パックだけを見て判断する。
- 共通化するのはプロセス、レビュー観点、検証方法だけにする。
- 色、構図数値、モチーフ、演出名、具体的な形状、タイミングは曲側に残す。
- 反映しない判断も有効な回答として扱う。

## 使うtopic

### knowledge-candidate

曲担当からsystemへ送る「共通ノウハウ候補」です。

```powershell
npm run sync:note -- --from <担当> --to system --level question --topic knowledge-candidate -m "candidate: ... scope: ... source: ... risk: ... suggested home: ..."
```

system担当は `docs/knowledge-review.md` に沿って `common` / `conditional` / `song-owned` / `reject` に分類します。

### visual-authoring-feedback

systemから曲担当へ、または曲担当からsystemへ送る「映像へ反映するための相談」です。

```powershell
npm run sync:note -- --from system --to all --level question --topic visual-authoring-feedback -m "review focus: ... please check your own song only and reply with apply/no-apply/need-system-help."
```

曲担当の返答例:

```powershell
npm run sync:note -- --from <担当> --to system --level info --topic visual-authoring-feedback -m "song: <song-id>; apply: ...; no-apply: ...; need-system-help: ...; checks: ..."
```

## system担当が投げるレビュー観点

system担当は、各曲に同じ見た目を求めず、次のような中立的な観点を投げます。

- 曲のパートごとに「何を見る時間か」が分かるか。
- 各パートの違いが、単なる強度や粒子量の増減だけになっていないか。
- 表示範囲、密度、余白、視線誘導、主役構造が曲に合っているか。
- 盛り上がり、緊張、解放、間奏、終止の扱いが変化しているか。
- beat同期の鋭い層と、遅れて追う柔らかい層を分ける必要があるか。
- 場面の違いがカメラ距離だけで伝わらない場合、大きなレイヤー変化を検討したか。
- Songle、歌詞理解、背景調査、公開感想を、曲固有の解釈として安全に扱えているか。
- 歌詞全文、記事本文、画像、スクリーンショット、コメント本文を保存していないか。
- previewやsnapshotで、狙った時刻の見え方を確認したか。
- system側に不足している検証ツール、補助API、ドキュメントがあるか。

## 曲担当の返答フォーマット

曲担当は、自分の曲だけを見て返答します。

```text
song:
  <song-id>

review focus:
  systemから投げられた観点

apply:
  実際に映像へ反映すること。なければ none。

no-apply:
  この曲には合わないため反映しないこと。理由も書く。

song-owned:
  曲固有として残す判断、数値、モチーフ、構図、ラベル。

need-system-help:
  system側にほしい補助、検証、docs、API。なければ none。

checks:
  song:validate、build、preview:snapshot、ブラウザ確認など。

knowledge-candidate:
  追加で共通化候補があればidまたは要約。なければ none。
```

## 反映サイクル

1. system担当が `visual-authoring-feedback` でレビュー観点を共有する。
2. 各曲担当は `sync:onboard` を実行し、自分の曲パックだけを見て確認する。
3. 各曲担当は、反映する、反映しない、system支援が必要、のいずれかを返す。
4. 曲側で反映する場合は小さく変更し、`song:validate` と `build` を確認する。
5. system担当は返答を見て、必要な共通改善だけを `docs/knowledge-review.md` で審議する。
6. 曲固有の発見は、その曲の `design/` や `README.md` に残す。

## してはいけないこと

- ある曲の構図やモチーフを全曲に適用する。
- `song-preview-lab` の曲を新曲のテンプレートとして読む。
- 公開感想やコメント本文、歌詞全文、記事本文を保存する。
- 共通ノウハウ候補を審議せずに正本docsへ入れる。
- 反映すること自体を目的にして、曲に合わない変更を入れる。
