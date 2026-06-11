// Electron main process — loads the built single-file app.
// localStorage (pg-v3, pg-tags-v1, pg-planner-v2) persists in the app's
// userData directory, so the user's stable and projects survive restarts.
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 860,
    backgroundColor: '#07080f',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Open any external links (the host link-confirmation flow) in the OS browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
