const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const yaml = require('js-yaml');
const Store = require('electron-store');
const stringify = require('stringify');
const store = new Store({
    fileExtension: 'yaml',
    serialize: yaml.dump,
    deserialize: yaml.load,
    cwd: path.join(app.getPath('appData'), app.getName()),
    name: 'default'
});

let mainWindow;

function addIpcListener() {
    ipcMain.on('get-host-config', (event, arg) => {
        event.returnValue = store.get('config.hostname');
    });
    ipcMain.on('get-primary-display-size', (event, arg) => {
        event.returnValue = screen.getPrimaryDisplay().size;
    });
}

function createWindow() {
    const size = screen.getPrimaryDisplay().size;
    mainWindow = new BrowserWindow({
        left: 0,
        top: 0,
        width: size.width,
        height: size.height,
        frame: process.platform === 'darwin' ? true : false,
        show: false,
        transparent: true,
        resizable: false,
        hasShadow: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(app.getAppPath(), 'renderer.js')
        }
    });

    mainWindow.setIgnoreMouseEvents(true);
    mainWindow.maximize();

    mainWindow.loadURL('file://' + __dirname + '/index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });
}

app.on('ready', () => {
    addIpcListener();
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
