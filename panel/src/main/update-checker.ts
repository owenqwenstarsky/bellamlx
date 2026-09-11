import type { BrowserWindow } from 'electron'

/** Public distribution is deferred. Never query upstream release services. */
export function checkForUpdates(_getWindow: () => BrowserWindow | null, _currentVersion: string): void {}
