import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: false,
  server: {
    host: "127.0.0.1",
    fs: {
      allow: [repoRoot]
    }
  },
  build: {
    outDir: "../../dist/lyric-timing-workbench",
    emptyOutDir: false
  }
});
