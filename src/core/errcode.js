var WSErrCode = {
    success : 0,
    continue : 300,
    json_parse_error : 4,
    http_status_error : 5,
    json_code_missing : 6,
    requestid_missing : 7,
    NormalCodes : [0, 300]
};

module.exports = WSErrCode;
