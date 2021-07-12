const { app, BrowserWindow, screen, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const yaml = require('js-yaml');
const devToolHotKey = process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I';
const Store = require('electron-store');

let mainWindow;

function addIpcListener() {
    const store = new Store({
        fileExtension: 'yaml',
        serialize: yaml.dump,
        deserialize: yaml.load,
        cwd: path.join(app.getPath('appData'), app.getName()),
        name: 'default'
    });
    ipcMain.on('get-host-config', (event, arg) => {
        // ランタイムの環境変数 > 設定ファイル(default.yaml) > package.json 埋め込み値
        const runtimeValue = process.env.NICONICO_SLACK_HOSTNAME;
        const configValue = store.get('config.hostname');
        const embeddedValue = require('./package.json').config.niconico_slack_hostname;
        console.log(`runtime : ${runtimeValue}, config: ${configValue}, embedded: ${embeddedValue}`);
        const targetHost = runtimeValue || configValue || embeddedValue;
        console.log(`Hostname : ${targetHost}`);
        event.returnValue = targetHost;
    });
    ipcMain.on('get-primary-display-size', (event, arg) => {
        event.returnValue = screen.getPrimaryDisplay().size;
    });
}

function toggleDevTools(browserWindow) {
    if (browserWindow.isDevToolsOpened()) {
        browserWindow.closeDevTools();
    } else {
        browserWindow.openDevTools();
    }
}

function registerLocalShortcut(browserWindow) {
    globalShortcut.register(devToolHotKey, () => {
        toggleDevTools(browserWindow);
    });
}

function unregisterLocalShortcut(browserWindow) {
    try {
        globalShortcut.unregister(devToolHotKey);
    } catch(e) {
        // no-op
        console.warn(`unregister shortcut failed. error = ${e}`);
    }
}

function setupDevTools(browserWindow) {
    app.on('browser-window-blur', () => {
        unregisterLocalShortcut();
    });
    app.on('browser-window-focus', () => {
        registerLocalShortcut(browserWindow);
    });
    app.on('browser-window-created', () => {
        registerLocalShortcut(browserWindow);
    });
    app.on('window-all-closed', () => {
        unregisterLocalShortcut();
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

    //mainWindow.webContents.openDevTools()

    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });

    // CSS の指定が効かない場合があることのワークアラウンド
    // https://github.com/electron/electron/issues/3534
    const contents = mainWindow.webContents;
    contents.on('dom-ready', () => {
        contents.insertCSS('html,body{ overflow: hidden !important; }');
    });

    setupDevTools(mainWindow);
}

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

app.whenReady().then(addIpcListener).then(createWindow);
