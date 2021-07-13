const { app } = require('electron');
const winston = require('winston');
const path = require('path');
const tzoffset = (new Date()).getTimezoneOffset() * (60000);
const logFilePrefix = "niconico-slack";

class Logger extends winston.Logger {
    constructor() {
        const logDir = path.join(app.getPath('appData'), app.getName());
        const logFileName = logFilePrefix + ".log";
        const exceptionLogFileName = logFilePrefix + '_e.log';
        const formatter = (options) => {
            return options.timestamp() + ' ' + (undefined !== options.message ? options.message : '') +
                (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
        };
        const timestamp = () => {
            return (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        };
        const isDebug = process.env.NODE_ENV === "debug";
        const logLevelForConsole = isDebug ? 'silly' : 'info';
        const logLevelFile = isDebug ? 'debug' : 'info';
        // ログファイルは、3MB で 10 ファイル. 
        const defaultSettings = {
            transports: [
                new winston.transports.Console(
                    {
                        timestamp: timestamp,
                        colorize: true,
                        level: logLevelForConsole,
                        formatter: formatter,
                        stderrLevels: ['error']
                    }),
                new winston.transports.File(
                    {
                        timestamp: timestamp,
                        filename: logFileName,
                        dirname: logDir,
                        maxsize: 1000 * 1000 * 3,
                        maxFiles: 10,
                        tailable: true,
                        json: false,
                        level: logLevelFile,
                        formatter: formatter,
                        options: {
                            mode: 0o600,
                            flags: 'a'
                        }
                    })
            ],
            exceptionHandlers: [
                new winston.transports.Console(
                    {
                        timestamp: timestamp,
                        colorize: true,
                        level: logLevelForConsole,
                        handleExceptions: true,
                        humanReadableUnhandledException: true,
                        formatter: formatter,
                        stderrLevels: ['error']
                    }),
                new winston.transports.File(
                    {
                        timestamp: timestamp,
                        filename: exceptionLogFileName,
                        dirname: logDir, maxsize: 1000 * 1000 * 3,
                        maxFiles: 10,
                        tailable: true,
                        json: false,
                        level: logLevelFile,
                        handleExceptions: true,
                        humanReadableUnhandledException: true,
                        formatter: formatter,
                        options: {
                            mode: 0o600,
                            flags: 'a'
                        }
                    })
            ],
            exitOnError: false
        };
        super(defaultSettings);
    }

}

module.exports = new Logger();