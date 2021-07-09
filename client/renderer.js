
const { ipcRenderer } = require('electron');
const NicommentJS = require('./lib/nicommentJS.js');
const io = require('./lib/socket.io-2.1.1.min.js');

document.addEventListener('DOMContentLoaded', () => {
    const hosts = ipcRenderer.sendSync('get-host-config');
    const size = ipcRenderer.sendSync('get-primary-display-size');
    var nico = new NicommentJS({
        app: document.getElementById('app'),
        width: size.width,
        height: size.height,
        fontSize: 60,
    });
    // コメント待機
    nico.listen();
    const socketio = io('https://' + hosts);
    socketio.on('message', function (msg) {
        console.log('message receive: ' + msg);
        if (!msg) { return; } // msgがnullの時があるので
        msg = msg.replace(/<@.*>/, '');
        nico.send(msg);
    });
});
