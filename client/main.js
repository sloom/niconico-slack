const { app, BrowserWindow, screen, ipcMain, globalShortcut, Tray, Menu, shell } = require('electron');
const path = require('path');
const isMac = process.platform === 'darwin';
const devToolHotKey = isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I';
const prompt = require('electron-prompt')
const config = require('./Config');
const slackMessage = require('./SlackMessage');
const logger = require('./Logger');
// getter が無いので true を初期値としてこちらでも管理
let ignoreMouseEvents = true;

let niconicoWindow;

function addIpcListener() {
    ipcMain.on('get-primary-display-size', (event, arg) => {
        event.returnValue = screen.getPrimaryDisplay().size;
    });
}

function openLog() {
    const fileTransports = logger.transports.file;
    shell.openExternal(path.join(fileTransports.dirname, fileTransports.filename));
}

function updateHost() {
    prompt({
        title: 'Hostname',
        useHtmlLabel: true,
        label: '<small>*If the environment variable <b>NICONICO_SLACK_HOSTNAME</b> is set, <br>it will take precedence and this value will not be used.</small>',
        value: config.resolveHost(),
        height: 200,
        width: 500,
        resizable: true,
        alwaysOnTop: true
    })
        .then((r) => {
            if (!r) {
                console.log('user cancelled');
            } else {
                if (config.resolveHost() !== r) {
                    config.set('config.hostname', r);
                    connectWebSocket(config.resolveHost());
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
        { label: 'Open Log', type: 'normal', click: () => { openLog() } },

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
    tray.setToolTip(app.getName());
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
        logger.info(message.trim());
    });
}

function connectWebSocket(host) {
    slackMessage.connect(host);
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
            preload: path.join(app.getAppPath(), 'niconicoRenderer.js')
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

app.whenReady().then(addIpcListener).then(createWindow).then(setupTray).then(subscribeSlackMessage).then(connectWebSocket(config.resolveHost()));
