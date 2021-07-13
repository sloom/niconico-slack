const { app } = require('electron');
const path = require('path');
const yaml = require('js-yaml');
const Store = require('electron-store');
const packageJson = require('./package.json');
const store = new Store({
    fileExtension: 'yaml',
    serialize: yaml.dump,
    deserialize: yaml.load,
    cwd: path.join(app.getPath('appData'), app.getName()),
    name: 'default'
});

class Config {
    constructor() {
    }

    get(key, defalutValue) {
        return store.get(key, defalutValue);
    }

    set(key, value) {
        return store.set(key, value);
    }

    resolveHost() {
        // 環境変数
        const runtimeValue = process.env.NICONICO_SLACK_HOSTNAME;
        // %APPDATA%(or ~/Library/Application Support)/niconico-slack-client/default.yaml
        const configValue = store.get('config.hostname');
        // package.json の埋め込み値
        const embeddedValue = packageJson.config.niconico_slack_hostname;
        console.log(`runtime : ${runtimeValue}, config: ${configValue}, embedded: ${embeddedValue}`);
        // 優先順位: ランタイムの環境変数 > 設定ファイル > package.json 埋め込み値
        const targetHost = runtimeValue || configValue || embeddedValue;
        console.log(`Hostname : ${targetHost}`);
        return targetHost;
    }

}

module.exports = new Config();