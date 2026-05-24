import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLaunchConfig } from "../scripts/launch-manager/config.mjs";
import { listSongCatalog } from "../scripts/launch-manager/songs.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const deckEnv = {
  ...process.env,
  DECK_A_PLAYER_PORT: "53173",
  DECK_B_PLAYER_PORT: "53175",
  SONG_PACK_PORT: "53174"
};

test("launch config defines independent Deck A/B player targets", async () => {
  const config = await loadLaunchConfig({ root: repoRoot, env: deckEnv });
  assert.ok(config.targetMap.has("deck-a-player"));
  assert.ok(config.targetMap.has("deck-b-player"));
  assert.ok(config.targetMap.has("song-pack-server"));
  assert.deepEqual(config.targetMap.get("deck-a-player").ports, [53173]);
  assert.deepEqual(config.targetMap.get("deck-b-player").ports, [53175]);
  assert.deepEqual(config.targetMap.get("song-pack-server").ports, [53174]);
  assert.deepEqual(config.setMap.get("basic-fixture").targets, ["song-pack-server", "deck-a-player"]);
  assert.deepEqual(config.setMap.get("deck-preview").targets, ["song-pack-server", "deck-a-player", "deck-b-player"]);
});

test("song catalog exposes Deck URLs without binding songs to one player", async () => {
  const config = await loadLaunchConfig({ root: repoRoot, env: deckEnv });
  const catalog = await listSongCatalog(config);
  assert.equal(catalog.songPackTargetId, "song-pack-server");
  assert.deepEqual(catalog.deckTargetIds, ["deck-a-player", "deck-b-player"]);
  assert.deepEqual(
    catalog.decks.map((deck) => [deck.id, deck.targetId]),
    [
      ["deck-a", "deck-a-player"],
      ["deck-b", "deck-b-player"]
    ]
  );
  assert.ok(catalog.songs.length > 0);
  for (const song of catalog.songs) {
    assert.match(song.deckUrls["deck-a"], /^http:\/\/127\.0\.0\.1:53173\/\?song=/);
    assert.match(song.deckUrls["deck-b"], /^http:\/\/127\.0\.0\.1:53175\/\?song=/);
  }
});
