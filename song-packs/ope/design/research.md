# オペ Research Notes

This file records interpretation and design decisions in our own words. It must not contain full lyrics, article bodies, images, screenshots, transcripts, or copied MV material.

## Basic Metadata

- Title: オペ
- Artist: 蜂屋ななし feat. v4 flower
- Canonical analysis URL: `https://www.nicovideo.jp/watch/sm35902611`
- Alternate official MV URL found during research: `https://www.youtube.com/watch?v=WqHVaG0GzEE`
- Release/distribution reference: KARENT and Apple Music list the single release on 2020-02-07.
- KARENT genre: rock.
- KARENT art credit: sakiyama.
- Official description credits v flower as main vocal and chorus, 蜂屋ななし for music/arrangement/lyrics, and sakiyama for movie.

## Public Reception Snapshot

- Review/listener sources describe the song as stylish, dense, and rhythmically distinctive.
- Recurring listening notes: active bass, band sound plus EDM/piano elements, chant-like or rap-like phrasing, and a fast verbal flow.
- Public interpretation tends to hear the song as both bitter and rescuing: a critique of public judgment/news-cycle consumption, but also an assertion that life should not be valued by outside spectators.
- The later Kuriyama Yuri / Van de Shop context supports treating this as part of a broader trajectory toward band-like, jazz/rock-adjacent, high-density arrangement rather than a simple VOCALOID rock track.

## Theme Reading

The main tension is an operation performed while public records, news-like judgment, and outside evaluation pressure intrude into the room. The "operation" is not a live performance; it is a rescue attempt being overwritten by outside evaluation. A narrator/surgeon figure looks at lives being consumed as public material and tries to reclaim one. This gives the visual three simultaneous spaces:

- operating room: diagnosis, incision, measurement, table, pulse, sterile light.
- public record surface: forms, diagnosis sheets, metrics, verdict blocks, and triage boards.
- news/evaluation surface: public verdicts, shallow justice, rapid replacement by the next story.

The emotional center should be urgent care rather than horror. The visual language can be sharp, clinical, and uncomfortable, but it should not become graphic.

## Songle Analysis

- `song.json`: duration 225.07s, Songle recognized at 2019-11-06, updated 2022-06-19.
- `beat.json`: 482 beats, median BPM 131.0, average BPM about 130.9.
- `chorus.json`: one chorus segment with repeats at 52.91s, 131.70s, and 190.33s, each 16.70s.
- `chord.json`: 122 chords. Frequent names include Bm, D, D/F#, Bm7, G, N, G6, F#m7, F#7, and F#aug.
- `melody.json`: 5425 notes, but notes only expose `start`, `duration`, and `index`. There is no pitch or volume field in the downloaded data.

Coarse note-density pass:

| Range | Notes | Notes/s | Beats | Use |
| --- | ---: | ---: | ---: | --- |
| 0.00-30.00 | 1109 | 37.0 | 65 | rapid diagnostic clutter |
| 30.00-52.91 | 974 | 42.5 | 50 | rising public pressure |
| 52.91-69.61 | 122 | 7.3 | 37 | first chorus, broaden rather than crowd |
| 69.61-100.00 | 663 | 21.8 | 66 | afterimage and re-entry |
| 100.00-131.70 | 919 | 29.0 | 69 | second build |
| 131.70-148.40 | 0 | 0.0 | 37 | drive from beat/chord/manual cues |
| 148.40-190.33 | 948 | 22.6 | 91 | bridge / reconstruction |
| 190.33-207.03 | 545 | 32.6 | 37 | final chorus forward motion |
| 207.03-225.07 | 145 | 8.0 | 30 | outro decay |

The zero-note second chorus is a reminder that Songle melody is a cue source, not ground truth. The implementation should not make lyric/vocal presence depend only on that file.

## Lyrics Handling

Lyrics are needed for final timing and for deciding which words appear on screen. They are not stored here yet. Use one of these routes:

- user-provided UTF-8 lyrics file, or
- rights-cleared lyrics from the official off-vocal/lyrics package referenced in the official description.

Do not scrape or paste lyrics from public lyric sites into this repository.

## Visual Direction

The proposed visual structure is an off-center operating table surrounded by monitor walls and public-record panels. Around it:

- small diagnosis panels replace social noise;
- suture paths replace decorative light lines;
- pulse blocks replace generic particles;
- overhead lamps stay offset so the image avoids a central sunburst;
- public verdicts are abstracted as rectangles, counters, and pressure marks.

The song's most important screen change should be spatial: from being pinned down by diagnosis panels to a pulse route pushing forward through the monitor grid. This gives the final chorus a sense of agency without needing literal character animation or live-stage language.

## Sensitive Content Boundary

The song references death, self-harm, and bodily/medical imagery. The visual should avoid:

- explicit wounds or blood;
- falling bodies;
- realistic surgery;
- instructional or glamorized self-harm imagery;
- shock visuals that overpower the rescue/life-value theme.

Use clinical abstraction, negative space, monitors, sutures, records, and emergency exposure instead.
