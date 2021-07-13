const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, dialog } = require('electron');
const path = require('path');
const isMac = process.platform === 'darwin';
const devToolHotKey = isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I';
const prompt = require('electron-prompt')
const config = require('./Config');
const slackMessage = require('./SlackMessage');
// getter が無いので true を初期値としてこちらでも管理
let ignoreMouseEvents = true;
// ランタイムで環境変数変えられると表示に齟齬が生じるので起動時に解決
const targetHost = resolveHost();

let niconicoWindow;

function addIpcListener() {
    ipcMain.on('get-host-config', (event, arg) => {
        event.returnValue = targetHost;
    });
    ipcMain.on('get-primary-display-size', (event, arg) => {
        event.returnValue = screen.getPrimaryDisplay().size;
    });
}

function resolveHost() {
    // ランタイムの環境変数 > 設定ファイル(default.yaml) > package.json 埋め込み値
    const runtimeValue = process.env.NICONICO_SLACK_HOSTNAME;
    const configValue = config.get('config.hostname');
    const embeddedValue = require('./package.json').config.niconico_slack_hostname;
    console.log(`runtime : ${runtimeValue}, config: ${configValue}, embedded: ${embeddedValue}`);
    const targetHost = runtimeValue || configValue || embeddedValue;
    console.log(`Hostname : ${targetHost}`);
    return targetHost;
}

function updateHost() {
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
                    config.set('config.hostname', r);
                    dialog.showMessageBoxSync(niconicoWindow, {
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
    const appPath = path.join(process.execPath, '../../..');
    const macIconPath = process.env.NODE_ENV === "debug" ? 'resources/icon_22.png' : path.join(appPath, 'Contents', 'Resources', 'icon_22.png');
    const tray = new Tray(isMac ? macIconPath : 'resources/icon.ico');
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Change Host', type: 'normal', click: () => { updateHost() } },
        { type: 'separator' },
        {
            label: 'alwaysOnTop', type: 'checkbox', checked: niconicoWindow.isAlwaysOnTop(), click: () => {
                niconicoWindow.setAlwaysOnTop(!niconicoWindow.isAlwaysOnTop())
            }
        },
        { label: 'openDevTools', type: 'normal', click: () => { niconicoWindow.openDevTools(); } },
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

function subscribeSlackMessage() {
    slackMessage.on('slack-message', (message) => {
        niconicoWindow.webContents.send('slack-message', message);
    });
    slackMessage.connect(targetHost);
}

function createWindow() {
    const size = screen.getPrimaryDisplay().size;
    niconicoWindow = new BrowserWindow({
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
    niconicoWindow.setIgnoreMouseEvents(ignoreMouseEvents);
    niconicoWindow.maximize();
    niconicoWindow.loadURL('file://' + __dirname + '/index.html');
    niconicoWindow.on('closed', function () {
        niconicoWindow = null;
    });

    niconicoWindow.on('ready-to-show', () => {
        niconicoWindow.show();
    });

    // CSS の指定が効かない場合があることのワークアラウンド
    // https://github.com/electron/electron/issues/3534
    const contents = niconicoWindow.webContents;
    contents.on('dom-ready', () => {
        contents.insertCSS('html,body{ overflow: hidden !important; }');
    });

    setupDevTools(niconicoWindow);
}

app.on('window-all-closed', function () {
    if (!isMac) {
        app.quit();
    }
});

app.on('activate', function () {
    if (niconicoWindow === null) {
        createWindow();
    }
});

app.whenReady().then(addIpcListener).then(createWindow).then(setupTray).then(subscribeSlackMessage);
