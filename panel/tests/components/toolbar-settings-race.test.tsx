// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ sessions: [] as any[] }))
vi.mock('../../src/renderer/src/contexts/SessionsContext', () => ({ useSessionsContext: () => fixture }))
vi.mock('../../src/renderer/src/components/sessions/ServerSettingsDrawer', () => ({ ServerSettingsDrawer: ({ session }: { session: { id: string } }) => <output>{session.id}</output> }))
import { ChatModeToolbar } from '../../src/renderer/src/components/layout/ChatModeToolbar'
afterEach(cleanup)
it('keeps settings bound to the selected model when old session details arrive last', async () => {
  const row = (id: string) => ({ id, modelPath: `remote://${id}`, modelName: id, host: 'localhost', port: 1, status: 'running', config: '{}', type: 'remote', modelPathMissing: false })
  fixture.sessions = [row('a'), row('b')]
  const resolve: Record<string, (value: any) => void> = {}
  const get = vi.fn<Window['api']['sessions']['get']>(id => new Promise(done => { resolve[id] = done }))
  Object.defineProperty(window, 'api', { configurable: true, value: { sessions: { get } } })
  const props = { activeChatId: 'chat', onSessionChange: vi.fn(), onOverridesChanged: vi.fn() }
  const view = render(<ChatModeToolbar {...props} activeSessionId="a" />)
  view.rerender(<ChatModeToolbar {...props} activeSessionId="b" />)
  await act(async () => resolve.b(row('b')))
  await userEvent.click(document.querySelector('[data-vmlx-control="server-settings"]')!)
  expect(screen.getByRole('status').textContent).toBe('b')
  await act(async () => resolve.a(row('a')))
  expect(screen.getByRole('status').textContent).toBe('b')
})
