const { ipcRenderer } = require('electron');
const maxLogCount = 1000;

let commentIndex = 0;

const colorTable = [
    // ---------------------------------------------------------
    // https://color.adobe.com/ja/Mon-th%C3%A8me-Color-color-theme-10974749/
    { "background": '#FFF', "borderLeft": '10px solid #56D881' },
    { "background": '#FFF', "borderLeft": '10px solid #E1D800' },
    { "background": '#FFF', "borderLeft": '10px solid #FF7A00' },
    { "background": '#FFF', "borderLeft": '10px solid #E89BC8' },
    { "background": '#FFF', "borderLeft": '10px solid #B3B2FF' },
    // ---------------------------------------------------------
    // https://www.post-it.com/3M/en_US/post-it/ideas/color/collections/
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Rio-de-Janeiro-Collection/?N=4327+3292135883+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #ff992a' },
    { "background": '#FFF', "borderLeft": '10px solid #ff69ba' },
    { "background": '#FFF', "borderLeft": '10px solid #349aff' },
    { "background": '#FFF', "borderLeft": '10px solid #6edb6d' },
    { "background": '#FFF', "borderLeft": '10px solid #ffd42d' },
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Miami-Collection/?N=4327+3292177735+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #6ed2d0' },
    { "background": '#FFF', "borderLeft": '10px solid #def350' },
    { "background": '#FFF', "borderLeft": '10px solid #ff6b81' },
    { "background": '#FFF', "borderLeft": '10px solid #ff339a' },
    { "background": '#FFF', "borderLeft": '10px solid #ff992a' },
];

function createCommentBoxElement(msg) {
    const commentBox = document.createElement('div');
    commentBox.classList.add('box2');
    const nextColor = colorTable[commentIndex % colorTable.length];
    console.log(`nextColor : ${JSON.stringify(nextColor)}`);
    const { background } = nextColor;
    const { borderLeft } = nextColor;
    console.log(`background : ${background}, borderLeft = ${borderLeft}`);
    commentIndex++;
    commentBox.style.background = background;
    commentBox.style.borderLeft = borderLeft;
    const commentParagraph = document.createElement('p');
    commentParagraph.innerHTML = msg;
    commentBox.appendChild(commentParagraph);
    return commentBox;
}

document.addEventListener('DOMContentLoaded', () => {
    const logElement = document.getElementById('log');
    ipcRenderer.on('slack-message', (event, message) => {
        logElement.appendChild(createCommentBoxElement(message));
        if (logElement.childElementCount >= maxLogCount) {
            logElement.removeChild(logElement.firstElementChild);
        }
    })
});
