# Traffic Jam Composition Map

This is a song-owned planning note for the Traffic Jam visual adapter. It maps
the song timeline to screen composition, attention targets, and approximate
screen occupancy. The percentages are not measured output; they are direction
values for implementation and review.

Do not move these numbers into system-wide docs. The common lesson is only that
song sections should have planned screen composition before implementation.

## Global Composition Rules

- Camera viewpoint: a person-height view from the road/traffic, around window
  height, not a bird's-eye view and not tire-height.
- Primary read: silhouette of cars, traffic lights, blocked sightlines, and
  accusation objects. Fine material shading is secondary.
- Avoid: central glow, radial rays, light networks, or particle-only intensity
  changes as the main structure.
- Projection read: leave strong dark zones, but keep silhouettes and contours
  bright enough to survive projector contrast loss.
- Text/card objects should feel like pressure and evidence, not generic lyrics
  decoration.

## Timeline Map

| Time | Section | Energy | Shot | Primary attention | Screen occupancy target |
| --- | --- | ---: | --- | --- | --- |
| 0.0-16.0 | Opening surveillance | 0.25 | wide/medium | road depth and first traffic lights | road/depth 45%, cars 20%, signals 10%, accusation cards 5%, dark frame 20% |
| 16.0-41.1 | Verse pressure build | 0.45 | medium | near-lane car silhouettes and a blocked center lane | road/depth 35%, cars 30%, signals 10%, accusation cards 10%, dark frame 15% |
| 41.1-56.6 | Chorus 1 bashing | 0.95 | compressed-wide | central STOP/impact field, then front-row cars | accusation cards 30%, cars 25%, road/depth 20%, signals/red frame 15%, dark frame 10% |
| 56.6-78.0 | Aftermath | 0.45 | medium reset | cars and red/yellow signals, cards falling away | road/depth 35%, cars 35%, signals 10%, accusation cards 5%, dark frame 15% |
| 78.0-101.1 | Second build | 0.60 | medium push-in | narrowing lane and right/left surrounding cars | road/depth 30%, cars 35%, signals 10%, accusation cards 12%, dark frame 13% |
| 101.1-116.8 | Chorus 2 escalation | 1.00 | compressed-wide | accusations hitting the traffic queue | accusation cards 32%, cars 28%, road/depth 18%, signals/red frame 12%, dark frame 10% |
| 116.8-146.3 | Drain toward freeze | 0.35 | pullback | empty distance and slowing debris | road/depth 40%, cars 25%, signals 10%, accusation cards 8%, dark frame 17% |
| 146.3-159.3 | Interlude evidence freeze | 0.25 | freeze-wide | suspended evidence panels and surveillance marks | evidence/cards 32%, road/depth 28%, signals 12%, cars 10%, dark frame 18% |
| 159.3-164.8 | Alignment inhale | 0.70 | locked pullback | evidence briefly aligning before impact returns | evidence/cards 28%, road/depth 30%, signals 12%, cars 15%, dark frame 15% |
| 164.8-179.6 | Final chorus crash | 1.05 | close-compressed | blocked windshield/sightline and STOP pressure | accusation cards 38%, cars 25%, road/depth 12%, signals/red frame 15%, dark frame 10% |
| 179.6-181.0 | Cutoff | 0.30 | held close | afterimage of stop signal and dark road | dark frame 40%, road/depth 30%, cars 15%, signals 10%, cards 5% |

## Scene Plans

### Scene A: Road-Eye Queue

Use for opening, verse, aftermath, and build sections.

Composition:

- Road/depth should be the largest single shape, roughly 30-45% depending on
  energy. It gives the viewer a road-level location.
- Cars should occupy 25-35%, mostly in lower left, lower center, and middle
  depth. Their silhouettes must read before their material detail.
- Signals should occupy 8-12%, with red/yellow lights acting as small but high
  contrast anchors.
- Accusation cards should stay under 12% outside chorus. They can enter the
  frame, but should not become the main storm yet.
- Dark architecture and frame lines should occupy 13-20% to preserve the black
  mood and projection contrast.

Attention path:

1. Near car silhouette or front lane obstruction.
2. Red/yellow signal.
3. A small card or surveillance mark that suggests pressure.
4. The far road vanishing into blocked traffic.

Implementation direction:

- Lower the non-chorus card density and keep cards smaller/farther away.
- Let car contour lines and brake/license details do more of the reading.
- Keep the center lane visible enough that the chorus can later crush it.

### Scene B: Bashing Crossing

Use for 41.1-56.6s, 101.1-116.8s, and 164.8-179.6s.

Composition:

- Accusation cards/stamps become the largest visual mass, 30-38%.
- Cars remain 25-30%. They should feel trapped behind or under the accusations,
  not disappear completely.
- Signals and red frame elements should occupy 12-15%, with the STOP shape
  becoming the first read at the moment of impact.
- Road/depth drops to 12-20% because the viewer's space is being compressed.
- Dark frame stays around 10%; enough black remains to make red and white cards
  cut through.

Attention path:

1. STOP/impact object or the brightest card cluster near center.
2. Front-row car silhouettes that are being blocked.
3. Red signal/frame pulses.
4. Peripheral cards entering from offscreen, implying social pressure.

Implementation direction:

- Make the chorus change a composition change, not only brightness. Push camera
  compression, card scale, card density, and red frame together.
- In chorus 1, keep a little more road visible so the pressure begins.
- In chorus 2, increase density and horizontal compression.
- In final chorus, allow cards to cover more of the windshield/sightline and
  reduce road/depth to the smallest value.

### Scene C: Evidence Freeze

Use for 146.3-159.3s, with the 159.3-164.8s alignment as the exit ramp.

Composition:

- Evidence/cards should occupy about 30%, but with larger spacing than chorus.
  They are suspended exhibits, not flying attacks.
- Road/depth should occupy around 28-30% to keep the accident-site space.
- Cars drop to 10-15%. They are context, not the subject.
- Signals and surveillance marks stay visible at 10-12%.
- Dark frame should be 15-20%, making the scene feel held and cold.

Attention path:

1. One large evidence object at the upper-left or center-right third.
2. Still traffic lights and surveillance eye marks.
3. Frozen road perspective.
4. Small evidence fragments drifting by almost too slowly.

Implementation direction:

- Suppress impact shakes and rapid card motion.
- Favor slow drift, tiny rotations, and one-frame alignment before returning to
  Scene B.
- Avoid making this a brighter version of the chorus. It should be quieter,
  wider, and more forensic.

### Scene D: Cutoff / Afterimage

Use for the final seconds after the last chorus.

Composition:

- Dark frame and road should dominate, around 70% combined.
- Cars and signals remain as afterimages, about 25% combined.
- Cards should fall to 5% or less, as if the pressure has already hit.

Attention path:

1. A last red signal or brake light.
2. The road line continuing into darkness.
3. A fading card edge, not a readable statement.

Implementation direction:

- Remove the feeling of ongoing action. Let the image hold.
- Do not add a final bright center cue.

## Adapter Hook Plan

The adapter can implement this as a section profile lookup:

```text
compositionProfileAt(time) -> {
  shot,
  energy,
  cardMass,
  carMass,
  roadMass,
  signalMass,
  darkMass,
  cameraCompression,
  attentionMode
}
```

The first implementation pass should change only a few high-leverage controls:

- Card spawn count, scale, opacity, and z range.
- Vehicle layer prominence and contour brightness.
- Camera compression and road perspective scale.
- Signal/STOP/red-frame opacity.
- Interlude motion damping and freeze alignment.

## Review Checklist

Use preview times 20, 45, 108, 150, and 166 seconds.

- At 20s, the first read should be road-level traffic, not card storm.
- At 45s, the chorus should clearly become compressed and accusatory.
- At 108s, chorus 2 should feel denser than chorus 1.
- At 150s, the scene should read as evidence freeze, not bashing.
- At 166s, the final chorus should feel like the most blocked sightline.
- Squint test: the dominant mass should change by section.
- Projection test: cars remain readable as silhouettes against black.
