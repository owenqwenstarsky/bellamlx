import { test, expect, _electron as electron } from '@playwright/test'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('rendered chat streams, cancels, recovers from errors and retains history', async ({}, info) => {
  let fail = false, slow = false
  const backend = createServer(async (req, res) => {
    if (!req.url?.includes('chat/completions')) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ status: 'ok', data: [{ id: 'fixture-qwen' }] }))
      return
    }
    for await (const _chunk of req) { /* consume request */ }
    if (fail) { res.writeHead(503); res.end('fixture unavailable'); return }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    const chunk = (content: string) => res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content }, finish_reason: null }] })}\n\n`)
    chunk('Fixture response')
    const timer = setTimeout(() => { chunk(' complete.'); res.end('data: [DONE]\n\n') }, slow ? 30_000 : 100)
    res.on('close', () => clearTimeout(timer))
  })
  await new Promise<void>(resolve => backend.listen(0, '127.0.0.1', resolve))
  const address = backend.address() as { port: number }
  const backendUrl = `http://127.0.0.1:${address.port}`
  const profile = await mkdtemp(join(tmpdir(), 'bellamlx-chat-'))
  const logs: string[] = []
  const app = await electron.launch({ args: ['dist/test/main.mjs'], env: { ...process.env, VMLX_USER_DATA_DIR: profile, BELLAMLX_FIXTURE_BACKEND: backendUrl } })
  app.process().stderr?.on('data', data => logs.push(String(data)))
  await app.context().tracing.start({ screenshots: true, snapshots: true })
  const page = await app.firstWindow()
  page.on('pageerror', error => logs.push(error.message))
  try {
    const chatId = await page.evaluate(async url => {
      const result = await window.api.sessions.createRemote({ remoteUrl: url, remoteModel: 'fixture-qwen' })
      if (!result.success) throw new Error(result.error)
      const session = result.session
      await window.api.sessions.start(session.id)
      const chat = await window.api.chat.create('Fixture chat', session.modelPath, undefined, session.modelPath)
      await window.api.settings.set('appMode', 'chat')
      await window.api.settings.set('lastActiveChatId', chat.id)
      await window.api.settings.set('lastActiveSessionId', session.id)
      return chat.id
    }, backendUrl)
    await page.reload()
    const input = page.locator('textarea').first()
    await expect(input).toBeVisible()
    await input.fill('Hello fixture')
    await input.press('Enter')
    await expect(page.getByText('Fixture response complete.', { exact: true })).toBeVisible()
    slow = true
    await input.fill('Keep going')
    await input.press('Enter')
    await expect.poll(() => page.evaluate(id => window.api.chat.isStreaming(id), chatId)).toBe(true)
    await page.getByTitle('New chat', { exact: true }).click()
    await expect.poll(() => page.evaluate(() => window.api.settings.get('lastActiveChatId'))).not.toBe(chatId)
    const otherChat = await page.evaluate(() => window.api.settings.get('lastActiveChatId'))
    expect(await page.evaluate(id => window.api.chat.getMessages(id!), otherChat)).toEqual([])
    await expect(page.getByText('Fixture response', { exact: true })).not.toBeVisible()
    await page.getByText('Fixture chat', { exact: true }).click()
    await expect(page.getByRole('button', { name: /stop/i }).last()).toBeVisible()
    await page.getByRole('button', { name: /stop/i }).last().click()
    slow = false
    fail = true
    await input.fill('Fail this request')
    await input.press('Enter')
    await expect(page.getByText(/503|fixture unavailable/).first()).toBeVisible()
    fail = false
    await input.fill('Recover')
    await input.press('Enter')
    await expect.poll(async () => (await page.evaluate(id => window.api.chat.getMessages(id), chatId)).filter((m: any) => m.role === 'assistant' && m.content.includes('complete.')).length).toBe(2)
    await page.screenshot({ path: info.outputPath('chat.png') })
    const original = await page.evaluate(() => window.api.settings.get('lastActiveSessionId'))
    await page.evaluate(async ({ url, id }) => {
      const alternative = await window.api.sessions.createRemote({ remoteUrl: url, remoteModel: 'other-qwen' })
      await window.api.sessions.start(alternative.session.id)
      await window.api.sessions.delete(id!)
    }, { url: backendUrl, id: original })
    await expect(input).toBeDisabled()
    expect(await page.evaluate(() => window.api.settings.get('lastActiveSessionId'))).toBe(original)

  } finally {
    await page.screenshot({ path: info.outputPath('last-screen.png') }).catch(() => {})
    await app.context().tracing.stop({ path: info.outputPath('trace.zip') })
    await app.close()
    backend.closeAllConnections()
    await new Promise<void>(resolve => backend.close(() => resolve()))
    await rm(profile, { recursive: true, force: true })
    await info.attach('electron.log', { body: logs.join('\n'), contentType: 'text/plain' })
  }
})
