const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, dialog } = require('electron');
const path = require('path');
const yaml = require('js-yaml');
const isMac = process.platform === 'darwin';
const devToolHotKey = isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I';
const prompt = require('electron-prompt')
const Store = require('electron-store');
const store = new Store({
    fileExtension: 'yaml',
    serialize: yaml.dump,
    deserialize: yaml.load,
    cwd: path.join(app.getPath('appData'), app.getName()),
    name: 'default'
});
// ランタイムで環境変数変えられると表示に齟齬が生じるので起動時に解決
const targetHost = resolveHost();
// getter が無いので true を初期値としてこちらでも管理
let ignoreMouseEvents = true;

let mainWindow;

function resolveHost() {
    // ランタイムの環境変数 > 設定ファイル(default.yaml) > package.json 埋め込み値
    const runtimeValue = process.env.NICONICO_SLACK_HOSTNAME;
    const configValue = store.get('config.hostname');
    const embeddedValue = require('./package.json').config.niconico_slack_hostname;
    console.log(`runtime : ${runtimeValue}, config: ${configValue}, embedded: ${embeddedValue}`);
    const targetHost = runtimeValue || configValue || embeddedValue;
    console.log(`Hostname : ${targetHost}`);
    return targetHost;
}

function addIpcListener() {
    ipcMain.on('get-host-config', (event, arg) => {
        event.returnValue = targetHost;
    });
    ipcMain.on('get-primary-display-size', (event, arg) => {
        event.returnValue = screen.getPrimaryDisplay().size;
    });
}

function updateHost() {
    const currentHost = targetHost;
    prompt({
        title: 'Change Host',
        label: 'Hostname:',
        value: targetHost,
        resizable: true,
        alwaysOnTop: true
    })
        .then((r) => {
            if (!r) {
                console.log('user cancelled');
            } else {
                if (targetHost !== r) {
                    store.set('config.hostname', r);
                    dialog.showMessageBoxSync(mainWindow, {
                        title: app.getName(),
                        message: 'Reboot is required. Press OK to restart. \nIf you are currently running this program unpackaged, you will need to restart it.',
                        buttons: ['OK']
                    });
                    app.relaunch();
                    app.quit();
                }
            }
        })
        .catch(console.error);
}

function setupTray() {
    const tray = new Tray(isMac ? 'resources/icon.icns' : 'resources/icon.ico');
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Change Host', type: 'normal', click: () => { updateHost() } },
        { type: 'separator' },
        {
            label: 'alwaysOnTop', type: 'checkbox', checked: mainWindow.isAlwaysOnTop(), click: () => {
                mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop())
            }
        },
        { label: 'openDevTools', type: 'normal', click: () => { mainWindow.openDevTools(); } },
        { type: 'separator' },
        { label: 'Exit', type: 'normal', click: () => { app.quit() } },
    ]);
    tray.setToolTip(app.getName() + "\nHost: " + targetHost);
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
        tray.popUpContextMenu();
    })
    tray.on('right-click', () => {
        tray.popUpContextMenu();
    })
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
    } catch (e) {
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
    mainWindow.setIgnoreMouseEvents(ignoreMouseEvents);
    mainWindow.maximize();
    mainWindow.loadURL('file://' + __dirname + '/index.html');
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
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

app.whenReady().then(addIpcListener).then(createWindow).then(setupTray);
