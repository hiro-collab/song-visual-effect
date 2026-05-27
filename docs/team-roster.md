# Team Roster

Encoding note: This file is UTF-8. In Windows PowerShell 5.1, use `Get-Content -Encoding UTF8 docs\team-roster.md` if Japanese text looks garbled.

この文書は、並行作業中の「担当」と「worktree / branch / 宛先ラベル」を対応させるための名簿です。

正本データは `config/sync-participants.json` です。人間が読むときはこの文書、ツールが読むときは JSON を使います。

## 使い方

作業開始時に、自分がどの担当として扱われているか確認します。

```powershell
npm run sync:roster
npm run sync:onboard -- --for <担当ラベル>
```

連絡するときは、名簿の `label`、`branch`、または `aliases` を宛先に使います。

```powershell
npm run sync:note -- --from system --to igaku-effect --level question --topic visual-authoring-feedback -m "..."
```

## 現在の担当

| label | role | song | branch | worktree | status |
|---|---|---|---|---|---|
| system | system |  | `main` | `_worktrees/system-main` | active |
| song-preview-lab | preview |  | `codex/song-preview-lab` | `_worktrees/song-preview-lab` | active |
| security | system |  | `codex/download-security` | `_worktrees/download-security` | active |
| beat-sync | system |  | `codex/beat-sync-kit` | project root | active |
| launch-menu-gui | support |  | `codex/launch-menu-gui` | `_worktrees/launch-menu-gui` | active |
| message-viewer | support |  | `codex/message-viewer-gui` | `_worktrees/message-viewer-gui` | integrated |
| common-contact-tooling | support |  | `codex/common-contact-tooling` | `_worktrees/common-contact-tooling` | active |
| mesmerizer-signal-lock | song | `mesmerizer-signal-lock` | `codex/mesmerizer-signal-lock` | `_worktrees/mesmerizer-signal-lock` | active |
| igaku-effect | song | `igaku` | `codex/igaku-effect` | `_worktrees/igaku-effect` | active |
| issen-kounen-effect | song | `issen-kounen` | `codex/issen-kounen-effect` | `_worktrees/issen-kounen-effect` | active |
| monitoring-effect | song | `monitoring` | `codex/monitoring-effect` | `_worktrees/monitoring-effect` | active |
| ope-effect | song | `ope` | `codex/ope-effect` | `_worktrees/ope-effect` | active |
| traffic-jam-redo | song | `traffic-jam` | `codex/traffic-jam-redo` | `_worktrees/traffic-jam-redo` | active |
| launch-manager | support |  | `codex/launch-manager` | `_worktrees/launch-manager` | dormant |
| traffic-jam-effect | song | `traffic-jam` | `codex/traffic-jam-effect` | `_worktrees/traffic-jam-effect` | rejected |
| live-beat-sync-prototype | system |  | `codex/live-beat-sync-prototype` |  | reference-only |

## ルール

- `main` が配布・開発の正本です。`codex/system-kit-refactor` は旧名として一時的にaliasだけ残します。
- 複数曲をまとめて動作確認する場合は `song-preview-lab` を使います。新しい曲制作の土台にはしません。
- 新しい担当を増やしたら、まず `config/sync-participants.json` に追加します。
- `status: rejected` と `status: reference-only` の branch は、明示指示がない限り merge しません。
- 曲担当への連絡は、できるだけ曲IDではなく担当 `label` に送ります。例: `igaku` ではなく `igaku-effect`。
- ただし `aliases` に曲IDも登録されているため、古い連絡との互換性は残します。
- 実際のCodex会話スレッドIDはこのリポジトリからは見えません。この名簿では、運用上のスレッド識別子として worktree / branch / label を扱います。
