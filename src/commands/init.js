const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const figlet = require('figlet');
const inquirer = require('inquirer');

// NOTES(dpeng): I add this for highlighting JavaScript syntax inside of terminal
const hi = require("../core/highlight.js")

function initSharkletJS() {
    figlet('sharklet-cli', async function(err, data) {
        if (err) {
            console.log(chalk.red('Some thing about figlet is wrong!'));
        }
        console.log(chalk.yellow(data));
        let templatePath = path.join(__dirname, '../templates/js/sharklet.js');
        let templateStr = fs.readFileSync(templatePath, 'utf8');
        let targetFilePath = path.resolve('sharklet.js');
        fs.writeFileSync(targetFilePath, templateStr, 'utf8');
        console.log(chalk.greenBright("[EN] sharklet.js Initializing..."));
        console.log(chalk.greenBright("[CN] 代码文件sharklet.js初始中...\n"));
        console.log(chalk.red('------------------------------\n'));
        console.log(hi(templateStr));
        console.log(chalk.red('------------------------------\n'));
        console.log(chalk.greenBright("[EN] sharklet.js have initialization success, you can write code in sharklet.js now."))
        console.log(chalk.greenBright("[CN] 代码文件sharklet.js已经初始化完毕，您可以在sharklet.js文件中中编写SharkLet代码了。"))
        process.exit(0);
    });
}

function init() {
    // 代码文件如果存在则提示是否覆盖
    if (fs.existsSync(path.resolve('sharklet.js'))) {
        // 连续提问
        inquirer.prompt([{
                name: 'init-confirm',
                type: 'confirm',
                message: chalk.greenBright('[EN] sharklet.js is already existed, are you sure to overwrite it? \n  [CN] sharklet.js 文件已经存在,您确定要覆盖它吗？'),
                validate: function(input) {
                    if (input.lowerCase !== 'y' && input.lowerCase !== 'n') {
                        return 'Please input y/n !'
                    } else {
                        return true;
                    }
                }
            }]).then(answers => {
                // y -> 覆盖, n -> 退出
                if (answers['init-confirm']) {
                    initSharkletJS();
                } else {
                    process.exit(0);
                }
            })
            .catch(err => {
                console.log(chalk.red(err));
            })
    } else {
        initSharkletJS();
    }
};

module.exports = init;