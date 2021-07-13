
const { ipcRenderer } = require('electron');
const NicommentJS = require('./lib/nicommentJS.js');

document.addEventListener('DOMContentLoaded', () => {
    const size = ipcRenderer.sendSync('get-primary-display-size');
    var nico = new NicommentJS({
        app: document.getElementById('app'),
        width: size.width,
        height: size.height,
        fontSize: 60,
    });
    // コメント待機
    nico.listen();
    ipcRenderer.on('slack-message', (event, message) => {
        nico.send(message);
    })
});
