const chalk = require('chalk');
const inquirer = require('inquirer');
const errcode = require('../core/errcode.js');
const {
    getConfigAndClient,
    getStagingOrProductConfig,
    showRules,
    DeleteConfigs,
    GetAsnycResult
} = require('./public')
var PublishError = null;

/**
 *  The Main Function
 * @param {Object} program 
 */
async function publish(program) {
    if (program.show == true) {
        AllDomianConfig = await getStagingOrProductConfig('prod');
        showRules(AllDomianConfig, 'prod', true);
    } else if (program.delete == true) {
        DeleteConfigs('prod');
    } else {
        // 第一步查询模拟环境的规则
        await getConfirm();
    }
}


async function getConfirm() {
    let {
        config
    } = getConfigAndClient()
    inquirer.prompt([{
        type: 'confirm',
        name: 'test-publish',
        message: chalk.greenBright(`[EN] Please make sure the configs have been tested fully in staging environment?\n  [CN] 您确认在模拟环境充分测试了吗？`),
    }]).then(async (answer) => {
        if (answer['test-publish']) {
            console.log(" ");
            await publishStagingProd();
        } else {
            console.log(' ');
            console.log(chalk.redBright(`[EN] Please test fully in staging environment，for example:`));
            console.log(chalk.redBright(`[CN] 请充分测试, 下面是测试路径示例:`));
            console.log(' ');
            console.log(chalk.yellow(`curl -v 'http://${config.domain}' -x 42.123.119.50:80`));
        }
    })
}

async function publishStagingProd() {
    let {
        params,
        client,
        requestOption
    } = getConfigAndClient();
    
    params['name'] = "sharklet.js";
    requestOption.method = 'POST';
    let result = await client.request('PublishStagingConfigToProduction', params, requestOption).catch((ex) => {
        flag = false
        PublishError = ex;
    });

    if (PublishError != null) {
        console.log(' ')
        console.log(chalk.greenBright(`[EN] Configuration failed in production environment.`));
        console.log(chalk.greenBright(`[CN] 生产环境规则配置失败.`));
        console.log(PublishError)
    } else if (result && result.Code && result.Code == errcode.continue) {
        GetAsnycResult(result.requestid, 'Production environment configuration', '生产环境配置');
    } else if (result) {
        console.log(' ')
        console.log(chalk.greenBright(`[EN] Configuration successed in production environment.`));
        console.log(chalk.greenBright(`[CN] 生产环境规则配置成功.`));
    }
}
    

module.exports = publish