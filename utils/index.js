const maven = require('./maven');
const uploadImg = require('./upload-img');
const uploadOss = require('./aliyun-oss-upload');
const log = require('./log');
const validators = require('./validators.json');

function validParams(params) {
    for (var i in validators) {
        if (params[i] && typeof params[i] !== validators[i]) {
            throw (`参数${i}的类型错误,入参是${params[i]}，期望类型是${validators[i]}`);
        }
    }
    if (params.IGNORE_PATH && typeof params.IGNORE_PATH === 'string') {
        params.IGNORE_PATH = JSON.parse(params.IGNORE_PATH  || '[]') || [];
    }
    if (params.WHITE_PATH && typeof params.WHITE_PATH === 'string') {
        params.WHITE_PATH = JSON.parse(params.WHITE_PATH  || '[]') || [];
    }
    if (params.IGNORE_PARAMS && typeof params.IGNORE_PARAMS === 'string') {
        params.IGNORE_PARAMS = JSON.parse(params.IGNORE_PARAMS  || '[]') || [];
    }
    if (params.NOT_FOUND_PATH && typeof params.NOT_FOUND_PATH === 'string') {
        params.NOT_FOUND_PATH = JSON.parse(params.NOT_FOUND_PATH || '[]') || [];
    }
    if (params.ALLPROJECTINFO && typeof params.ALLPROJECTINFO === 'string') {
        params.ALLPROJECTINFO = JSON.parse(params.ALLPROJECTINFO || '[]') || [];
    }
    return params;
};

module.exports = {
    ...maven,
    ...log,
    ...uploadImg,
    ...uploadOss,
    validParams
};
