// 参考にしたライブラリ
// [nicoJS] https://github.com/yui540/nicoJS

'use strict';

class nicommentJS {
    constructor(params) {
        this.timer = null;
        this.comments = [];

        this.app = params.app;
        this.fontSize = params.fontSize || 100;
        this.color = params.color || '#FFF';
        this.width = params.width || 300;
        this.height = params.height || 300;
        this.emojiEntityRegexp = new RegExp(String.raw`^\s*&#x`);

        this._setupApplication();
    }

    /**
     * 必要なCSSを設定する
     */
    _setupApplication() {
        this.app.style.whiteSpace = 'nowrap';
        this.app.style.overflow = 'hidden';
        this.app.style.position = 'relative';
        this.app.style.width = this.width + 'px';
        this.app.style.height = this.height + 'px';
    }

    /**
     * コメントを送信する
     * @param {String} text 
     * @param {String} [color] - 文字色
     * @param {number} [fontSize] - 文字サイズ
     */
    send(text, color = this.color, fontSize = this.fontSize) {
        let x = this.width;
        let y = Math.random() * (this.height - this.fontSize*2);
        let comment = document.createElement('div');
        // Slack のメッセージ送信時点でエスケープされている風ではあるが、念の為XSS対策
        const message = document.createTextNode(comment);
        comment.appendChild(message);
        comment.innerHTML = text;
        comment.x = x;
        comment.y = y;

        comment.style.position = 'absolute';
        comment.style.left = x + 'px';
        comment.style.top = y + 'px';
        comment.style.fontSize = fontSize + 'px';
        comment.style.color = color;
        comment.style.fontWeight = '600';
        if (text.match(this.emojiEntityRegexp)) {
            // no-op (絵文字に好適なスタイルがあったら設定する)
        } else {
            comment.style.textShadow = '0 0 3px #000';
            comment.style.webkitTextStroke = '2px #000';
        }
        comment.style.fontFamily = "'Arial','Hiragino Kaku Gothic ProN','ヒラギノ角ゴ ProN W3','メイリオ', sans-serif";

        this.app.appendChild(comment);
        this.comments.push(comment);
    }

    /**
     * コメントを更新する
     */
    _update() {
        for (let comment of this.comments) {
            let end = comment.getBoundingClientRect().width * -1;
            if (comment.x > end) {
                comment.x -= 1;
                comment.style.left = comment.x + 'px';
            }
        }
    }

    /**
     * コメントを受け付ける
     */
    listen() {
        let that = this;
        stop()

        this.timer = setInterval(function() {
            that._update();
        });
    }

    /**
     * アニメーション停止
     */
    stop() {
        clearInterval(this.timer);
    }
}

module.exports = nicommentJS;