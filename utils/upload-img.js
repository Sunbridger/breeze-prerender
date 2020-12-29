const path = require('path');
const doShell = require('./doShell');

const mavenServerUrl = 'https://repo.souche-inc.com/repository/raw-packages/f2e/breeze/';

async function uploadImg(name, filePath) {
    console.log('start upload screen img');
    filePath = path.resolve(filePath, name);
    await doShell(`pwd`);
    // 上传文件到Maven
    let packMavenUrl = `${mavenServerUrl}${name}`;
    try {
        await doShell(`curl -I -o /dev/null -s -w '%{http_code}'  --max-time 10 --user sdev:7J48qUFA6m2E8uJx  --upload-file ${name} ${packMavenUrl}`);
    } catch (e) {
        console.log(`upload error: ${e}`)
    }
    // 删除zip包
    await doShell(`rm ${name}`);
    console.log(packMavenUrl);
    return packMavenUrl;
};

module.exports = {
    uploadImg
};