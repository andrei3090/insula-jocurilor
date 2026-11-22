import { defineConfig, devices } from '@playwright/test';

const tabS9 = devices['Galaxy Tab S9'];
/** E2E_PORT lets two checkouts run their suites side by side */
const PORT = Number(process.env.E2E_PORT ?? 5191);

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/insula-jocurilor/`,
    trace: 'retain-on-failure',
    // tests never make a sound: the app starts in silent mode in every test browser
    storageState: {
      cookies: [],
      origins: [{ origin: `http://localhost:${PORT}`, localStorage: [{ name: 'insula.mute', value: '1' }] }],
    },
  },
  projects: [
    { name: 'tab-s9-land', use: { ...devices['Galaxy Tab S9 landscape'] } },
    { name: 'tab-s9-port', use: { ...tabS9 } },
    { name: 'ipad', use: { ...devices['iPad (gen 11) landscape'] } },
  ],
  webServer: {
    command: `npm run build -- --mode test && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/insula-jocurilor/`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
