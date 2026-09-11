import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('real preload and chat IPC preserve isolated chats and settings across restart', async ({}, info) => {
  const profile = await mkdtemp(join(tmpdir(), 'bellamlx-electron-'))
  let app: ElectronApplication | undefined
  const logs: string[] = []
  const launch = async () => {
    const instance = await electron.launch({ args: ['dist/test/main.mjs'], env: { ...process.env, VMLX_USER_DATA_DIR: profile, BELLAMLX_FIXTURE_INTERRUPTED: '1' } })
    instance.process().stderr?.on('data', data => logs.push(String(data)))
    await instance.context().tracing.start({ screenshots: true, snapshots: true })
    return instance
  }
  try {
    app = await launch()
    expect(await app.evaluate(({ app }) => ({ name: app.getName(), profile: app.getPath('userData') }))).toEqual({ name: 'bellaMLX', profile })
    let page = await app.firstWindow()
    await expect(page.getByText('Welcome to bellaMLX')).toBeVisible()
    const chat = await page.evaluate(async () => {
      await window.api.settings.set('fixture-preference', 'saved')
      return window.api.chat.create('Fixture conversation', 'fixture-model', undefined, '/fixture/model')
    })
    await app.context().tracing.stop()
    await app.close()
    app = await launch()
    page = await app.firstWindow()
    expect(await page.evaluate(() => window.api.settings.get('fixture-preference'))).toBe('saved')
    const restored = await page.evaluate(id => window.api.chat.get(id), chat.id)
    expect(restored).toMatchObject({ id: chat.id, title: 'Fixture conversation', modelPath: '/fixture/model' })
    const interrupted = await page.evaluate(() => window.api.sessions.get('fixture-interrupted'))
    expect(interrupted.status).toBe('stopped')
    expect(interrupted.pid).toBeFalsy()

    await page.screenshot({ path: info.outputPath('setup.png') })
  } finally {
    if (app) {
      await app.context().tracing.stop({ path: info.outputPath('trace.zip') }).catch(() => {})
      await app.close().catch(() => {})
    }
    await info.attach('electron.log', { body: logs.join(''), contentType: 'text/plain' })
    await rm(profile, { recursive: true, force: true })
  }
})
