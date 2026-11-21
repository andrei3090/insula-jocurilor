import { defineConfig, devices } from '@playwright/test';

const tabS9 = devices['Galaxy Tab S9'];

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5191/insula-jocurilor/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'tab-s9-land', use: { ...devices['Galaxy Tab S9 landscape'] } },
    { name: 'tab-s9-port', use: { ...tabS9 } },
    { name: 'ipad', use: { ...devices['iPad (gen 11) landscape'] } },
  ],
  webServer: {
    command: 'npm run build -- --mode test && npm run preview',
    url: 'http://localhost:5191/insula-jocurilor/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
