import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const modelPath = process.env.BELLAMLX_SMOKE_MODEL_PATH
test('Apple Silicon: load, chat, cancel, follow up, stop and restart', async ({}, info) => {
  test.skip(!modelPath, 'Supply BELLAMLX_SMOKE_MODEL_PATH explicitly; no discovery or download')
  test.setTimeout(300_000)
  const root = await mkdtemp(join(tmpdir(), 'bellamlx-live-'))
  const model = join(root, 'model')
  // The inherited loader can repair alignment. Never mutate the supplied model.
  await cp(modelPath!, model, { recursive: true, dereference: true })
  const app = await electron.launch({ args: ['dist/test/main.mjs'], env: { ...process.env,
    VMLX_USER_DATA_DIR: join(root, 'profile'), BELLAMLX_FIXTURE_BACKEND: 'local',
    VMLX_ALLOW_SECONDARY_INSTANCE: '1', VMLX_PROOF_OWNED_ENGINE_LIFECYCLE: '1',
    HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1',
  } })
  const logs: string[] = []
  app.process().stderr?.on('data', data => logs.push(String(data)))
  const page = await app.firstWindow()
  await app.context().tracing.start({ screenshots: true, snapshots: true })
  let sessionId = ''
  try {
    const selected = await page.evaluate(async path => {
      const result = await window.api.sessions.create(path, { continuousBatching: false, maxTokens: 128, enableBlockDiskCache: false })
      if (!result.success) throw new Error(result.error)
      return result.session
    }, model)
    sessionId = selected.id
    const started = await page.evaluate(id => window.api.sessions.start(id), sessionId)
    expect(started, JSON.stringify(started)).toMatchObject({ success: true })
    await expect.poll(async () => (await page.evaluate(id => window.api.sessions.get(id), sessionId)).status, { timeout: 180_000 }).toBe('running')
    const chatId = await page.evaluate(async session => {
      const chat = await window.api.chat.create('Local Qwen smoke', session.modelPath, undefined, session.modelPath)
      await window.api.chat.setOverrides(chat.id, { enableThinking: false, maxTokens: 128 })
      await window.api.settings.set('appMode', 'chat')
      await window.api.settings.set('lastActiveChatId', chat.id)
      await window.api.settings.set('lastActiveSessionId', session.id)
      return chat.id
    }, selected)
    await page.reload()
    const input = page.locator('textarea').first()
    await input.fill('Reply with the word hello.')
    await input.press('Enter')
    await expect.poll(async () => (await page.evaluate(id => window.api.chat.getMessages(id), chatId)).filter((m: any) => m.role === 'assistant' && m.content.trim()).length, { timeout: 60_000 }).toBe(1)
    await expect.poll(() => page.evaluate(id => window.api.chat.isStreaming(id), chatId)).toBe(false)
    await input.fill('Write a long story about a forest.')
    await input.press('Enter')
    await page.getByRole('button', { name: /stop/i }).last().click()
    await expect.poll(() => page.evaluate(id => window.api.chat.isStreaming(id), chatId)).toBe(false)
    const repliesBeforeFollowup = await page.evaluate(async id => (await window.api.chat.getMessages(id)).filter((m: any) => m.role === 'assistant' && m.content.trim()).length, chatId)
    await input.fill('Now reply with goodbye.')
    await input.press('Enter')
    await expect.poll(async () => page.evaluate(async id => (await window.api.chat.getMessages(id)).filter((m: any) => m.role === 'assistant' && m.content.trim()).length, chatId), { timeout: 60_000 }).toBeGreaterThan(repliesBeforeFollowup)
    await expect.poll(() => page.evaluate(id => window.api.chat.isStreaming(id), chatId), { timeout: 60_000 }).toBe(false)
    expect(await page.evaluate(id => window.api.sessions.stop(id), sessionId)).toMatchObject({ success: true })
    await expect.poll(async () => (await page.evaluate(id => window.api.sessions.get(id), sessionId)).status).toBe('stopped')
    expect(await page.evaluate(id => window.api.sessions.start(id), sessionId)).toMatchObject({ success: true })
    await expect.poll(async () => (await page.evaluate(id => window.api.sessions.get(id), sessionId)).status, { timeout: 180_000 }).toBe('running')
    await page.reload()
    expect((await page.evaluate(id => window.api.chat.getMessages(id), chatId)).length).toBeGreaterThanOrEqual(4)
    await page.screenshot({ path: info.outputPath('live-qwen.png') })
    logs.push(JSON.stringify(await page.evaluate(id => window.api.sessions.getLogs(id), sessionId)))
  } finally {
    if (sessionId) await page.evaluate(id => window.api.sessions.stop(id), sessionId).catch(() => {})
    await app.context().tracing.stop({ path: info.outputPath('trace.zip') })
    await app.close()
    await info.attach('live-model.log', { body: logs.join('\n'), contentType: 'text/plain' })
    await rm(root, { recursive: true, force: true })
  }
})
