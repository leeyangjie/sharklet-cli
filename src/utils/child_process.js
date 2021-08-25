let chalk = require('chalk');
let slog = require('single-line-log').stdout;
const TerminalProgress = require('./TerminalProgress');
const terminalProgress = new TerminalProgress('On Processing');
var Timer = null;

process.on('message', (value) => {
    render(value)
})

function render(value) {
    let num = value.num;
    let total = value.total;
    let status = value.status
    let time = value.time
    if (Timer) {
        clearInterval(Timer)
    }
    Timer = setInterval(() => {
        if (num <= total) {
            let { description, complete, uncomplete, progressNum } = terminalProgress.renderOption({ completed: num, total: total });
            if (status >= 0) {
                let renderString = `${description}: ${chalk.green(complete)}${uncomplete}  ${progressNum} \n\n`;
                slog(renderString);
            } else {
                let renderString = `${description}: ${complete}${uncomplete}  ${progressNum} \n\n`;
                slog(chalk.red(renderString));
            }
            num++
        } else {
            clearInterval(Timer);
            if (status > 0)
               process.exit(1);
            else 
            process.exit(0);
        }
    }, time);
}

