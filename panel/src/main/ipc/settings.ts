import { ipcMain } from 'electron'
import { db } from '../database'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', (_event, key: string) => db.getSetting(key) ?? null)
  ipcMain.handle('settings:has', (_event, key: string) => db.hasSetting(key))
  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    db.setSetting(key, value)
    return { success: true }
  })
  ipcMain.handle('settings:delete', (_event, key: string) => {
    db.deleteSetting(key)
    return { success: true }
  })
}
