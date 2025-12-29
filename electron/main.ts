const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

function log(msg: string) {
    try {
        const logPath = '/Users/edgarmartinez/Desktop/app-debug.log';
        fs.appendFileSync(logPath, new Date().toISOString() + ' ' + msg + '\n');
    } catch (e) {
        // ignore
    }
}

function createWindow() {
    log('createWindow called');
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        // Fix: path.join usually works but let's be safe
        icon: path.join(__dirname, '../public/favicon.ico'),
    });

    const isDev = !app.isPackaged;
    log('isDev: ' + isDev);
    log('__dirname: ' + __dirname);

    win.setTitle('Time Manager v1.4');

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // In production, resources are in compiled locations
        const appPath = app.getAppPath();
        log('appPath: ' + appPath);

        // Check for dist
        const distIndex = path.join(appPath, 'dist/index.html');
        log('distIndex target: ' + distIndex);

        win.loadFile(distIndex).then(() => {
            log('loadFile success');
        }).catch(e => {
            log('loadFile failed: ' + e);
            win.loadURL('data:text/html,<h1>Error loading app</h1><p>Check desktop log</p>');
        });

        // Strictly prevent DevTools
        win.webContents.on('devtools-opened', () => {
            win.webContents.closeDevTools();
        });

        // Disable keyboard shortcuts for DevTools
        win.webContents.on('before-input-event', (event, input) => {
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

    win.webContents.setWindowOpenHandler(({ url }) => {
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
