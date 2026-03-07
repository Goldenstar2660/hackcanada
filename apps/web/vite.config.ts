import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@binbuddy/analytics": resolve(__dirname, "../../packages/analytics/src/index.ts"),
      "@binbuddy/contracts": resolve(__dirname, "../../packages/contracts/src/index.ts")
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});