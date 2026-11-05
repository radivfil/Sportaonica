import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

/**
 * Smoke tests against a production build with the local JSON store and fictional data.
 *   npm run build && npm run test:e2e
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  workers: 1,
  timeout: 90_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_ENV: "local",
      DATA_DIR: ".data/e2e",
      RATE_LIMIT_DISABLED: "1",
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
      ADMIN_EMAIL: "vlasnica@sportaonica.test",
      ADMIN_PASSWORD: "e2e-lozinka-dovoljno-duga",
      ADMIN_TOTP_SECRET: "JBSWY3DPEHPK3PXP",
      AUTH_SECRET: "e2e-auth-secret-0123456789abcdef0123456789",
      CRON_SECRET: "e2e-cron-secret-0123456789abcdef0123456789",
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
    },
  },
});
