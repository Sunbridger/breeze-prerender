const chalk = require('chalk');
const log = console.log;

function success(msg, tag = 'Success') {
    log(`${chalk.bgGreen.black(tag)} ${chalk.green.bold(msg)}`);
}

function warn(msg, tag = 'Warn') {
    log(`${chalk.bgYellow.black(tag)} ${chalk.yellow.bold(msg)}`);
}

function error(msg, tag = 'Error') {
    log(`${chalk.bgRed.black(tag)} ${chalk.red.bold(msg)}`);
}

module.exports = {
    success,
    warn,
    error
};
