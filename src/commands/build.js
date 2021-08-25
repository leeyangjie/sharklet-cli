const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const iconv = require('iconv-lite');
const base64 = require('js-base64').Base64;
const errcode = require('../core/errcode.js');
const {
    getConfigAndClient,
    getStagingOrProductConfig,
    showRules,
    DeleteConfigs,
    GetAsnycResult
} = require('./public');


async function DomainStagingConfig(sharkletjsCode) {
    console.log(chalk.greenBright(`[EN] sharklet.js is configuring in staging environemt....`))
    console.log(chalk.greenBright(`[CN] sharklet.js代码在模拟环境配置中...`))
    let {
        params,
        client,
        requestOption
    } = getConfigAndClient();
  //  DomainConfig = await getStagingOrProductConfig('dev');
    requestOption.method = 'POST';
    params['code'] = base64.encode(sharkletjsCode);
	params['name'] = "sharklet.js";
    // requestOption.data = JSON.stringify(params_result);
    let result = await client.request('SetSharkLetStagingConfig', params, requestOption).catch(e => {
        console.log("SetSharkLetStagingConfig -> e", e)
    })
    if (result && result.Code && result.Code == errcode.continue) {
        GetAsnycResult(result.requestid, 'Staging environment configuration', '模拟环境配置' );
    } else if (result) {
        console.log(chalk.greenBright(`[EN] Configuration succeeded in staging environment.`));
        console.log(chalk.greenBright(`[CN] 模拟环境配置成功。`));
    }
}

// program build   
async function build(program) {
    let {
        config
    } = getConfigAndClient();
    if (program.show == true) {
        AllDomianConfig = await getStagingOrProductConfig('dev');
        showRules(AllDomianConfig, 'dev', true);
    } else if (program.delete == true) {
        DeleteConfigs('dev');
    } else {
        let sharkletjsFile = path.resolve(config.jsConfig.path);
        let fileStr = fs.readFileSync(sharkletjsFile, {
            encoding: 'binary'
        });
        let buf = Buffer.from(fileStr, 'binary');
        let sharkletjsCode = iconv.decode(buf, 'utf8');
        let ossjsCode = undefined;

        DomainStagingConfig(sharkletjsCode, ossjsCode)
    }
}


module.exports = {
    build
}