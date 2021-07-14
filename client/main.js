const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require('electron');
const logger = require('./Logger');
const path = require('path');
const isMac = process.platform === 'darwin';
const config = require('./Config');
const slackMessage = require('./SlackMessage');
const { clearInterval } = require('timers');
// getter が無いので true を初期値としてこちらでも管理
let ignoreMouseEvents = true;
let pollIntervalId;

let niconicoWindow;
let logWindow;
let appQuiting = false;

function addIpcListener() {
    ipcMain.on('get-primary-display-size', (event, arg) => {
        event.returnValue = screen.getPrimaryDisplay().size;
    });
}

function pollSetForground(setAlwaysOnTop) {
    // alwaysOnTop 指定でもしばしば裏に回ってしまうワークアラウンド
    if (!setAlwaysOnTop) {
        clearInterval(pollIntervalId);
    } else {
        pollIntervalId = setInterval(() => {
            if (niconicoWindow) {
                niconicoWindow.focus();
                niconicoWindow.alwaysOnTop = true;
            }
        }, 1000);
    }
}

function initialize() {
    process.on('uncaughtException', (err) => {
        logger.error("electron:uncaughtException");
        if (err) {
            logger.error(err);
            logger.error(err.stack);
        }
    });
    app.on('before-quit', () => {
        appQuiting = true;
    });
}

function createLogWindow() {
    const size = screen.getPrimaryDisplay().size;
    const width = size.width / 4;
    const height = size.height - 150;
    const offsetx = size.width - width;
    logWindow = new BrowserWindow({
        x: offsetx,
        y: 100,
        width: width,
        height: height,
        show: false,
        webPreferences: {
            preload: path.join(app.getAppPath(), 'logRenderer.js')
        }
    });
    logWindow.setMenu(null);
    logWindow.loadURL('file://' + __dirname + '/log.html');
    logWindow.on('close', (event) => {
        logWindow.hide();
        if (!appQuiting) {
            event.preventDefault();
        }
    });
}

function openLog() {
    logWindow.show();
}

function updateHost() {
    const prompt = require('electron-prompt')
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
                logger.info('user cancelled');
            } else {
                if (config.resolveHost() !== r) {
                    config.set('config.hostname', r);
                    connectWebSocket(config.resolveHost());
                }
            }
        })
        .catch(console.error);
}

function allClose() {
    if (niconicoWindow) {
        try {
            niconicoWindow.close();
            niconicoWindow.destroy();
        } catch (err) {
            niconicoWindow = null;
        }
    }
    if (logWindow) {
        try {
            logWindow.close();
            logWindow.destroy();
        } catch (err) {
            logWindow = null;
        }
    }

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
                niconicoWindow.setAlwaysOnTop(!niconicoWindow.isAlwaysOnTop());
                updatePollSetForground();
            }
        },
        { label: 'openDevTools', type: 'normal', click: () => { niconicoWindow.openDevTools(); } },
        { type: 'separator' },
        {
            label: 'Exit', type: 'normal', click: () => {
                allClose();
                app.quit();
            }
        },
    ]);
    tray.setToolTip(app.getName());
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
        niconicoWindow.focus();
        tray.popUpContextMenu();
    })
    tray.on('right-click', () => {
        niconicoWindow.focus();
        tray.popUpContextMenu();
    })
}

function subscribeSlackMessage() {
    slackMessage.on('slack-message', (message) => {
        niconicoWindow.webContents.send('slack-message', message);
        logWindow.webContents.send('slack-message', message);
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
        },
        focusable: false
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

function logAppInfo() {
    try {
        logger.info('-------------------------------------------------');
        logger.info(`commandLine: ${process.argv.join(' ')}`);
        logger.info(`electron version: ${process.versions['electron']}`);
        logger.info(`chromium version: ${process.versions['chrome']}`);
        logger.info(`app.name: ${app.getName()}`);
        logger.info(`app.getVersion(): ${app.getVersion()}`);
        logger.info(`app.getLocale(): ${app.getLocale()}`);
        logger.info(`app.getPath('exe'): ${app.getPath('exe')}`);
        logger.info(`app.getPath('temp'): ${app.getPath('temp')}`);
        logger.info('-------------------------------------------------');
    } catch (err) {
        logger.warn('Exception occurred while log environment info. Skipping.', err);
    }
}

app.whenReady()
    .then(logAppInfo())
    .then(initialize)
    .then(addIpcListener)
    .then(createWindow)
    .then(createLogWindow)
    .then(setupTray)
    .then(subscribeSlackMessage)
    .then(connectWebSocket(config.resolveHost()))
    .then(pollSetForground(true));
