import { startLaunchManager } from "./launch-manager/server.mjs";

startLaunchManager().catch((error) => {
  console.error(error);
  process.exit(1);
});
