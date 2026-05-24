# メズマライザー / 初音ミク・重音テトSV. Effect Pack

- Song: メズマライザー / 初音ミク・重音テトSV.
- Artist: サツキ
- Original page: https://www.nicovideo.jp/watch/sm43708803
- Songle page: https://songle.jp/songs/www.nicovideo.jp%2Fwatch%2Fsm43708803
- Songle analysis downloaded: 2026-05-23; melody added 2026-05-24
- Songle analysis source URL: www.nicovideo.jp/watch/sm43708803

This pack contains only metadata, Songle-provided timing JSON, and original
visual effect code. It does not include the audio file or lyrics.
The emotion and composition maps are hand-authored song-owned planning data
based on Songle structure, public-reception checks, and human interpretation;
they do not contain copied lyrics or audio-derived waveform analysis.
Reference URLs are recorded as URL-only metadata in `references.json`.

## Included Data

- `analysis/song.json`: Songle Widget API metadata, 429 bytes.
- `analysis/beat.json`: Songle Widget API beat timing, 29,020 bytes.
- `analysis/chord.json`: Songle Widget API chord timing, 7,236 bytes.
- `analysis/melody.json`: Songle Widget API melody timing, 135,370 bytes.
- `analysis/chorus.json`: Songle Widget API chorus timing, 1,288 bytes.
- `design/emotion-map.json`: hand-authored visual energy and tension map.
- `design/composition-map.json`: hand-authored screen composition and attention map.

## Songle URL Check

- Checked on 2026-05-24.
- `www.nicovideo.jp/watch/sm43708803`, the Songle page URL, and the Songrium page URL resolve to the same Songle analysis currently used by this pack.
- `nico.ms/sm43708803` and `youtu.be/19y8YTbvri8` returned 404 from the Songle Widget API during this check.
- `www.youtube.com/watch?v=19y8YTbvri8` resolves as a separate Songle registration with different analysis counts, so this pack keeps the NicoNico registration as canonical.

## Assets

- No audio files are included.
- No lyrics text is included.
- No third-party image, video, 3D model, font, texture, or binary asset is included.
- The 3D venue, displays, lighting beams, and audience lights are generated in code.

## Runtime Dependency

- `three` is used to render the song-owned 3D live venue adapter.
- `three` license: MIT.
- `@types/three` is used only for TypeScript type checking.
- Neither dependency requires a postinstall script or external binary download for this project.
