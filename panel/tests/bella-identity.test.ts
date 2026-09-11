import { afterEach, expect, it, vi } from 'vitest'
import { checkForUpdates } from '../src/main/update-checker'

afterEach(() => vi.useRealTimers())
it('never schedules or fetches an upstream app update', () => {
  vi.useFakeTimers()
  const getWindow = vi.fn()
  checkForUpdates(getWindow, '0.0.0')
  expect(vi.getTimerCount()).toBe(0)
  expect(getWindow).not.toHaveBeenCalled()
})
