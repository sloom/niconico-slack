const { ipcRenderer } = require('electron');
const maxLogCount = 1000;

function createCommentElement(msg) {
    const comment = document.createElement('div');
    comment.innerHTML = msg;
    return comment;
}

document.addEventListener('DOMContentLoaded', () => {
    const logElement = document.getElementById('log');
    ipcRenderer.on('slack-message', (event, message) => {
        logElement.appendChild(createCommentElement(message));
        if (logElement.childElementCount >= maxLogCount) {
            logElement.removeChild(logElement.firstElementChild);
        }
    })
});
