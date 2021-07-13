const io = require('socket.io-client');
const EventEmitter2 = require('eventemitter2');
const emoji = require('./resources/slack_emoji.json');
const reRegExp = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExp = new RegExp(reRegExp.source);

class SlackMessage extends EventEmitter2 {

    constructor() {
        super();
        // 絵文字検出用RegExpオブジェクトの作成
        this.emojiRegExps = {};
        for (var key in emoji) {
            const newRegExp = new RegExp(String.raw`:${this.escapeRegExp(key)}:`, 'g');
            this.emojiRegExps[key] = newRegExp;
        }
        this.emojiColumn = /:/g
    }

    escapeRegExp(string) {
        return (string && reHasRegExp.test(string))
            ? string.replace(reRegExp, '\\$&')
            : string;
    }

    connect(targetHost) {
        const socketio = io('https://' + targetHost);
        socketio.on('connection', () => {
            console.log('connected!');
        });
        socketio.on('connect_error', (err) => {
            console.error(`connect failed. err=${err}`);
        });
        socketio.on('message', (msg) => {
            console.log('message receive: ' + msg);
            if (!msg) { return; } // msgがnullの時があるので
            msg = msg.replace(/<@.*>/, '');
            const columnCount = (msg.match(this.emojiColumn) || []).length;
            if (columnCount >= 2) { // コロン2つが含まれた場合、絵文字を検索
                for (var emojiRegExpKey in this.emojiRegExps) {
                    const emojiRegExp = this.emojiRegExps[emojiRegExpKey];
                    if (msg.match(emojiRegExp)) {
                        const entity = emoji[emojiRegExpKey];
                        msg = msg.replace(emojiRegExp, entity);
                        // break すると複数の絵文字に変換できないのでしない
                    }
                }
            }
            this.emit('slack-message', msg);
        });
    }
}

module.exports = new SlackMessage();
