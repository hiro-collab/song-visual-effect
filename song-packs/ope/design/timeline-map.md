# オペ Timeline Map

This is a working time-direction map for building the visual effect. It combines Songle JSON facts with provisional musical/visual interpretation. Section names are provisional until lyrics timing is available.

## Whole-Song Read

- Duration: 225.07s.
- Tempo: nearly fixed around BPM 131. The arrangement does not rely on tempo swings; it relies on density, cuts, arrangement changes, and chorus returns.
- Main rhythmic feel: fast, steady 4-beat drive. Good visual triggers are downbeat cuts, small procedure ticks, shutter changes, and panel snaps.
- Main harmonic area from Songle: Bm / D / G family with frequent N or unstable zones. This supports a cold minor palette: near-black, surgical green, cold cyan, bone white, and restrained red.
- Chorus candidates from Songle: 52.91-69.61, 131.70-148.40, 190.33-207.03.
- Important caveat: Songle `melody.json` contains only `start`, `duration`, and `index`; no pitch or volume. Use it for density and entry timing, not for a pitch-line visual.

## Energy Shape

```text
0s       30s       53s       70s       100s      132s      148s      170s      190s      207s      225s
| cold   | dense    | chorus   | after    | build    | frozen   | repair   | lift     | final    | decay    |
| open   | pressure | opens    | image    | returns  | exposure | drift    | to final | push     | pulse    |
energy  low -> high -> broad -> mid -> high -> held -> lower -> rising -> peak -> low
```

The first build is the densest "argument" zone. The first chorus should not simply explode; Songle note density drops there, so the visual should widen and expose the space. The second chorus is stranger: the chorus window has zero Songle melody notes, so treat it as a frozen or overexposed chorus driven by beat/chord and later lyric/manual cues. The final chorus brings density back, making it the strongest forward push.

## Timeline Table

| Time | Provisional part | Songle facts | Emotion / musical role | Visual cut idea |
| --- | --- | --- | --- | --- |
| 0.00-3.70 | cold open / intro incision | 8 beats, 1 note, mixed quick chords | sterile shock, held breath, first incision | near-black table line; off-center lamp wakes; no central glow |
| 3.70-30.00 | intro / A-melo entry | 57 beats, 1108 notes, 42.1 notes/s, long N and F#/C# areas | immediate agitation; diagnosis starts before comfort arrives | diagnosis panels and pulse trace crowd the operating table |
| 30.00-52.91 | A/B-melo build | 50 beats, 974 notes, 42.5 notes/s, N + diminished/unstable hints | claustrophobic accusation, public pressure, first climb | dark record panels slide inward; verdict cards become procedure tags |
| 52.91-69.61 | sabi 1 | Songle chorus repeat 1, 37 beats, only 7.3 notes/s, D/Bm7/G/F# area | first release, rescue statement, controlled anger | widen the space; table lifts; white-blue exposure wipes from one edge |
| 69.61-100.00 | post-sabi / interlude afterimage | 66 beats, 21.8 notes/s, Bm/D/F#m | numb echo, reset, reloading | empty table outline; delayed monitor blocks; less public noise |
| 100.00-131.70 | A/B-melo 2 build | 69 beats, 29.0 notes/s, long N zone | second escalation, more procedural, sharper focus | overhead monitor frame lowers; triage marks align with procedure marks |
| 131.70-148.40 | sabi 2 / frozen chorus | Songle chorus repeat 2, 37 beats, 0 notes, D/F# / F#m7 / Bm7 | suspended breath, hard judgment, overexposed pause | freeze the table in white; hard shadow cuts on beat; use chord/beat not melody |
| 148.40-170.00 | bridge / operation drift A | 47 beats, 20.7 notes/s, Bm7/D/F#/D family | careful repair, doubt, searching | suture paths trace around a missing center; panels grow quieter |
| 170.00-190.33 | bridge / lift into final | 44 beats, 24.6 notes/s, D/F# dominates | resolve forming, breath gathering, tunnel vision | seams pull open; monitor grid becomes an exit route |
| 190.33-207.03 | last sabi | Songle chorus repeat 3, 37 beats, 32.6 notes/s, Bm/G/D movement | final assertion, agency, urgent rescue | pulse route pushes forward through the monitor grid; bold pulse blocks |
| 207.03-225.07 | outro / residual pulse | 30 beats, 8.0 notes/s, Bm and N closing areas | aftercare, ambiguity, last life-sign | monitors dim; one off-center pulse exits bottom right |

## Rhythm And Cut Rules

- Use every beat lightly only for diagnostic ticks. Big visual cuts should prefer downbeats or section starts.
- Because BPM is stable, avoid treating tempo as the drama. Let density and screen logic carry drama.
- Dense zones (`3.70-52.91`) can use rapid small UI motion, but not full-screen particle noise.
- Sparse chorus zones (`52.91-69.61`, especially `131.70-148.40`) should feel broad, exposed, and architectural.
- The final chorus (`190.33-207.03`) is the only chorus where high density and chorus timing align strongly; reserve the most forward movement for it.

## Chord / Color Notes

- Bm / Bm7: cold body of the track. Use deep blue-black and surgical green.
- D / D/F#: exposure and sterile-field lift. Use bone white or hard cyan edge light.
- G / G6 / GM7: unstable tenderness or rescue color. Use a less aggressive cyan-green.
- F# / F#7 / F#aug / C#dim areas: tension, verdict, threat, mechanical cuts. Use short restrained red ticks or hard black shutters.
- N zones: social/static noise or no-readable-harmony blocks. Use text panels, blank verdict cards, or muted monitor grids.

## Emotional Map

| Arc | Where | Emotional read | Visual behavior |
| --- | --- | --- | --- |
| diagnosis pressure | 3.70-52.91 | quick judgment, body measured by outside eyes | cramped panels, high note-density cues, fast labels |
| rescue exposure | 52.91-69.61 | anger opens into a bigger statement | broaden composition and show the sterile field |
| numb reset | 69.61-100.00 | afterimage, breath, evidence left behind | delayed pulses and empty outline |
| public procedure | 100.00-148.40 | the operation becomes more recorded and judged | monitor grid, square frame, hard shadow cuts |
| repair drift | 148.40-190.33 | uncertainty, stitching together, gathering will | suture paths and negative space |
| agency push | 190.33-207.03 | final life-forward motion | pulse-route motion and bold pulse blocks |
| aftercare | 207.03-225.07 | not triumphant, but alive | dimming monitors and one pulse |

## Implementation Notes

- `analysis/structure-map.json` is the machine-readable companion to this file.
- The lyric layer should be added only after a user-provided or rights-cleared UTF-8 lyrics file is available.
- Once lyric timing exists, recheck the provisional section names and the emotional map against line meaning.
- Add manual cues for at least: first lamp switch, chorus exposure, second chorus freeze, final pulse-route push, last pulse exit.
