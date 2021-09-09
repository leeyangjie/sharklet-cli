'use strict';
const assert = require('assert');
const httpx = require('httpx');
var   crypto    = require('crypto');
var   xml2js    = require('xml2js');
const JSON = require('json-bigint');
const os = require('os');
const errcode = require('./errcode.js');
const pkg = require('../../package.json');
const base64 = require('js-base64').Base64;

const DEFAULT_UA = `WangsuCloud (${os.platform()}; ${os.arch()}) ` +
    `Node.js/${process.version} Core/${pkg.version}`;
const DEFAULT_CLIENT = `Node.js(${process.version}), ${pkg.name}: ${pkg.version}`;

function firstLetterUpper(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1);
}

function formatParams(params) {
    var keys = Object.keys(params);
    var newParams = {};
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        newParams[firstLetterUpper(key)] = params[key];
    }
    return newParams;
}


function timestamp() {
    var date = new Date();
    return date.toUTCString();
}

function encode(str) {
    var result = encodeURIComponent(str);

    return result.replace(/!/g, '%21')
        .replace(/'/g, '%27')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29')
        .replace(/\*/g, '%2A');
}

function replaceRepeatList(target, key, repeat) {
    for (var i = 0; i < repeat.length; i++) {
        var item = repeat[i];

        if (item && typeof item === 'object') {
            const keys = Object.keys(item);
            for (var j = 0; j < keys.length; j++) {
                target[`${key}.${i + 1}.${keys[j]}`] = item[keys[j]];
            }
        } else {
            target[`${key}.${i + 1}`] = item;
        }
    }
}

function flatParams(params) {
    var target = {};
    var keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = params[key];
        if (Array.isArray(value)) {
            replaceRepeatList(target, key, value);
        } else {
            target[key] = value;
        }
    }
    return target;
}

function normalize(params) {
    var list = [];
    var flated = flatParams(params);
    var keys = Object.keys(flated).sort();
    for (let i = 0; i < keys.length; i++) {
        var key = keys[i];
        var value = flated[key];
        list.push([encode(key), encode(value)]); //push []
    }
    return list;
}

function canonicalize(normalized) {
    var fields = [];
    for (var i = 0; i < normalized.length; i++) {
        var [key, value] = normalized[i];
        fields.push(key + '=' + value);
    }
    return fields.join('&');
}


function process_result(entry, buffer, need_request_id) {
    var json, err;
    if (entry.response.statusCode != 200) {
        xml2js.parseString(buffer, function (error, result) {
            err = error;
            json = result;
        });
        if (err != null) {
            var err = new Error(`Response status code: ${entry.response.statusCode} error, Parse buffer error, URL: ${entry.url}`);
            err.name = 'HTTP Response Status Error';
            err.data = buffer;
            err.code = errcode.http_status_error;
            err.url = entry.url;
            err.entry = entry;
            return Promise.reject(err);
        }
        var err = new Error(`Response status code: ${entry.response.statusCode} ${json.response.code} error, Message: ${json.response.message}, URL: ${entry.url}`);
        err.name = 'HTTP Response Status Error';
        err.data = buffer;
        err.code = errcode.http_status_error;
        err.url = entry.url;
        err.entry = entry;
        return Promise.reject(err);
    }
    try {
        json = JSON.parse(buffer);
     } catch(e) {
        var err = new Error(`Response body JSON parse error, URL: ${entry.url}`);
        err.name = 'Response body JSON parse error';
        err.data = buffer;
        err.code = errcode.json_parse_error;
        err.url = entry.url;
        err.entry = entry;
        return Promise.reject(err);
     }
    if (!json.Code) {
        var err = new Error(`Response Code missing error, URL: ${entry.url}`);
        err.name = 'Response Code missing error';
        err.data = json;
        err.code = errcode.json_code_missing;
        err.url = entry.url;
        err.entry = entry;
        return Promise.reject(err);
    } 
    if (json.Code && !errcode.NormalCodes.includes(parseInt(json.Code))) {
        var err = new Error(`${json.Message}, URL: ${entry.url}`);
        err.name = `Response Code ${json.Code} error`;
        err.data = json;
        err.code = json.Code;
        err.url = entry.url;
        err.entry = entry;
        return Promise.reject(err);
    }
    if (need_request_id && !entry.response.headers['x-cnc-request-id']) {
        var err = new Error(`Response request id missing error, URL: ${entry.url}`);
        err.name = 'Response request id missing error';
        err.data = json;
        err.code = errcode.requestid_missing;
        err.url = entry.url;
        err.entry = entry;
        return Promise.reject(err);
    } else {
        json['requestid'] = entry.response.headers['x-cnc-request-id'];
    }

    return json;
}

class RPCClient {
    constructor(config, verbose) {
        assert(config, 'must pass "config"');
        assert(config.endpoint, 'must pass "config.endpoint"');
        if (!config.endpoint.startsWith('https://') &&
            !config.endpoint.startsWith('http://')) {
            throw new Error(`"config.endpoint" must starts with 'https://' or 'http://'.`);
        }
        assert(config.apiVersion, 'must pass "config.apiVersion"');
        assert(config.accessKeyId, 'must pass "config.accessKeyId"');
        var accessKeySecret = config.secretAccessKey || config.accessKeySecret;
        assert(accessKeySecret, 'must pass "config.accessKeySecret"');

        if (config.endpoint.endsWith('/')) {
            config.endpoint = config.endpoint.slice(0, -1);
        }

        this.endpoint = config.endpoint;
        this.apiVersion = config.apiVersion;
        this.accessKeyId = config.accessKeyId;
        this.accessKeySecret = accessKeySecret;
        this.securityToken = config.securityToken;
        this.readTimeout = config.readTimeout;
        this.verbose = verbose === true;
        // 非 codes 里的值，将抛出异常
        this.codes = new Set([200, '200', 'OK', 'Success']);
        if (config.codes) {
            // 合并 codes
            for (var elem of config.codes) {
                this.codes.add(elem);
            }
        }

        this.opts = config.opts || {};

        var httpModule = this.endpoint.startsWith('https://') ?
            require('https') : require('http');
        this.keepAliveAgent = new httpModule.Agent();
    }

    async request(action, params = {}, opts = {}) {
        var time_str = timestamp();
        var user = this.accessKeyId.toString('utf8');
        var password = this.accessKeySecret.toString('utf8');
        var signature = crypto.createHmac('sha1', password).update(time_str).digest('base64');
        var user_pass = base64.encode(`${user}:${signature}`);
        // 1. compose params and opts
        opts = Object.assign({
            headers: {
                'x-sharklet-cli-client': DEFAULT_CLIENT,
                'user-agent': DEFAULT_UA,
                'Date': time_str,
                'Authorization': `Basic ${user_pass}`
            }
        }, this.opts, opts);

        // format action until formatAction is false
        if (opts.formatAction !== false) {
            action = firstLetterUpper(action);
        }

        // format params until formatParams is false
        if (opts.formatParams !== false) {
            params = formatParams(params);
        }
        var defaults = this._buildParams();
        params = Object.assign({
            Action: action
        }, defaults, params);

        // 2. caculate signature
        var method = (opts.method || 'GET').toUpperCase();
        var normalized = normalize(params);
        var canonicalized = canonicalize(normalized);
        // 2.1 get string to sign
        // 2.2 get signature
        const key = this.accessKeySecret;

        var jsonbody;
        var url=`${this.endpoint}/${this.apiVersion}`;
        var need_request_id = true;
        if (opts.method != 'POST') {
            url = `${this.endpoint}/${this.apiVersion}/?${canonicalize(normalized)}`;
            need_request_id = false;
        }  else {
            jsonbody = JSON.stringify(params);
        }
        // 4. send request
        var entry = {
            url: url,
            request: null,
            response: null
        };

        if (opts && !opts.agent) {
            opts.agent = this.keepAliveAgent;
            opts.readTimeout = 30000;
        }

        if (opts.method === 'POST') {
            opts.headers = opts.headers || {};
            opts.headers['content-type'] = 'application/json';
            opts.data = jsonbody;
        }

        const response = await httpx.request(url, opts);
        entry.request = {
            headers: response.req.getHeaders ? response.req.getHeaders() : response.req._headers
        };
        entry.response = {
            statusCode: response.statusCode,
            headers: response.headers
        };
        const buffer = await httpx.read(response);
        return process_result(entry, buffer, need_request_id);
    }


    async request_result(requestid) {

        var time_str = timestamp();
        var user = this.accessKeyId.toString('utf8');
        var password = this.accessKeySecret.toString('utf8');
        var signature = crypto.createHmac('sha1', password).update(time_str).digest('base64');
        var user_pass = base64.encode(`${user}:${signature}`);
        // 1. compose params and opts
       var opts = Object.assign({
            headers: {
                'x-sharklet-cli-client': DEFAULT_CLIENT,
                'user-agent': DEFAULT_UA,
                'Date': time_str,
                'Authorization': `Basic ${user_pass}`
            }
        });

        var url = `${this.endpoint}/${this.apiVersion}?x-cnc-request-id=${requestid}`;

        var entry = {
            url: url,
            request: null,
            response: null
        };

        opts.agent = this.keepAliveAgent;

        return httpx.request(url, opts).then((response) => {
            entry.request = {
                headers: response.req.getHeaders ? response.req.getHeaders() : response.req._headers
            };
            entry.response = {
                statusCode: response.statusCode,
                headers: response.headers
            };

            return httpx.read(response);
        }).then((buffer) => {
            return process_result(entry, buffer);
        });
    }

    _buildParams() {
        var defaultParams = {
            //           Format: 'JSON',
            //           SignatureMethod: 'HMAC-SHA1',
            //           SignatureNonce: kitx.makeNonce(),
            //            SignatureVersion: '1.0',
            AccessKeyId: this.accessKeyId,
            Version: this.apiVersion,
        };
        if (this.securityToken) {
            defaultParams.SecurityToken = this.securityToken;
        }
        return defaultParams;
    }
}

module.exports = RPCClient;