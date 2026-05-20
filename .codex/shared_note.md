# Shared Note

## Current Project Shape

This repository is now a system host for song-specific interactive music effects.

The system host should provide helpers only:

- dev manager
- song-pack static server
- manifest loading
- transport
- frame loop
- input/surface helpers
- optional lyric timing tools

The system host must not define the creative structure of a new song.

## New Song Authoring Rule

When creating a new song package or song-specific effect system, do not inspect
existing `song-packs/*` unless the user explicitly asks to use a specific song as
a reference.

Start from:

- `AGENTS.md`
- `docs/system-overview.md`
- `docs/song-authoring.md`
- `docs/decisions.md`

Do not start from:

- existing song manifests
- existing `analysis/`
- existing `design/`
- existing fixture renderer behavior
- old Shining Star notes

Existing song packs are fixtures or specific song workspaces, not templates.

## Current Song Packs

- `song-packs/shining-star/`: existing fixture package for MaouDamashii
  "Shining Star". Use it for regression checks or that song's own fixes only.
- `song-packs/traffic-jam/`: planning package for 煮ル果実「トラフィック・ジャム」.
  It contains a minimal manifest, Songle public JSON references, palette/markers,
  and effect direction notes. It does not include audio or full lyrics.

## License And Safety

- Do not analyze audio waveforms.
- Do not use music files for AI training.
- Audio may be played in the browser only.
- Timing should come from existing JSON, text, manual markers, or user input.
- Keep lyrics UTF-8 and avoid corrupting Japanese text.
- Do not commit licensed audio files.

## Startup

Use:

```powershell
npm run dev
```

This starts:

- dev manager: `http://127.0.0.1:5172/`
- system app: `http://127.0.0.1:5173/`
- song-pack server: `http://127.0.0.1:5174/`

The system app requires an explicit song manifest URL:

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/<song-id>/manifest.json
```

No implicit default song should be loaded.

## Song Adapter Context

`src/runtime/songAdapterContext.ts` now provides a first-pass adapter context:

- raw manifest
- base URL
- safe package-local asset resolver
- `readJson()`
- `readText()`
- `readDesignCues()`

The system host may confirm that `design.cues` is readable, but it must not
interpret the cue schema as a system-level standard. Song adapters own cue
semantics.

## Notes For Future Agents

If the user asks for a new song effect, keep the first pass independent and
song-specific. Only use existing song packs if the user explicitly asks for a
reference or if you are doing a regression check.

## Local Git Worktrees

- The root worktree stays at `C:\Users\kawai\works\music-effect` on `main`.
- Local parallel worktrees are kept under `C:\Users\kawai\works\music-effect\_worktrees`.
- `_worktrees/` is ignored by Git, so the parent directory and root status stay clean.
- Current worktrees:
  - `_worktrees/adapter-cues`: `codex/wip-adapter-cues-traffic-jam`
  - `_worktrees/download-security`: `codex/download-security`
  - `_worktrees/traffic-jam-effect`: `codex/traffic-jam-effect`
  - `_worktrees/launch-manager`: `codex/launch-manager`
- See `docs/worktree-guide.md` before starting parallel Codex threads.
