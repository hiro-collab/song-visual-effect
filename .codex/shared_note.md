# Shared Note

## Current Project Shape

This repository is now a system kit with a small fixture player for
song-specific interactive music effects.

The system kit should provide helpers only:

- dev manager
- song-pack static server
- manifest loading
- transport
- frame loop
- safe asset helpers
- optional lyric timing data helpers

The fixture player is for regression checks and optional lyric timing UI. It is
not the required host or template for new songs. The system kit must not define
the creative structure of a new song.

## New Song Authoring Rule

When creating a new song package or song-specific effect system, do not inspect
existing `song-packs/*` unless the user explicitly asks to use a specific song as
a reference.

Start from:

- `AGENTS.md`
- `docs/thread-start.md`
- `docs/system-overview.md`
- `docs/song-authoring.md`
- `docs/song-visual-independence.md`
- `docs/decisions.md`
- `templates/neutral-song-app/visual-brief.md`

Do not start from:

- existing song manifests
- existing `analysis/`
- existing `design/`
- existing fixture player or renderer behavior
- `examples/fixture-player/renderers/*`
- `examples/fixture-player/effects/*`
- `examples/fixture-player/adapters/fixtureSoftLight.ts`
- old Shining Star notes

Existing song packs are fixtures or specific song workspaces, not templates.
Existing fixture renderers are regression examples, not visual templates.

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
- fixture player: `http://127.0.0.1:5173/`
- song-pack server: `http://127.0.0.1:5174/`

The fixture player requires an explicit song manifest URL:

```text
http://127.0.0.1:5173/?song=http://127.0.0.1:5174/<song-id>/manifest.json
```

No implicit default song should be loaded.

For parallel worktrees, set alternate ports before `npm run dev`:

```powershell
$env:DEV_MANAGER_PORT=5182
$env:PLAYER_PORT=5183
$env:SONG_PACK_PORT=5184
npm run dev
```

## Song Adapter Context

`system/kit/songAdapterContext.ts` provides a first-pass asset/context helper:

- raw manifest
- base URL
- safe package-local asset resolver
- `readJson()`
- `readText()`
- `readDesignCues()`

The system kit must not interpret the cue schema as a system-level standard.
Song apps or adapters own cue semantics.

`examples/fixture-player/adapters/registry.ts` selects only fixture-local
same-build adapters. External adapter loading is intentionally disabled for now.
The fixture player currently ships only `builtin:fixture-soft-light`. Do not add
new song-specific adapters to the system kit just because a song package exists.

## Notes For Future Agents

If the user asks for a new song effect, keep the first pass independent and
song-specific. Only use existing song packs if the user explicitly asks for a
reference or if you are doing a regression check.

## Local Git Worktrees

- The root worktree stays at `C:\Users\kawai\works\music-effect` on `main`.
- Local parallel worktrees are kept under `C:\Users\kawai\works\music-effect\_worktrees`.
- `_worktrees/` is ignored by Git, so the parent directory and root status stay clean.
- Current worktrees:
  - `_worktrees/adapter-cues`: `codex/system-kit-refactor`
  - `_worktrees/download-security`: `codex/download-security`
  - `_worktrees/traffic-jam-effect`: `codex/traffic-jam-effect`
  - `_worktrees/launch-manager`: `codex/launch-manager`
- See `docs/worktree-guide.md` before starting parallel Codex threads.
- New threads should read `docs/thread-start.md` before deciding whether to
  merge ready notices.
- Use `npm run sync:check` at the start of work and at safe stopping points.
- Use `npm run sync:ready -- -m "short message"` after a clean commit that other worktrees may merge.
- See `docs/worktree-sync.md` for the ready/check/merge flow.
