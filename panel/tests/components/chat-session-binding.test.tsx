// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { useChatSessionBinding } from '../../src/renderer/src/hooks/useChatSessionBinding'
const sessions = [{ id: 'model-b', modelPath: '/fixture/b', host: 'localhost', port: 1, status: 'running' as const, modelPathMissing: false }]
afterEach(cleanup)
it('does not reopen the previous chat when its model save finishes after navigation', async () => {
  let finish!: () => void
  const update = vi.fn<Window['api']['chat']['update']>(() => new Promise(resolve => { finish = () => resolve({ success: true }) }))
  Object.defineProperty(window, 'api', { configurable: true, value: { chat: { update } } })
  const open = vi.fn()
  function View({ chatId }: { chatId: string }) {
    const change = useChatSessionBinding(chatId, sessions, open, vi.fn())
    return <button onClick={() => change('model-b')}>Change model</button>
  }
  const view = render(<View chatId="chat-a" />)
  await userEvent.click(screen.getByRole('button'))
  view.rerender(<View chatId="chat-b" />)
  await act(async () => finish())
  expect(update).toHaveBeenCalledWith('chat-a', { modelId: '/fixture/b', modelPath: '/fixture/b' })
  expect(open).not.toHaveBeenCalled()
})
it('reports save errors without applying an unpersisted model selection', async () => {
  const update = vi.fn<Window['api']['chat']['update']>().mockRejectedValue(new Error('disk full'))
  Object.defineProperty(window, 'api', { configurable: true, value: { chat: { update } } })
  const open = vi.fn(), report = vi.fn()
  function View() {
    const change = useChatSessionBinding('chat-a', sessions, open, report)
    return <button onClick={() => change('model-b')}>Change model</button>
  }
  render(<View />)
  await userEvent.click(screen.getByRole('button'))
  expect(open).not.toHaveBeenCalled()
  expect(report).toHaveBeenCalledWith('Error: disk full')
})
