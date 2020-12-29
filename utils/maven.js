const path = require('path');
const doShell = require('./doShell');
// http://breeze-dev.dasouche-inc.net
// 127.0.0.1
//172.16.42.248:7001
const breezeUrl = 'http://47.110.117.218:80/api/uploadZip';
// const breezeUrl = 'http://47.110.117.218:80/api/uploadZip';
const log = console.log;

async function uploadMaven(name, entryUrl, filePath, isComplete) {
    console.log('压缩包开始上传breeze');
    // 压缩文件
    filePath = path.resolve(filePath);
    process.chdir(filePath);
    await doShell(`pwd`);
    await doShell(`zip -r ${name}.zip ${name}`);
    // 上传文件到Breeze
    try {
        // -H "Content-Type: multipart/*"
        // curl -o ./dev/log.html -w '%{http_code}'  --max-time 600 --progress-bar --show-error -H "filename: finance_tangeche_app_ajwc9paipsmsy5c5it0ed5l2" -H "entry: https://www.tangeche.com" -H "Content-Type: multipart/*"  --upload-file finance_tangeche_app_ajwc9paipsmsy5c5it0ed5l2.zip http://127.0.0.1:6001/api/uploadZip
        // curl -o ./dev/log.html -w '%{http_code}'  --max-time 600 --progress-bar --show-error -H "filename: tangeche_toC_pc_ek7hdda0jm1dgv6y7arnl4bk" -H "entry: https://www.souche.com/"  -F "file=@tangeche_toC_pc_ek7hdda0jm1dgv6y7arnl4bk.zip" http://127.0.0.1:6001/api/uploadZip
        await doShell(`curl -o ./dev/log.html -w '%{http_code}'  --max-time 600 --progress-bar --show-error -H "filename: ${name}" -H "entry: ${entryUrl}"  -F "file=@${name}.zip" ${breezeUrl}`);
    } catch (error) {
        log(`上传breeze失败: ${error}`);
         // 删除zip包todo
        await doShell(`rm -rf ${name}.zip`);
        isComplete && await doShell(`rm -rf ${name}`);
        return false
    }
    // 删除zip包todo
    await doShell(`rm -rf ${name}.zip`);
    // 删除爬取文件
    await doShell(`rm -rf ${name}`);
    return true;
};

module.exports = {
    uploadMaven
};