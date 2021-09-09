'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const rpc = require('../core/rpc.js');
const errcode = require('../core/errcode.js');
const child_process = require('child_process');
const base64 = require('js-base64').Base64;
const inquirer = require('inquirer');
var AsyncError = null;

function getConfigAndClient() {
    let config = {};
    if (fs.existsSync(path.resolve('config.js'))) {
        config = require(path.resolve('config.js'));
    } else {
        console.log(chalk.red('[EN] Build without config.js, please run `sharklet-cli config` first to set config...'));
        console.log(chalk.red('[CN] 构建缺失 config.js, 请先执行如下命令： `sharklet-cli config` 创建配置文件...'));
        process.exit(1);
    }
    const client = new rpc({
        accessKeyId: config.accessKeyID,
        accessKeySecret: config.accessKeySecret,
        endpoint: config.endpoint,
        apiVersion: config.apiVersion,
    });
    let params = {
        'DomainName': config.domain,
    };
    const requestOption = {
        method: 'GET'
    };
    return {
        config,
        client,
        params,
        requestOption
    };
}

function showRules(DomianConfig, env, isShow) {
    if (typeof(DomianConfig) == "string") {
        DomianConfig = JSON.parse(DomianConfig)
    }
    // AllDomianConfig
    if (isShow) {
        console.log(chalk.yellow(`[EN] configurations in  ${env == 'dev' ? 'staging' : 'production'} environment:`));
        console.log(chalk.yellow(`[CN] ${env == 'dev' ? '模拟环境' : '生产环境'}共有如下脚本配置:`));
    }
    if (DomianConfig) {
		for(var i=0;i<DomianConfig.length;i++){
            console.log(" ")
			console.log(chalk.green(`Type: ${DomianConfig[i].grammar == "js" ? "SharkLet-Script" : "Sharkscript"}`));
			console.log(chalk.green(`Name: ${DomianConfig[i].name}`));
			console.log(chalk.green(`ConfigId: ${DomianConfig[i].ConfigId}`));
			console.log(chalk.green(`code:`));
			DomianConfig[i].grammar == 'js' ? console.log(chalk.blue(base64.decode(DomianConfig[i]['code']))) : console.log(chalk.blue(DomianConfig[i]['code']));
			if (DomianConfig[i].DeployIPS) {
				console.log(chalk.green(`PreDepolyServers: ${DomianConfig[i].DeployIPS}`));
			}
			console.log(" ")
        }
    }
    console.log(' ')
}

// client request 
async function getStagingOrProductConfig(env) {
    let {
        client,
        params,
        requestOption
    } = getConfigAndClient();

    //let environment = env == 'dev' ? "DescribeCdnDomainStagingConfig" : 'DescribeCdnDomainConfigs';
    requestOption.method = 'POST';
    let result = await client.request("GetSharkLetConfig", params, requestOption).catch(e => {
        console.log(e);
    })
    if (result) {
		let config = {}
		if (result.data) {
			config = env == 'dev' ? result.data.DomainStagingConfig : result.data.DomainConfig;
		}
        return config
    }
}

function DeleteConfigs(env) {
    let environment = env == 'dev' ? 'DelSharkLetStagingConfig' : 'DelSharkLetConfig';
    let CN = env == 'dev' ? '模拟环境' : '生产环境'
    let EN = env == 'dev' ? 'staging' : 'production'
    inquirer.prompt([{
        type: 'confirm',
        name: 'delete',
        message: chalk.greenBright(`[EN] Delete Sharklet config in ${EN} environment? \n  [CN] 确认删除${CN}中的 Sharklet 配置？`),
    }]).then(async (answer) => {
        if (answer['delete']) {
            let config = await getStagingOrProductConfig(env);
            if (config == null) {
                console.log(' ')
                console.log(chalk.greenBright(`[EN] No configs in ${EN} environment`));
                console.log(chalk.greenBright(`[CN] ${CN} Sharklet 规则为空`));
                return
            };
            let {
                client,
                params,
                requestOption
            } = getConfigAndClient();
            requestOption.method = 'POST';
            params['name'] = "sharklet.js";
            let result = await client.request(environment, params, requestOption).catch(e => {
                if (e.code == 'ConfigurationConflicts') {
                    console.log(' ');
                    console.log(chalk.redBright(`[EN] You can not modify the configurations of production environment when the staging environment is not empty. Please rollback staging environment first.`));
                    console.log(chalk.redBright(`[CN] 当模拟环境有配置时不能直接修改生产环境的配置，您需要先回滚模拟环境。`));
                } else {
                    console.log(e.message);
                }
            });
            if (result && result.Code && result.Code == errcode.continue) {
                GetAsnycResult(result.requestid, 'Deleted', '删除');
            } else if (result) {
                console.log(' ')
                console.log(chalk.greenBright(`[EN] Deleted success.`));
                console.log(chalk.greenBright(`[CN] 删除成功`));
            }
        } else {
            console.log(' ')
            console.log(chalk.greenBright(`[EN] undelete`));
            console.log(chalk.greenBright(`[CN] 取消删除`));
        }
    })
}

var PreDeployIPS = null;

// 
function GetAsnycResult(requestid, EN, CN) {
    let {
        config
    } = getConfigAndClient();

    if (!CN) {
        CN = '配置';
    }
    if (!EN) {
        EN = 'Configuration'
    }

    /**
     *   Create a child process to load the task
     */
    let pathString = path.resolve(__dirname, '../utils/child_process.js');
    const subprocess = child_process.fork(pathString);
    subprocess.send({
        num: 0,
        total: config.check_count * config.check_interval,
        status: 0,
        time: 1000
    });
    subprocess.on('close', async (value) => {
        if (value > 0) {
            if (PreDeployIPS != null) {
                console.log(chalk.greenBright(`[EN] ${EN} successed. Staging server ip address:${PreDeployIPS}.`));
                console.log(chalk.greenBright(`[CN] ${CN}成功. 预部署服务器IP地址：${PreDeployIPS}.`));
            } else {
                console.log(chalk.greenBright(`[EN] ${EN} successed.`));
                console.log(chalk.greenBright(`[CN] ${CN}成功.`));
            }

        } else {
            console.log(chalk.greenBright(`[EN] ${EN} failed, ${AsyncError.code}: ${AsyncError.name} ${AsyncError.message}`));
            console.log(chalk.greenBright(`[CN] ${CN}失败, ${AsyncError.code}:  ${AsyncError.name} ${AsyncError.message}.`));
        }
        process.exit(0);
    });

    /**
     * Timing acquisition status
     */
    let setFunction = async (count, requestid) => {
        let {
            config
        } = getConfigAndClient();
        let result = await GetResultFlag(requestid);
        if (result != 0) {
            subprocess.send({
                num: config.check_count * config.check_interval,
                total: config.check_count  * config.check_interval,
                status: result,
                time: 1000
            })
        } else if (result == 0) {
            if (count > config.check_count) {
                subprocess.send({
                    num: config.check_count * config.check_interval,
                    total: config.check_count  * config.check_interval,
                    status: result,
                    time: 1000
                })
            } else {
                setTimeout(setFunction, config.check_interval * 1000, count + 1, requestid)
            }
        }
    }
    setTimeout(setFunction, config.check_interval * 1000, 0, requestid);
}


/**
 * Gets the status of the commit
 *  -1 : error
 *  0  : success
 *  1  : continue
 */
async function GetResultFlag(requestid) {
    let flag = -1;
    let {
        client
    } = getConfigAndClient();
    let result = await client.request_result(requestid).catch((ex) => {
        flag = -1;
        AsyncError = ex;
    });
    if (result != undefined) {
        result = JSON.parse(JSON.stringify(result))
    }
    if (result instanceof Object) {
        if (Reflect.has(result, "Code")) {
            if (parseInt(result.Code) == errcode.success) {
                flag = 1;
                if (result.data && result.data.PreDeployIPS) {
                    PreDeployIPS = result.data.PreDeployIPS;
                }
            } else if (parseInt(result.Code) == errcode.continue) {
                flag = 0;
            } else {
                flag = -1;
                AsyncError = result;
            }
        } else {
            flag = -1;
            AsyncError = {};
            AsyncError.Code = errcode.json_parse_error;
            AsyncError.message = "json parse error";
        }
    }
    return flag;
}


module.exports = {
    getStagingOrProductConfig,
    getConfigAndClient,
    showRules,
    DeleteConfigs,
    GetAsnycResult
}

