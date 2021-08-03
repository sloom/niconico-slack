const { app, BrowserWindow, screen, ipcMain, Tray, Menu, Notification, dialog } = require('electron');
const isMac = process.platform === 'darwin';
const logger = require('./Logger');
const path = require('path');
const config = require('./Config');
const slackMessage = require('./SlackMessage');
let pollIntervalId;

let niconicoWindow;
let logWindow;
let appQuiting = false;

function addIpcListener() {
    ipcMain.on('get-primary-display-size', (event, arg) => {
        event.returnValue = screen.getPrimaryDisplay().size;
    });
}

function updateAlwaysOnTop(setAlwaysOnTop) {
    if (niconicoWindow) {
        niconicoWindow.setAlwaysOnTop(setAlwaysOnTop);
        pollSetForground(setAlwaysOnTop);
    }
}

function updateWindowAttributeForDebug() {
    // 設定がそのままだと devtools 起動時画面操作ができないケースがあるため、全て解除。
    if (niconicoWindow) {
        updateAlwaysOnTop(false);
        niconicoWindow.setSize(800, 600);
        niconicoWindow.setClosable(true);
        niconicoWindow.setFullScreenable(true);
        niconicoWindow.setIgnoreMouseEvents(false);
        niconicoWindow.frame = true;
        niconicoWindow.setBackgroundColor('#fff');
        niconicoWindow.setResizable(true);
        niconicoWindow.setFocusable(true);
    }
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

function getDisplays() {
    const displays = screen.getAllDisplays()
    const externalDisplay = displays.find((display) => {
      return display.bounds.x !== 0 || display.bounds.y !== 0
    })
    if (externalDisplay) {

    }
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
    logWindow.loadURL('file://' + __dirname + '/static/log.html');
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

function openDevToolsForLogWindow() {
    logWindow.openDevTools();
}

function debugMessage() {
    const debugMessages = [
        'おめでとう',
        '888888', ':+1::+1::+1:',
        ':tada::tada::tada:',
        'いいね!',
        ':smile::smile::smile::smile:',
        ':clap::clap::clap::clap:'
    ];
    const delayMax = 3000;
    const delayMin = 0;
    for (const index in debugMessages) {
        const delay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin);
        setTimeout(() => {
            niconicoWindow.webContents.send('slack-message', slackMessage.convertEntity(debugMessages[index]));
            logWindow.webContents.send('slack-message', slackMessage.convertEntity(debugMessages[index]));
        }, delay);
    }
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
        { label: 'Open Log', type: 'normal', click: () => { openLog() } },
        { type: 'separator' },
        {
            label: 'Settings',
            submenu: [
                { label: 'Change Host', type: 'normal', click: () => { updateHost() } },
                {
                    label: 'Always on top', type: 'checkbox', checked: niconicoWindow.isAlwaysOnTop(), click: (r) => {
                        updateAlwaysOnTop(r.checked);
                    }
                },
            ]
        },
        { type: 'separator' },
        {
            label: 'Debug',
            submenu: [
                {
                    label: 'DevTools',
                    submenu: [
                        {
                            label: 'Message Window', type: 'normal', click: () => {
                                updateWindowAttributeForDebug();
                                niconicoWindow.openDevTools();
                                const title = app.getName();
                                const message = `Changed window attribute to start Chrome DevTools. Please restart the application after debugging.`;
                                notifyMessage(title, message);
                            }
                        },
                        {
                            label: 'Log Window', type: 'normal', click: () => {
                                openDevToolsForLogWindow();
                            }
                        },

                    ]
                },
                {
                    label: 'Simulate Message',
                    type: 'normal',
                    click: () => {
                        debugMessage();
                    }
                }
            ]
        },
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

function notifyMessage(title, message) {
    if (isMac) {
        new Notification({
            title: title,
            body: message
        }).show();
    } else {
        tray.displayBalloon({
            title: title,
            content: message
        });
    }
}

function subscribeSlackMessage() {
    slackMessage.on('slack-message', (message) => {
        niconicoWindow.webContents.send('slack-message', message);
        logWindow.webContents.send('slack-message', message);
    });
}

function connectWebSocket(host) {
    slackMessage.once('connect_error', (err) => {
        app.whenReady().then(() => {
            dialog.showMessageBox({
                title: app.getName(),
                message: `Connect failed.\n\nHost:\n${host}\n\nError Detail:\n${err}`
            });
        });
    });
    slackMessage.connect(host);
}

function createWindowOnPrimary() {
    const size = screen.getPrimaryDisplay().size;
    createWindow(0, 0, size.width, size.height);
}

function createWindow(x, y, width, height) {
    niconicoWindow = new BrowserWindow({
        left: x,
        top: y,
        width: width,
        height: height,
        frame: process.platform === 'darwin' ? true : false,
        show: false,
        transparent: true,
        resizable: false,
        hasShadow: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(app.getAppPath(), 'niconicoRenderer.js')
        },
        focusable: false    // Windows における前面移動時の flash を避けるため。
        // macOS では app.dock.hide() で Dock も隠せるが、
        // 強制終了手段が塞がれる可能性があることからやらない
    });
    niconicoWindow.setIgnoreMouseEvents(true);
    niconicoWindow.maximize();
    niconicoWindow.loadURL('file://' + __dirname + '/static/index.html');
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
    app.quit();
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
    .then(createWindowOnPrimary)
    .then(createLogWindow)
    .then(setupTray)
    .then(subscribeSlackMessage)
    .then(connectWebSocket(config.resolveHost()))
    .then(pollSetForground(true));
