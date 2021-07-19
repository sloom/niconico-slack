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
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Marrakesh-Collection/?N=4327+3292135882+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #f1515b' },
    { "background": '#FFF', "borderLeft": '10px solid #ffd42d' },
    { "background": '#FFF', "borderLeft": '10px solid #5fc08b' },
    { "background": '#FFF', "borderLeft": '10px solid #3399fe' },
    { "background": '#FFF', "borderLeft": '10px solid #c391c3' },
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Bora-Bora-Collection/?N=4327+3292135880+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #5fc08b' },
    { "background": '#FFF', "borderLeft": '10px solid #6dda6d' },
    { "background": '#FFF', "borderLeft": '10px solid #cee9e0' },
    { "background": '#FFF', "borderLeft": '10px solid #b4c9e6' },
    { "background": '#FFF', "borderLeft": '10px solid #98b0dc' },
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Bali-Collection/?N=4327+3292135881+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #dfcde5' },
    { "background": '#FFF', "borderLeft": '10px solid #ffbca8' },
    { "background": '#FFF', "borderLeft": '10px solid #b6cae7' },
    { "background": '#FFF', "borderLeft": '10px solid #facee1' },
    { "background": '#FFF', "borderLeft": '10px solid #cfeae1' },
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/New-York-Collection/?N=4327+3292135850+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #ffd42d' },
    { "background": '#FFF', "borderLeft": '10px solid #98b1dd' },
    { "background": '#FFF', "borderLeft": '10px solid #b6cae7' },
    { "background": '#FFF', "borderLeft": '10px solid #c9c7c5' },
    { "background": '#FFF', "borderLeft": '10px solid #ffd42d' },
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Jaipur-Collection/?N=4327+3292135876+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #6edb6d' },
    { "background": '#FFF', "borderLeft": '10px solid #ffd42d' },
    { "background": '#FFF', "borderLeft": '10px solid #ff9a28' },
    { "background": '#FFF', "borderLeft": '10px solid #c392c3' },
    { "background": '#FFF', "borderLeft": '10px solid #349aff' },
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Cape-Town-Collection/?N=4327+3292135879+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #ff6b81' },
    { "background": '#FFF', "borderLeft": '10px solid #ff992a' },
    { "background": '#FFF', "borderLeft": '10px solid #6ed2d0' },
    { "background": '#FFF', "borderLeft": '10px solid #ff68b9' },
    { "background": '#FFF', "borderLeft": '10px solid #def350' },
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Marseille-Collection/?N=4327+3292135877+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #cde7de' },
    { "background": '#FFF', "borderLeft": '10px solid #6ed3d1' },
    { "background": '#FFF', "borderLeft": '10px solid #f9f3a8' },
    { "background": '#FFF', "borderLeft": '10px solid #facee1' },
    { "background": '#FFF', "borderLeft": '10px solid #b6cae7' },
    // https://www.post-it.com/3M/en_US/post-it/products/~/Post-it-Products/Helsinki-Collection/?N=4327+3292135878+3294529207+3294857497&rt=r3
    { "background": '#FFF', "borderLeft": '10px solid #facee1' },
    { "background": '#FFF', "borderLeft": '10px solid #f9f3a8' },
    { "background": '#FFF', "borderLeft": '10px solid #cfeae1' },
    { "background": '#FFF', "borderLeft": '10px solid #b6cae7' },
    { "background": '#FFF', "borderLeft": '10px solid #dfcde5' },
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
