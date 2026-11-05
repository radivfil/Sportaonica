import { defineConfig } from "vitest/config";
import path from "node:path";

/** Database tests (real Postgres): `npm run test:db`. See tests/db/helpers.ts. */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
