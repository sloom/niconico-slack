# niconico-slack
Slackに書かれたコメントを、ニコニコ風コメントとして画面上に表示するアプリ

特定のチャンネルにSlack Botを追加して、メンションすることでコメントを送信できます。

## 動作環境
- node.js: v10.15.1
- electron: v13.1.6

## プロジェクト構成

- クライアント側: コメントを表示するためのデスクトップアプリ
- サーバ側: コメントの送受信用のWebSocketサーバ

の二つとSlack Appを使ってニコニコ風コメントを表示しています。

```
niconico-slack
├── LICENSE.txt
├── README.md
├── client/ # ローカルPCで動かすデスクトップアプリ
└── server/ # GAE上で動かすWebSocketサーバ
```

## サーバ
コメント送受信用のWebSocketのサーバです。

GCPのGoogle App Engine(GAE)上で動かします。

公式のチュートリアル
https://cloud.google.com/appengine/docs/standard/nodejs/quickstart?hl=ja
```
# GCPのプロジェクトが作成済み
cd server/
gcloud app deploy --project <project_name>
:
target url:      [https://niconico-slack-xxxxx-xxxxx.appspot.com]
(xxxxx-xxxxxのところはproject_nameによって変わる)

デプロイが成功すればOK
```

## Slack App
1. https://api.slack.com/apps を開く
    - [Create New App] > From scrach を選び、App Name と Workspace を入力してCreate Appする
2. 左メニューの Basic Information ページを開く
    - Display Information で
        - Short description には適当な説明を入力
        - App icon & Preview で任意のアイコンやバックグラウンドカラーを選択
        - Save Changes を押下
3. 右ペイン上部の Add features and functionality 内または左メニューにある Event Subscriptions を選ぶ
    - Enable Events を ON にする
    - Request URL: 「https://niconico-slack-xxxxx-xxxxx.appspot.com/slack」(デプロイしたサービス)を設定
        - 入力後テキストボックスのフォーカスを外すと検証されます。Verified ✔ と出れば OK
        - URL が間違っていたり、うまくデプロイできていないと Your URL didn't respond with the value of the challenge parameter. といったエラーが出ます。
4. Event Subscriptions 内で下にある Subscribe to bot events を選択
    - 展開されたメニューから、Add Bot User Event ボタンを押し、以下を指定して Save Changes を押します
        - app_mention
        - message.im (DMでデバッグする場合の任意)
5. 右ペイン内 Show Tabs から、Always Show My Bot as Online を ON に
6. Message Tab から Allow users to send Slash commands and messages from the messages tab を ON にする
7. 左メニューから Install App を選択
8. Install to Workspace を選択
9. 許可するを選択

## クライアント
1. ホスト名を以下のうちいずれかに設定します。数字の通りの優先順で読み込まれます。※前バージョンまでの config/default.yaml は 2 のテンプレになりました。直接は読み込まれません。
    1. 環境変数 `NICONICO_SLACK_HOSTNAME`
        - 開発中または運用で一時的に値を上書きしたい場合の利用を想定
    2. default.yaml の `hostname`
        - 通常の設定ファイルとしての利用を想定
        - 配置場所は以下の通りです。
            - Windows: `%APPDATA%\niconico-slack-client`
            - macOS: `~/Library/Application Support/niconico-slack-client`
    3. package.json の `config.niconico_slack_name`
        - 配布時点でアプリに値を埋め込んでおきたいケースの利用を想定

2. アプリを起動すると画面の最前面に透明のウィンドウが表示される

3. Slack Botがメンションされると、コメントが流れてくるようになる


```
# ホスト設定
# > hostname を "niconico-slack-xxxxx-xxxxx.appspot.com" に書き換える
# ※UTF-8 エンコーディングで保存してください

## macOS
cd ~/Library/Application Support/niconico-slack-client
vim default.yaml

## Windows
cd %APP_DATA%\niconico-slack-client
notepad default.yaml

# ローカルでの動作確認(透明のウィンドウが立ち上がればOK)
electron .

# アプリにパッケージ(client/niconico-slack-[win32-64|darwin-x64]/に[exe|app]が吐き出される）
## macOS
npm run package:mac
## Windows
npm run package:win
```

## 実際に使う時
1. 作成したスライドをGoogleスライドに変換する
    - Googleスライド: そのままでOK
    - Keynote: Googleスライド形式に変換 or イメージ出力してGoogleスライドにコピペ
2. Googleスライドで再生する
    - [プレゼンテーションを開始 ▽] > [プレゼンター表示]
    - プレゼンテーション再生中に画面の最前面が奪われていないのを確認する
3. あとはGoogleスライドを使ってプレゼンする

## License
MIT