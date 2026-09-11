// Test-only entrypoint. Production builds never include this module.
import '../../src/main/user-data-dir'
import { app, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'node:path'
import { registerSettingsHandlers } from '../../src/main/ipc/settings'
import { registerSessionHandlers } from '../../src/main/ipc/sessions'
import { db } from '../../src/main/database'
import { apiGateway } from '../../src/main/api-gateway'
import { registerChatHandlers } from '../../src/main/ipc/chat'

if (!process.env.VMLX_USER_DATA_DIR) throw new Error('An isolated test profile is required')
// Confine development engine discovery to this checkout in the test entrypoint.
app.getAppPath = () => process.cwd()
app.commandLine.appendSwitch('force-device-scale-factor', '1')
app.whenReady().then(async () => {
  // Renderer traffic is local files only. Deterministic tests use a loopback backend;
  // only the opt-in live test invokes the real engine with a disposable model copy.
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }))
  let win: BrowserWindow
  registerChatHandlers(() => win)
  registerSessionHandlers(() => win)
  registerSettingsHandlers()
  // Persist the state an interrupted load would leave behind. On the next launch,
  // the real database startup reconciliation must clear it before rendering.
  if (process.env.BELLAMLX_FIXTURE_INTERRUPTED === '1' && !db.getSession('fixture-interrupted')) {
    db.createSession({ id: 'fixture-interrupted', modelPath: '/fixture/not-a-model',
      host: '127.0.0.1', port: 18999, status: 'loading', pid: 999999,
      config: '{}', type: 'local', createdAt: 1, updatedAt: 1 })
  }
  ipcMain.handle('engine:detect-installers', () => [])
  ipcMain.handle('engine:check-installation', () => ({ installed: !!process.env.BELLAMLX_FIXTURE_BACKEND }))
  ipcMain.handle('models:scan', () => [])
  ipcMain.handle('models:detect-config', () => ({}))
  ipcMain.handle('models:getDownloadStatus', () => ({ activeAll: [], queue: [] }))
  ipcMain.handle('gateway:setSingleModelMode', (_event, enabled) => {
    apiGateway.setSingleModelMode(enabled)
    win.webContents.send('gateway:singleModelModeChanged', { singleModelMode: enabled })
    return { running: false, port: 0, singleModelMode: apiGateway.singleModelMode }
  })
  ipcMain.handle('gateway:status', () => ({ running: false, port: 0, singleModelMode: apiGateway.singleModelMode }))
  ipcMain.handle('i18n:set-locale', (_event, locale) => ({ ok: true, locale }))
  ipcMain.handle('app:totalMemoryGB', () => 24)
  ipcMain.handle('app:getVersion', () => app.getVersion())
  win = new BrowserWindow({ width: 1100, height: 760, webPreferences: { preload: join(process.cwd(), 'dist/preload/index.js'), contextIsolation: true, sandbox: false } })
  await win.loadFile(join(process.cwd(), 'out/renderer/index.html'))
  app.on('window-all-closed', () => app.quit())

}).catch(error => { console.error(error); app.exit(1) })
