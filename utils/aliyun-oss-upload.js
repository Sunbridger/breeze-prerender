const path = require('path');
const axios = require('./api');
const doShell = require('./doShell');
const Base64 = require('./base64');
const Crypto = require('./crypto');

async function uploadOss(name, filePath) {
    let res = await axios.get('https://himekaidou-lite.souche.com/aliyun_oss/souche/web_sts_token');

    let { AccessKeyId, AccessKeySecret, Expiration, uploadHost, SecurityToken } = res.data || {};
    console.log(res.data);
    let accessid = AccessKeyId;
    let accesskey = AccessKeySecret;
    let host = uploadHost;

    let policyText = {
        "expiration": Expiration, //设置该Policy的失效时间，超过这个失效时间之后，就没有办法通过这个policy上传文件了
        "conditions": [
            ["content-length-range", 0, 1048576000] // 设置上传文件的大小限制
        ]
    };

    let message = Base64.encode(JSON.stringify(policyText));
    let bytes = Crypto.HMAC(Crypto.SHA1, message, accesskey, { asBytes: true });
    let signature = Crypto.util.bytesToBase64(bytes);

    let params = {
        'key': `breeze/screenshot/${name}`,
        'policy': message,
        'OSSAccessKeyId': accessid,
        'success_action_status': '200', //让服务端返回200,不然，默认会返回204
        'signature': signature,
        'x-oss-security-token': SecurityToken
    };
    console.log('start upload screen img');
    filePath = path.resolve(filePath, name);
    await doShell(`pwd`);
    // 上传文件到Maven
    try {
        await doShell(`curl -F 'key=${params.key}' -F 'policy=${params.policy}' -F 'OSSAccessKeyId=${params.OSSAccessKeyId}' -F 'success_action_status=${params.success_action_status}' -F 'signature=${signature}' -F 'x-oss-security-token=${params['x-oss-security-token']}' -F 'file=@${name};type=image/jpeg' ${host}`);
        // await doShell(`curl -I -o /dev/null -s -w '%{http_code}'  --max-time 10 --user sdev:7J48qUFA6m2E8uJx  --upload-file ${name} ${packMavenUrl}`);
    } catch (e) {
        console.log(`upload error: ${e}`)
    }
    // 删除zip包
    await doShell(`rm ${name}`);
    console.log(`${host}/breeze/screenshot/${name}`);
    return `${host}/breeze/screenshot/${name}`;
};

module.exports = {
    uploadOss
};