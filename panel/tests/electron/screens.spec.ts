import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('core screens at fixed size and minimum layout', async ({}, info) => {
  const profile = await mkdtemp(join(tmpdir(), 'bellamlx-screens-'))
  const app = await electron.launch({ args: ['dist/test/main.mjs'], env: { ...process.env, VMLX_USER_DATA_DIR: profile, BELLAMLX_FIXTURE_BACKEND: 'screens' } })
  const logs: string[] = []
  app.process().stderr?.on('data', data => logs.push(String(data)))
  await app.context().tracing.start({ screenshots: true, snapshots: true })
  const page = await app.firstWindow()
  await page.setViewportSize({ width: 1100, height: 760 })
  const snapshot = async (name: string) => {
    await page.mouse.move(600, 15)
    await expect(page).toHaveScreenshot(name, { animations: 'disabled', scale: 'css' })
  }
  try {
    await expect(page.locator('[data-vmlx-control="console-preferences"]')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    const localePicker = page.locator('[data-vmlx-locale-picker]')
    await localePicker.focus()
    await page.keyboard.press('Enter')
    await expect(localePicker).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(localePicker).toHaveAttribute('aria-expanded', 'false')
    await expect(localePicker).toBeFocused()
    await page.locator('main').click({ position: { x: 400, y: 5 } })

    await snapshot('chat-empty.png')
    await page.locator('[data-vmlx-control="mode-server"]').click()
    await snapshot('servers-empty.png')
    await page.locator('[data-vmlx-control="mode-models"]').click()
    await snapshot('models.png')
    await page.locator('[data-vmlx-control="console-preferences"]').click()
    const preference = page.getByRole('switch')
    await expect(preference).toBeEnabled()
    await snapshot('preferences.png')
    const previous = await preference.getAttribute('aria-checked')
    await preference.click()
    await expect(preference).toHaveAttribute('aria-checked', previous === 'true' ? 'false' : 'true')
    await page.reload()
    await page.locator('[data-vmlx-control="console-preferences"]').click()
    await expect(page.getByRole('switch')).toHaveAttribute('aria-checked', previous === 'true' ? 'false' : 'true')
    await page.setViewportSize({ width: 800, height: 600 })
    await snapshot('preferences-minimum.png')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  } finally {
    await app.context().tracing.stop({ path: info.outputPath('trace.zip') })
    await app.close()
    await info.attach('electron.log', { body: logs.join(''), contentType: 'text/plain' })
    await rm(profile, { recursive: true, force: true })
  }
})
