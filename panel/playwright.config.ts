import { defineConfig } from '@playwright/test'
import { execFileSync } from 'node:child_process'

// CoreText and emoji rendering vary across macOS releases, even with bundled fonts.
const snapshotPlatform = process.platform === 'darwin'
  ? `darwin-macos-${execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim().split('.')[0]}`
  : process.platform

export default defineConfig({
  testDir: './tests/electron',
  snapshotPathTemplate: `{testDir}/{testFilePath}-snapshots/{arg}-${snapshotPlatform}{ext}`,
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})
