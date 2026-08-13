import { defineConfig } from "vite";

export default defineConfig({
  // Relative assets work at the domain root, GitHub Pages project paths,
  // and the repository-backed Sites host without environment-specific edits.
  base: "./",
  build: {
    chunkSizeWarningLimit: 650,
  },
});
