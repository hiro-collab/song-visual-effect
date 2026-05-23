# Log

## 2026-05-10

- User started a PoC using MaouDamashii "Shining Star".
- Initial material included UTF-8 lyrics under `music_src/Lyrics.txt`.
- Songle JSON endpoints were identified and downloaded for beat, chord, melody, chorus, and song metadata.
- License safety rule was established: do not analyze audio waveforms and do not use music for AI training. Browser playback is allowed; timing must come from JSON/text/manual markers/user input.
- Implemented the first Vite + TypeScript Canvas2D visualizer with soft light rendering, Songle JSON parsing, UTF-8 lyric loading, pointer interaction, click ripples, and internal clock fallback.
- Added manual lyric timing:
  - `Lyric Timing` mode.
  - `A` / `D` keyframe capture.
  - localStorage autosave, undo, clear, export.
  - sequence-bar stones, all/from-current offset controls, sequence-bar seeking, and Space playback toggle.

## 2026-05-20 Base Separation

- User asked to separate reusable system code from song-specific application code.
- Clarified design principle: the system server must be a helper runtime, not a controller that forces a song into one model. Other runtimes and adapters must remain possible.
- Before refactor, committed current adjusted lyric timing data:
  - `87c4c25 Add adjusted lyric timing data`
- Started manifest/song-package separation:
  - Added `music_src/manifest.json` for backward-compatible single-server use.
  - Added `song-packs/shining-star/manifest.json` for separate song-pack server use.
  - Copied lyrics and analysis JSON into `song-packs/shining-star`.
  - Added `CREDITS.md` and `design/cues.json`.
  - Added a Node static song-pack server with CORS support: `scripts/serve-song-packs.mjs`.
  - Added `npm run dev:system` and `npm run dev:songs`.
- Added workflow documentation inspired by JSON-driven app-flow maps:
  - `docs/workflows.html`
  - `docs/workflows.json`
- Added agent context documentation:
  - `AGENTS.md`
  - `docs/architecture.md`
  - `docs/module-map.md`
  - `docs/decisions.md`
  - `docs/plans.md`
  - `docs/known-issues.md`
  - `docs/handoff.md`
- Updated `README.md` with Workflow Map and Agent Context sections.

## 2026-05-20 Later

- The repository was shifted from a Shining Star-centered PoC toward a
  system-neutral host.
- New song authoring must start from `docs/system-overview.md` and
  `docs/song-authoring.md`, not from existing `song-packs/*`.
- `music_src` is obsolete; song package data lives under `song-packs/`.
- The dev manager starts/stops the system app and song-pack server together.
- `song-packs/traffic-jam/` was added as a planning package for 煮ル果実
  「トラフィック・ジャム」. It should not become a template for later songs.

## 2026-05-20 Worktree Setup

- User paused implementation to prepare parallel Codex work.
- Stopped local development servers before reorganizing.
- Added `_worktrees/` to `.gitignore` and committed it on `main`.
- Checkpointed in-progress adapter cues / Traffic Jam work on `codex/wip-adapter-cues-traffic-jam`.
- Created local worktrees under the project root:
  - `_worktrees/adapter-cues`
  - `_worktrees/download-security`
  - `_worktrees/traffic-jam-effect`
  - `_worktrees/launch-manager`
- Added `docs/worktree-guide.md` to explain the worktree layout and parallel-work cautions.
- Added a local worktree sync notice tool:
  - `npm run sync:ready`
  - `npm run sync:check`
  - `npm run sync:merge`
  - `npm run sync:list`
  - `npm run sync:watch`
- The sync notice board is stored under Git's common directory, so all local worktrees can see it without committing the notice log.

## 2026-05-20 Adapter Cues Resume

- Added a first-pass same-build adapter experiment and improved `scripts/download-songle-json.ps1` with a post-download summary.
- This song-specific adapter experiment was later superseded by the system kit refactor. New song adapters should not be added to the kit itself.

## 2026-05-20 System Kit Refactor

- Shifted the project from a host-centered shape to `system/kit` plus `examples/fixture-player`.
- Removed the system-side Traffic Jam adapter. `song-packs/traffic-jam` has no system-side `webAdapter` binding in the system kit branch.
- Moved reusable helpers to `system/kit`: asset loading, safe fetch, transport, frame loop, timing helpers, damping/palette helpers, manual lyric timing data, and song adapter context.
- Moved runnable UI, fixture renderer, fixture adapter registry, lyric timing UI, particles, and light network effects under `examples/fixture-player`.
- Renamed the individual Vite script from `dev:system` to `dev:player`.
- Added `system/kit/index.ts` as the public helper API entry.
- Added `DEV_MANAGER_PORT`, `PLAYER_PORT`, and `SONG_PACK_PORT` support to the
  dev manager for parallel worktrees, and verified start/stop on
  `5182/5183/5184`.

## 2026-05-20 Visual Independence Guardrails

- Received feedback from the song implementation thread: avoiding existing `song-packs/*` was not enough because the fixture renderer's central glow, radial lines, light network, particles, and soft-light composition still acted as a visual anchor.
- Added `docs/song-visual-independence.md` with allowed files, anchor-prone files, implementation-before checklist, and first-preview review items.
- Added `templates/neutral-song-app/` with an empty Canvas2D adapter scaffold and a `visual-brief.md` sheet for fixing each song's main visual structure before writing effects.
- Updated `AGENTS.md`, `docs/song-authoring.md`, `docs/workflows.json`, and handoff docs so new song work starts from the neutral brief rather than fixture renderers or old song effects.

## 2026-05-20 Thread Start Workflow

- Added `docs/thread-start.md` as the first-read workflow for new Codex
  threads.
- Documented the required startup checks: `git status --short --branch` and
  `npm run sync:check`.
- Clarified that ready notices are merge candidates, not automatic merge
  commands.
- Linked the new thread workflow from `AGENTS.md`, `README.md`,
  `docs/handoff.md`, `docs/module-map.md`, and `.codex/shared_note.md`.

## 2026-05-20 Traffic Jam Redo Brief

- Merged the redo direction from `main`.
- `codex/traffic-jam-effect` commit `81876a7 Add traffic jam visual adapter` is rejected as a visual implementation because it reused too much of the previous fixture visual grammar.
- Added `docs/traffic-jam-redo-brief.md` as the replacement brief for a future Traffic Jam implementation thread.
- Future threads must not merge the rejected Traffic Jam implementation; they should use the redo brief instead.

## 2026-05-20 Security Merge

- Merged loopback hardening from `codex/download-security`.
- Dev servers reject non-loopback host binding.
- Asset loading and security docs were updated to keep local development servers private by default.

## 2026-05-21 Structure Cleanup

- Added `docs/README.md` as the documentation map so agents can distinguish source-of-truth docs from handoff/planning notes.
- Added `examples/fixture-player/README.md` to make clear that the fixture player is a regression/example app, not a song template.
- Split Launch Manager server concerns: `scripts/launch-manager/server.mjs` now handles API/security/routing, while `scripts/launch-manager/ui.mjs` owns the HTML/CSS/client JS.
- Removed the local empty `src/` directory tree from this worktree so old layout artifacts do not mislead future agents.

## 2026-05-23 Worktree Contact Notes

- Extended `scripts/worktree-sync.mjs` with `note` and `inbox` commands for commit-free coordination between parallel Codex worktrees.
- `sync:ready` remains the signal for mergeable commits. `sync:note` is for questions, blockers, done notices, and short system-wide messages.
- Added explicit note sender labels via `--from <sender-label>` so messages show who sent them and who should read them.
- Updated AGENTS, thread-start, worktree-sync, worktree-guide, module-map, handoff, README, and workflows JSON so new threads check both `sync:check` and `sync:inbox`.
