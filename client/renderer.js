
const { ipcRenderer } = require('electron');
const NicommentJS = require('./lib/nicommentJS.js');
const io = require('./lib/socket.io-2.1.1.min.js');
const emoji = require('./resource/slack_emoji.json');
 

document.addEventListener('DOMContentLoaded', () => {
    // 絵文字検出用RegExpオブジェクトの作成
    const emoji = require('./resource/slack_emoji.json');
    const emojiRegExps = {};
    for (var key in emoji) {
        const newRegExp = new RegExp(String.raw`:${key}:`, 'g');
        emojiRegExps[key] = newRegExp;
    }
    const emojiColumn = /:/g

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
        const columnCount = (msg.match(emojiColumn) || []).length;
        if (columnCount >= 2) { // コロン2つが含まれた場合、絵文字を検索
            for (emojiRegExpKey in emojiRegExps) {
                const emojiRegExp = emojiRegExps[emojiRegExpKey];
                if (msg.match(emojiRegExp)) {
                    const entity = emoji[emojiRegExpKey];
                    msg = msg.replace(emojiRegExp, entity);
                    // break すると複数の絵文字に変換できないのでしない
                }
            }
        }

        nico.send(msg);
    });
});
