import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@binsight/analytics": resolve(__dirname, "../../packages/analytics/src/index.ts"),
      "@binsight/contracts": resolve(__dirname, "../../packages/contracts/src/index.ts")
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});