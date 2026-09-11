// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { SessionsProvider, useSessionsContext, type SessionSummary } from '../../src/renderer/src/contexts/SessionsContext'
const row: SessionSummary = { id: 'a', modelPath: '/fixture/a', host: 'localhost', port: 8000, status: 'loading', modelPathMissing: false }
function View() {
  const { sessions } = useSessionsContext()
  return <output>{sessions.map(s => `${s.id}:${s.status}`).join(',')}</output>
}
afterEach(cleanup)
it('does not restore a loading session when a delayed list arrives after stop', async () => {
  let delayed!: (rows: SessionSummary[]) => void
  const handlers: Record<string, (data: { sessionId: string }) => void> = {}
  const list = vi.fn<Window['api']['sessions']['list']>().mockResolvedValueOnce([row]).mockImplementation(() => new Promise(resolve => { delayed = resolve }))
  const sessions: Record<string, unknown> = { list }
  for (const event of ['onCreated', 'onDeleted', 'onUpdated', 'onStarting', 'onReady', 'onStopped', 'onError', 'onHealth']) {
    sessions[event] = (handler: typeof handlers[string]) => { handlers[event] = handler; return () => {} }
  }
  Object.defineProperty(window, 'api', { configurable: true, value: { sessions } })
  render(<SessionsProvider><View /></SessionsProvider>)
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe('a:loading'))
  act(() => { handlers.onUpdated({ sessionId: 'a' }) })
  act(() => handlers.onStopped({ sessionId: 'a' }))
  await act(async () => delayed([row]))
  expect(screen.getByRole('status').textContent).toBe('a:stopped')
})

it('shares duplicate starts and catches ready emitted before the start reply', async () => {
  const handlers: Record<string, Set<(data: any) => void>> = {}
  const emit = (event: string, data: any) => handlers[event]?.forEach(handler => handler(data))
  const stopped = { ...row, status: 'stopped' as const }
  const list = vi.fn().mockResolvedValue([stopped])
  const start = vi.fn(async () => { emit('onReady', { sessionId: row.id }); return { success: true } })
  const sessions: Record<string, unknown> = { list, start }
  for (const event of ['onCreated', 'onDeleted', 'onUpdated', 'onStarting', 'onReady', 'onStopped', 'onError', 'onHealth']) {
    handlers[event] = new Set()
    sessions[event] = (handler: (data: any) => void) => { handlers[event].add(handler); return () => handlers[event].delete(handler) }
  }
  Object.defineProperty(window, 'api', { configurable: true, value: { sessions } })
  let ensure!: ReturnType<typeof useSessionsContext>['ensureSessionRunning']
  function Capture() { ensure = useSessionsContext().ensureSessionRunning; return null }
  render(<SessionsProvider><Capture /></SessionsProvider>)
  let first!: Promise<SessionSummary>, second!: Promise<SessionSummary>
  await act(async () => {
    first = ensure(row.modelPath)
    second = ensure(row.modelPath)
    expect(first).toBe(second)
    expect(await first).toMatchObject({ status: 'running' })
  })
  expect(start).toHaveBeenCalledTimes(1)
})

it.each(['loading', 'stopped'] as const)('settles a %s load on Stop even with a delayed start reply, and permits retry', async initialStatus => {
  const handlers: Record<string, Set<(data: any) => void>> = {}
  const emit = (event: string) => handlers[event]?.forEach(handler => handler({ sessionId: row.id }))
  const list = vi.fn().mockResolvedValue([{ ...row, status: initialStatus }])
  const start = vi.fn(() => new Promise(() => {}))
  const sessions: Record<string, unknown> = { list, start }
  for (const event of ['onCreated', 'onDeleted', 'onUpdated', 'onStarting', 'onReady', 'onStopped', 'onError', 'onHealth']) {
    handlers[event] = new Set()
    sessions[event] = (handler: (data: any) => void) => { handlers[event].add(handler); return () => handlers[event].delete(handler) }
  }
  Object.defineProperty(window, 'api', { configurable: true, value: { sessions } })
  let ensure!: ReturnType<typeof useSessionsContext>['ensureSessionRunning']
  function Capture() { ensure = useSessionsContext().ensureSessionRunning; return null }
  render(<SessionsProvider><Capture /></SessionsProvider>)
  let first!: Promise<SessionSummary>
  await act(async () => { first = ensure(row.modelPath); void first.catch(() => {}); await Promise.resolve() })
  await act(async () => { emit('onStopped'); await expect(first).rejects.toThrow('cancelled') })
  let retry!: Promise<SessionSummary>
  await act(async () => { retry = ensure(row.modelPath); await Promise.resolve() })
  await act(async () => { emit('onReady'); expect(await retry).toMatchObject({ status: 'running' }) })
})

it('wakes standby sessions, reports wake failure, and permits retry without starting a new engine', async () => {
  const wake = vi.fn<Window['api']['sessions']['wake']>()
    .mockResolvedValueOnce({ success: false, error: 'Wake failed' })
    .mockResolvedValueOnce({ success: true })
  const start = vi.fn()
  const sessions: Record<string, unknown> = {
    list: vi.fn().mockResolvedValue([{ ...row, status: 'standby' }]), wake, start,
  }
  for (const event of ['onCreated', 'onDeleted', 'onUpdated', 'onStarting', 'onReady', 'onStopped', 'onError', 'onHealth']) {
    sessions[event] = () => () => {}
  }
  Object.defineProperty(window, 'api', { configurable: true, value: { sessions } })
  let ensure!: ReturnType<typeof useSessionsContext>['ensureSessionRunning']
  function Capture() { ensure = useSessionsContext().ensureSessionRunning; return null }
  render(<SessionsProvider><Capture /></SessionsProvider>)
  await act(async () => { await expect(ensure(row.modelPath)).rejects.toThrow('Wake failed') })
  await act(async () => { await expect(ensure(row.modelPath)).resolves.toMatchObject({ id: row.id, status: 'running' }) })
  expect(wake).toHaveBeenCalledTimes(2)
  expect(wake).toHaveBeenLastCalledWith(row.id)
  expect(start).not.toHaveBeenCalled()
})
