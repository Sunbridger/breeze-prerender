const PrerenderTask = require('./prerender');
const GetInfoSeo = require('./getinfoseo');
const ScreenShot = require('./screenshot');
const Helper = require('./utils/index');
let argv = require('yargs').argv;
// todo: mock
// argv = require('./data.json');

// 接受表单数据
let params = {};
try {
    params = Helper.validParams(argv);
} catch (e) {
    console.log(`参数检验错误${e}`);
    return;
}
console.log(JSON.stringify(params), 'params参数');

switch (params.TYPE) {
    case 'SCREENSHOT':
        ScreenShot.entry(params);
        break;
    case 'SEOINFO':
        // const getseoPrender = new GetInfoSeo();
        // getseoPrender.index(params);
        break;
    default:
        if (params.ALLPROJECTINFO.length) {
            return
        }
        const prerender = new PrerenderTask();
        prerender.index(params);

}
