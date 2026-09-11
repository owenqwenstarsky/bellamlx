import { expect, it, vi } from 'vitest'
const calls = vi.hoisted(() => ({ setName: vi.fn(), setPath: vi.fn(), mkdir: vi.fn() }))
vi.mock('electron', () => ({ app: { setName: calls.setName, getPath: () => '/fixture/application-data', setPath: calls.setPath } }))
vi.mock('fs', () => ({ mkdirSync: calls.mkdir }))
import '../src/main/user-data-dir'

it('sets the fork identity and isolated default profile before persistence imports', () => {
  expect(calls.setName).toHaveBeenCalledWith('bellaMLX')
  expect(calls.setPath).toHaveBeenCalledWith('userData', '/fixture/application-data/bellaMLX')
  expect(calls.mkdir).toHaveBeenCalledWith('/fixture/application-data/bellaMLX', { recursive: true })
})
