# Traffic Jam Scene Redesign Plan

This is a song-owned planning note for making the Traffic Jam visual change
more dramatically by scene. It is based on external reception/theory scanning
done on 2026-05-24, plus the current local preview.

Do not store copied comments, lyrics, article bodies, screenshots, or MV frames
in this repository. Keep only short summaries and URL metadata in
`references.json`.

## Reception Scan Summary

The online reactions and articles point to these repeated readings:

- Addictive contrast: listeners point out the gap between uneasy/ominous mood
  and catchy sections. The scene design should not be evenly dark all the way
  through; it should snap between uneasy waiting and showy accusation.
- Opening car scene impact: user reviews specifically react to the first car
  scene as chilling. The opening should be a strong visual anchor, not just a
  generic road background.
- Accident as spectacle: interpretation articles emphasize crash, warning
  colors, camera flashes, and a story where misfortune is watched and consumed.
- Blame loop: theory posts repeatedly frame the MV as a cycle of blame/guilt,
  anonymous spectators, and public opinion exploiting victims for drama.
- Mask/anonymity: the strongest visual idea is not only "cars", but anonymous
  figures losing their outer shell when watched by another crowd.
- Sound structure: reviews describe a shift from primitive/exotic/HIPHOP-like
  verses into dance-rock choruses, plus an unusual late rap-like section. The
  visuals should therefore switch stage language, not only intensity.

## Current Preview Problem

The current adapter has three strong ingredients:

- road-level cars and signals,
- accusation cards/STOP pressure,
- interlude evidence freeze.

The issue is that verse, chorus, and final chorus still share the same stage:
road, cars, signs, and cards. The interlude reads as a different scene, but the
other sections mostly read as different densities of the same composition.

The redesign should make each scene use a different visual premise.

## Proposed Scene Families

### Scene 1: Crash Witness

Time target: 0.0-41.1s, with a quieter return after choruses.

Purpose:

- Establish the song's accident/spectator world.
- Make the opening car scene memorable and cold.

What to show:

- Road-level traffic, car silhouettes, brake lights, traffic lights.
- Surveillance eyes or camera viewfinders around the edges.
- A few distant comment/evidence cards only as hints.

Composition:

- Cars/road: 55-65%.
- Watcher eyes/camera marks: 10-15%.
- Cards: 0-8%.
- Dark frame: 20-25%.

Motion:

- Slow drift and small traffic pressure.
- No card storm.
- Occasional camera flash or red signal pulse.

Implementation:

- Keep the existing road/cars layer.
- Add a `sceneMode: "crashWitness"` profile that suppresses sign/card density.
- Move watcher marks to the edges and keep the center lane readable.

### Scene 2: Media Court

Time target: 41.1-56.6s and 101.1-116.8s.

Purpose:

- Make the chorus feel like public accusation, not just louder traffic.
- Turn the road into a tribunal/comment wall.

What to show:

- The road collapses into a shallow stage.
- STOP/FAULT/NOTICE cards act like verdict placards.
- Camera flash bars, red signal bars, and stacked comment panels close in.
- Car silhouettes remain, but they are partially hidden behind the verdict wall.

Composition:

- Placards/comment wall: 35-45%.
- Cars: 15-25%.
- Red signal/flash bars: 15-20%.
- Road/depth: 10-15%.
- Dark frame: 10-15%.

Motion:

- Beat-synced snap-in of placards from different depths.
- Horizontal compression of camera and road.
- Stop-frame flashes on strong hits, not continuous shaking.

Implementation:

- Split current `drawBashing` into a shared setup plus
  `drawMediaCourt`.
- Use the existing signs, but arrange them in rows/layers like a wall.
- Reduce visible road perspective during chorus; the road should feel blocked.

### Scene 3: Exploited Exhibit Stage

Time target: 78.0-101.1s or selected late verse/build sections.

Purpose:

- Break the repetition between chorus 1 and chorus 2.
- Represent victims/incidents becoming exhibits or entertainment.

What to show:

- A flat stage/spotlight space instead of road depth.
- Abstract exhibit objects: citrus-colored discs, sliced tags, empty chair,
  small trophy/case-like boxes, or evidence tape shapes.
- Cars appear only as shadow cutouts or projected silhouettes.

Composition:

- Stage/exhibit objects: 35-45%.
- Spotlight/shadow geometry: 20-25%.
- Cars as silhouettes/projections: 10-15%.
- Cards/comments: 10-15%.
- Dark frame: 15-20%.

Motion:

- Objects rotate or are presented under spotlights.
- Audience eyes/camera marks pan slowly.
- Beat does not cause a crash; it changes which exhibit is lit.

Implementation:

- Add a Canvas2D-only scene first; no new 3D assets needed.
- Reuse card drawing helpers but remove road grid.
- Use this as a bridge so the video no longer goes road -> road -> road.

### Scene 4: Evidence Freeze

Time target: 146.3-159.3s.

Purpose:

- Keep the currently successful interlude difference.
- Make it more forensic and less like a frozen chorus.

What to show:

- Suspended evidence panels, surveillance marks, quiet road perspective.
- Car presence is small and contextual.
- Wide, cold empty space.

Composition:

- Evidence panels: 30-35%.
- Empty road/depth: 25-30%.
- Surveillance/signal marks: 10-15%.
- Cars: 5-12%.
- Dark frame: 20%.

Motion:

- Damped drift.
- Almost no hit reaction.
- One alignment inhale before returning to final chorus.

Implementation:

- Keep `drawEvidenceFreeze`, but push cars farther back and reduce signal count.
- Add an alignment pulse that visibly straightens the evidence layer.

### Scene 5: Anonymous Screen Room

Time target: 159.3-164.8s and/or a short pre-final bridge.

Purpose:

- Represent anonymity and being watched by another crowd.
- Create the biggest non-road scene change before the final crash.

What to show:

- A dark room with a screen showing a simplified crash feed.
- Two anonymous silhouettes or mask-like cutouts watching.
- A door/light rectangle opening behind them.
- The outer shell/mask begins to peel or split.

Composition:

- Screen-within-screen: 30-40%.
- Anonymous silhouettes/masks: 20-30%.
- Door/light exposure: 10-15%.
- Comment/cards: 10-15%.
- Dark room: 20%.

Motion:

- Very little camera movement.
- Screen flicker, then sudden exposure light.
- Masks split for a few frames before the final chorus.

Implementation:

- Add `drawAnonymousRoom` as a 2D scene using simple silhouettes and rectangles.
- Do not use real MV frames or screenshots.
- Use the existing road scene only as an abstract feed inside the screen.

### Scene 6: Loop Crash / Final Accusation

Time target: 164.8-181.0s.

Purpose:

- Make the final chorus feel like the cycle restarting, not merely chorus 3.

What to show:

- Road returns, but closer and more blocked than before.
- Comment wall and car silhouette occupy the viewer's sightline.
- A final red signal remains after action cuts off.

Composition:

- Placards/comment wall: 40-50%.
- Car/windshield blockage: 25-30%.
- Road/depth: 5-10%.
- Signals/red frame: 10-15%.
- Dark frame: 10-15%.

Motion:

- Strongest compression.
- Objects hit the screen plane rather than floating in depth.
- Final seconds stop the action and leave only afterimage.

Implementation:

- Reuse `drawMediaCourt`, but change camera/scale to close-compressed.
- Add a final `cutoff` profile after 179.6s that removes most cards.

## Implementation Refactor

The current adapter can evolve without a new dependency:

```text
sceneProfileAt(time) -> {
  mode,
  energy,
  cameraCompression,
  cardDensity,
  carProminence,
  roadProminence,
  watcherProminence,
  motionDamping,
  paletteShift
}
```

Then the render path should route to different scene draw functions:

```text
render(frame):
  profile = sceneProfileAt(time)
  if profile.mode == "evidenceFreeze": drawEvidenceFreeze(...)
  else if profile.mode == "anonymousRoom": drawAnonymousRoom(...)
  else if profile.mode == "exhibitStage": drawExhibitStage(...)
  else if profile.mode == "mediaCourt": drawMediaCourt(...)
  else drawCrashWitness(...)
```

This is better than continuing to feed `chorus` and `interlude` scalars into
one mostly shared road scene.

## First Implementation Pass

Start with these changes, in this order:

1. Add `sceneProfileAt(time)` and mode routing.
2. Rename the current road scene into `drawCrashWitness`.
3. Extract current chorus overlays into `drawMediaCourt`, then make it use a
   much shallower road and denser verdict wall.
4. Add `drawExhibitStage` as a simple 2D stage to break the mid-song repetition.
5. Keep `drawEvidenceFreeze`, but reduce car/traffic presence.
6. Add `drawAnonymousRoom` as the pre-final hard cut.
7. Make final chorus use the closest camera and strongest screen-plane hits.

## Review Targets

- 20s: should read as crash/witness traffic, not as chorus.
- 45s: should read as a media tribunal/comment wall.
- 90s: should not look like either 20s or 45s; it should read as an exhibit or
  performance space.
- 150s: should read as forensic freeze.
- 162s: should read as anonymous screen room/exposure.
- 166s: should read as final loop crash, visually harsher than 45s.

If these still look like the same road scene with different object density, the
redesign is not strong enough.
