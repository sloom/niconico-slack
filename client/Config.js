const { app } = require('electron');
const path = require('path');
const yaml = require('js-yaml');
const Store = require('electron-store');

class Config {
    constructor() {
        this.store = new Store({
            fileExtension: 'yaml',
            serialize: yaml.dump,
            deserialize: yaml.load,
            cwd: path.join(app.getPath('appData'), app.getName()),
            name: 'default'
        });
    }

    get(key, defalutValue) {
        return this.store.get(key, defalutValue);
    }

    set(key, value) {
        return this.store.set(key, value);
    }

}

module.exports = new Config();