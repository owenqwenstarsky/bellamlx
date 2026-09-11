import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/electron',
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})
