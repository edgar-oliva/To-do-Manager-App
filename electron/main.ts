import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

function log(msg: string) {
    try {
        const logPath = path.join(app.getPath('desktop'), 'app-debug.log');
        fs.appendFileSync(logPath, new Date().toISOString() + ' ' + msg + '\n');
    } catch (e) {
        // ignore
    }
}

// IPC Data Handling
const STORAGE_FILE = path.join(app.getPath('userData'), 'storage.json');

ipcMain.handle('save-data', async (event, key, data) => {
    try {
        let currentData = {};
        if (fs.existsSync(STORAGE_FILE)) {
            currentData = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
        }
        currentData[key] = data;
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(currentData), 'utf8');
        return true;
    } catch (e) {
        log(`Save error for ${key}: ${e}`);
        return false;
    }
});

ipcMain.handle('load-data', async (event, key) => {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const currentData = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
            return currentData[key] || null;
        }
        return null;
    } catch (e) {
        log(`Load error for ${key}: ${e}`);
        return null;
    }
});

function createWindow() {
    log('createWindow called');

    app.name = 'My Task Manager';

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        },
    });

    const isDev = !app.isPackaged;
    log('isDev: ' + isDev);

    win.setTitle('My Task Manager v1.8.4');

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        const appPath = app.getAppPath();
        log('appPath: ' + appPath);

        const distIndex = path.join(appPath, 'dist/index.html');
        log('distIndex target: ' + distIndex);

        win.loadFile(distIndex).then(() => {
            log('loadFile success');
        }).catch((e: Error) => {
            log('loadFile failed: ' + e);
        });

        win.webContents.on('devtools-opened', () => {
            win.webContents.closeDevTools();
        });

        win.webContents.on('before-input-event', (event: any, input: any) => {
            if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
                event.preventDefault();
            }
            if ((input.control || input.meta) && input.alt && input.key.toLowerCase() === 'i') {
                event.preventDefault();
            }
            if (input.key === 'F12') {
                event.preventDefault();
            }
        });
    }

    win.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
}

app.whenReady().then(() => {
    log('app.whenReady');
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    log('window-all-closed');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
