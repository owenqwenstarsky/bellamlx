// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SingleModelPreference } from '../../src/renderer/src/components/layout/SingleModelPreference'

type Gateway = Pick<Window['api']['gateway'], 'getStatus' | 'setSingleModelMode' | 'onSingleModelModeChanged'>
const status = (singleModelMode: boolean) => ({ running: false, port: 0, singleModelMode })
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function fixture() {
  let event!: (data: { singleModelMode: boolean }) => void
  const unsubscribe = vi.fn()
  const gateway = {
    getStatus: vi.fn<Gateway['getStatus']>().mockResolvedValue(status(false)),
    setSingleModelMode: vi.fn<Gateway['setSingleModelMode']>().mockResolvedValue(status(true)),
    onSingleModelModeChanged: vi.fn<Gateway['onSingleModelModeChanged']>(listener => { event = listener; return unsubscribe }),
  } satisfies Gateway
  Object.defineProperty(window, 'api', { configurable: true, value: { gateway } })
  return { gateway, emit: (value: boolean) => act(() => event(status(value))), unsubscribe }
}
afterEach(cleanup)
describe('applied model-loading preference', () => {
  it('recovers after initial read fails', async () => {
    const { gateway } = fixture()
    gateway.getStatus.mockRejectedValueOnce(new Error('offline'))
    render(<SingleModelPreference />)
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('offline'))
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.getByRole('switch')).toHaveProperty('disabled', false))
    expect(gateway.getStatus).toHaveBeenCalledTimes(2)
  })
  it('disables duplicate writes, reports failure, and permits retry', async () => {
    const { gateway } = fixture()
    const write = deferred<ReturnType<typeof status>>()
    gateway.setSingleModelMode.mockReturnValueOnce(write.promise)
    render(<SingleModelPreference />)
    await waitFor(() => expect(screen.getByRole('switch')).toHaveProperty('disabled', false))
    await userEvent.dblClick(screen.getByRole('switch'))
    expect(gateway.setSingleModelMode).toHaveBeenCalledTimes(1)
    await act(async () => write.reject(new Error('failed')))
    expect(await screen.findByRole('alert')).toBeTruthy()
    await userEvent.click(screen.getByRole('switch'))
    await waitFor(() => expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true'))
  })
  it('keeps newer events when a stale read resolves or rejects', async () => {
    const { gateway, emit } = fixture()
    const read = deferred<ReturnType<typeof status>>()
    gateway.getStatus.mockReturnValue(read.promise)
    render(<SingleModelPreference />)
    emit(true)
    await act(async () => read.reject(new Error('stale error')))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  })
  it('unsubscribes on unmount', () => {
    const { unsubscribe } = fixture()
    render(<SingleModelPreference />).unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })
})
