'use strict';

// Mira main process: hosts the renderer, bridges the SmartSpectra SDK over
// IPC, and grants camera access only to the bundled local page.

const fs = require('fs');
const path = require('path');
const { app, BrowserWindow, session, ipcMain } = require('electron');
const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');

const MOCK = process.argv.includes('--mock');
const HARNESS = process.argv.includes('--harness');

// Permanent key: .env (gitignored) fills process.env when the shell didn't.
// One line, no dependency: KEY=VALUE, # comments, quotes stripped.
function loadDotEnv() {
  if (process.env.MIRA_API_KEY) return;
  let text;
  try {
    text = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*MIRA_API_KEY\s*=\s*(.*?)\s*$/);
    if (m && !process.env.MIRA_API_KEY) {
      process.env.MIRA_API_KEY = m[1].replace(/^['"]|['"]$/g, '');
    }
  }
}

loadDotEnv();

// Headless harness: software Vulkan (lavapipe) so GPU-backed model loaders
// init without a GPU or sudo. Rewrites the bundled ICD to an absolute
// library path in tmp (loader resolves relative paths against CWD) and
// points the loader at it. Must run before first vkCreateInstance.
if (HARNESS && !process.env.VK_ICD_FILENAMES) {
  try {
    const os = require('os');
    const src = path.join(__dirname, 'sw-vulkan', 'lvp_icd.x86_64.json');
    const lib = path.join(__dirname, 'sw-vulkan', 'libvulkan_lvp.so');
    if (fs.existsSync(src) && fs.existsSync(lib)) {
      const icd = JSON.parse(fs.readFileSync(src, 'utf8'));
      icd.ICD.library_path = lib;
      const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mira-vk-')), 'lvp_icd.json');
      fs.writeFileSync(out, JSON.stringify(icd));
      process.env.VK_ICD_FILENAMES = out;
      console.log('[mira:main] harness software Vulkan enabled');
    }
  } catch (e) {
    console.warn('[mira:main] software Vulkan setup failed, continuing:', e.message);
  }
}

// Key channel: the sandboxed renderer cannot read argv or env, so it asks
// over IPC. Main owns the secret; the value never touches disk or query
// strings. Shell env wins over .env (see loadDotEnv).
ipcMain.handle('mira:get-api-key', () => {
  const v = process.env.MIRA_API_KEY || '';
  console.log(`[mira:main] get-api-key -> length ${v.length}`);
  return v;
});
console.log(`[mira:main] boot, MIRA_API_KEY length ${(process.env.MIRA_API_KEY || '').length}`);

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    backgroundColor: '#f4efe4',
    webPreferences: {
      preload: path.join(__dirname, 'dist', 'preload.bundle.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  bindSmartSpectraIpc(win);

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event) => event.preventDefault());

  win.loadFile(path.join(__dirname, 'index.html'), { query: Object.assign({}, MOCK ? { mock: '1' } : {}, HARNESS ? { harness: '1' } : {}) });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    const url = (details && details.requestingUrl) || (wc && wc.getURL()) || '';
    const mediaTypes = (details && details.mediaTypes) || [];
    const cameraOnly = mediaTypes.length === 1 && mediaTypes[0] === 'video';
    callback(permission === 'media' && cameraOnly && url.startsWith('file://'));
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
