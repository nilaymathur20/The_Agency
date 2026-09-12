/**
 * AI Agency — Electron Desktop (main process)
 * Loads the Agency dashboard and auto-starts Python backend if needed.
 */
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const BACKEND_URL = process.env.AGENCY_URL || 'http://localhost:8000';
const DASHBOARD_URL = `${BACKEND_URL}/static/`;
const HEALTH_URL = `${BACKEND_URL}/api/health`;

let mainWindow = null;
let backendProcess = null;
let isDev = process.argv.includes('--dev');

// ---------- helpers ----------
function isBackendUp(url = HEALTH_URL, timeout = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeout, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startBackend() {
  if (backendProcess) return backendProcess;
  console.log('[electron] starting Python backend:', BACKEND_URL);

  // spawn uvicorn: PYTHONPATH=backend python -m uvicorn agency.app:app --host 0.0.0.0 --port 8000
  const env = { ...process.env, PYTHONPATH: path.join(__dirname, 'backend') };
  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

  try {
    backendProcess = spawn(
      pythonCmd,
      ['-m', 'uvicorn', 'agency.app:app', '--host', '0.0.0.0', '--port', '8000'],
      {
        cwd: __dirname,
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      }
    );

    backendProcess.stdout.on('data', (d) => console.log('[backend]', d.toString().trim()));
    backendProcess.stderr.on('data', (d) => console.error('[backend]', d.toString().trim()));
    backendProcess.on('exit', (code) => {
      console.log(`[backend] exited with code ${code}`);
      backendProcess = null;
    });
  } catch (e) {
    console.error('[electron] failed to spawn backend:', e);
    dialog.showErrorBox('Backend failed', String(e));
  }
  return backendProcess;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f1115',
    title: 'AI Agency — Autonomous Engineering',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
    autoHideMenuBar: false,
  });

  // show when ready
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // menu
  const template = [
    {
      label: 'Agency',
      submenu: [
        { label: 'Dashboard', click: () => mainWindow.loadURL(DASHBOARD_URL) },
        { label: 'API Docs', click: () => shell.openExternal(`${BACKEND_URL}/docs`) },
        { label: 'Health', click: () => shell.openExternal(HEALTH_URL) },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => {
            const z = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(z + 0.5);
          }},
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => {
            const z = mainWindow.webContents.getZoomLevel();
            mainWindow.webContents.setZoomLevel(z - 0.5);
          }},
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About AI Agency', click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'AI Agency',
            message: 'AI Agency — Autonomous Software-Engineering Agency',
            detail: '201 logical agents • Tool Gateway • Orchestrator • Model Router\n\nBackend: FastAPI (mock/OpenRouter)\nDashboard: /static/\n\nPress Ctrl+Shift+I for DevTools.',
          }) },
        { label: 'Open Workspace Folder', click: async () => {
            const ws = path.join(__dirname, 'workspace', 'projects');
            await shell.openPath(ws);
          }},
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // external links -> system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // load with retry (wait for backend)
  async function loadWithRetry(attempts = 20) {
    for (let i = 0; i < attempts; i++) {
      const up = await isBackendUp();
      if (up) {
        console.log('[electron] backend is up, loading', DASHBOARD_URL);
        await mainWindow.loadURL(DASHBOARD_URL);
        if (isDev) mainWindow.webContents.openDevTools();
        return;
      }
      console.log(`[electron] waiting for backend... ${i + 1}/${attempts}`);
      await new Promise((r) => setTimeout(r, 800));
    }
    // fallback: load local file with banner
    console.warn('[electron] backend not reachable, loading local frontend');
    const localPath = path.join(__dirname, 'frontend', 'index.html');
    await mainWindow.loadFile(localPath);
    dialog.showMessageBox(mainWindow, {
      type: 'warning',
      title: 'Backend not reachable',
      message: `Could not reach ${HEALTH_URL}`,
      detail: 'Make sure the Python backend is running:\n\nPYTHONPATH=backend python -m uvicorn agency.app:app --host 0.0.0.0 --port 8000\n\nLoaded local frontend instead (no live data).',
    });
  }

  loadWithRetry();

  mainWindow.on('closed', () => (mainWindow = null));
}

// ---------- app lifecycle ----------
app.whenReady().then(async () => {
  // if no backend, try to start one (unless user runs backend separately)
  const up = await isBackendUp();
  if (!up) {
    console.log('[electron] no backend detected at', HEALTH_URL, '— auto-starting');
    startBackend();
    // give it a moment
    await new Promise((r) => setTimeout(r, 2500));
  } else {
    console.log('[electron] backend already running at', BACKEND_URL);
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// quit backend when electron quits
app.on('before-quit', () => {
  if (backendProcess) {
    console.log('[electron] killing backend process', backendProcess.pid);
    try {
      backendProcess.kill('SIGTERM');
    } catch {}
    backendProcess = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// for sandbox on Linux CI (E2B etc.) you may need --no-sandbox
if (process.platform === 'linux') {
  // app.commandLine.appendSwitch('no-sandbox');
}

// IPC example (dashboard can call window.agency.*)
ipcMain.handle('get-backend-url', () => BACKEND_URL);
ipcMain.handle('get-app-version', () => app.getVersion());
