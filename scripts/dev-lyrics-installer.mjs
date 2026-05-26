import { startLyricsInstallerGui } from "./lyrics-installer/server.mjs";

startLyricsInstallerGui().catch((error) => {
  console.error(error);
  process.exit(1);
});
