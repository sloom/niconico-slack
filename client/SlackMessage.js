const io = require('socket.io-client');
const EventEmitter2 = require('eventemitter2');
const emoji = require('./resources/slack_emoji.json');
const reRegExp = /[\\^$.*+?()[\]{}|]/g;
const reHasRegExp = new RegExp(reRegExp.source);
const logger = require('./Logger');

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
        this.socketio = null;
    }

    escapeRegExp(string) {
        return (string && reHasRegExp.test(string))
            ? string.replace(reRegExp, '\\$&')
            : string;
    }

    connect(targetHost) {
        if (this.socketio) {
            try {
                this.socketio.disconnect();
            } catch(ignore) {
                console.warn(`Error occurred while disconnecting socket. Ignoring. err=${err}`);
            }
            this.socketio = null;
        }
        this.socketio = io('https://' + targetHost);
        this.socketio.on('connection', () => {
            logger.debug('connected!');
        });
        this.socketio.on('connect_error', (err) => {
            logger.warn(`connect failed. err=${err}`);
        });
        this.socketio.on('message', (msg) => {
            logger.info('message receive: ' + msg);
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
