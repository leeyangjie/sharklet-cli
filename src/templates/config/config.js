var config = {
    // @wangsu api version
    apiVersion: 'v0.1',

    // CDN OpenAPI Endpoint
    endpoint: 'http://open-its.chinanetcenter.com/sharklet/',

    // Your CDN Domain
    domain: "",

    // Edge jsConfig Master Config (Required)
    jsConfig: {
        "path": "sharklet.js", // path: [sharklet.js/path]  sharklet.js will be delivered to all alibaba global edge nodes, you could replace it.
        "pos": "head", // pos: [head/foot] JavaScript code is executed before/after CDN business
        "pri": "0",   // The priority of head execution/tail execution is independent of each other  [0 high - 999 low] (The type must be a String)
        "jsmode": "redirect", // jsmode: [redirect/bypass]  Redirect/bypass requests to JavaScript code execution
        "jsttl": 1800 // jsttl: [>1800] JavaScript code timeout is default 1800 seconds, i.e.after 30 minutes your global variable will be emptied  (recommended for simple cache only)
    },

    check_count: 60,
    check_interval: 5,
    read_timeout: 6000,

    // Alicloud Config
    accessKeyID: "", //Your aliYun account AccesskeyId
    accessKeySecret: "", // Your aliYun account AccessKeySecret
    // The build sucess current timestamp
    buildTime: null,
};

module.exports = config;
