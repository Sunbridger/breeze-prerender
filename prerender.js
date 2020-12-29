const puppeteer = require('puppeteer');
const path = require('path');
const  URL = require('url').URL;
const urlModule = require('url');
const randomstring = require('randomstring');
const doShell = require('./utils/doShell');
const Util = require('./utils/index');
const fs = require('mz/fs');
const axios = require('axios');
// const memwatch = require('memwatch-next');
// const heapdump = require('heapdump');

// 性能监控 如果有内存泄露记录快照
// memwatch.on('leak', function(info) {
//     dump();
//     console.log(info, 'leak');
//  });

// function dump() {
//     const filename = `${__dirname}/heapdump/heapdump-${process.pid}-${Date.now()}.heapsnapshot`;
//     heapdump.writeSnapshot(filename, () => {
//       console.log(`${filename} dump completed.`);
//     });
// }

class Prerender {
    constructor() {
        this.isAllFileHandled = false; //是否所有爬取完成
        this.routeMapArr = []; // 有层级的路由文件名映射关系
        this.mapRouteToFileName = {}; // 路由->文件名 keyvalue
        this.mapFileNameToRoute = {}; // // 文件名->路由 keyvalue
        this.packageName = ''; // 打包名称
        this.entryUrl = ''; // 入口域名
        this.queueTaskArr = []; // 爬取队列
        this.whitePath = []; // 白名单
        this.ignorePath = []; // 忽略路由
        this.ignoreParams = []; // 忽略参数
        this.errorList = []; // 爬取错误url信息
        this.isSubproject = false; // 是否是子项目
        this.notFoundPath = []; // 未找到路由爬取
        this.batchNum = 500; // 批量上传数量
        this.currentBatchTask = 0; // 当前批次
        this.completeTaskNum = 0; // 爬取成功页面数
    }
    /**
     * 生成html文件
     * @param url
     * @param fileName
     * @param timeout
     */
    async getPrerenderHtml (url, fileName) {
        const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        const page = await browser.newPage();
        let isErrorStatus = false;
        process.on('unhandledRejection', (reason, p) => {
            console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
            browser.close();
            isErrorStatus = true;
            this.handleBrowserError(reason, url);
        });
        try {
            await page.goto(url, { waitUntil: 'networkidle2'});
        } catch (error) {
            isErrorStatus = true;
            browser.close();
            this.handleBrowserError(error, url);
        }
        if (isErrorStatus) {
            return ''
        }
        // await page.waitFor(timeout);
        // 获取页面所有a标签href
        let aTagArr = await page.$$eval('a', (e) => e.map((a) => a.href));
        aTagArr = Array.from(new Set(aTagArr));
        // 根据获取的子路由深度爬取
        await this.crawlChildrenPage(aTagArr, fileName, url);
        // 处理返回真实的a链接形式
        await page.evaluate((entryUrl) => {
            [...document.querySelectorAll('a')].forEach(a => {
                if (a.href.includes('?') || a.href.endsWith('/')) {
                    a.href = a.href;
                } else {
                    if (a.href !== 'javascript:;') {
                        a.href = a.href + '/';
                    }
                }
                if (a.href !== 'javascript:;' && !a.href.includes(entryUrl)) {
                    a.setAttribute('rel', 'nofollow');
                }
            });
            let html = document.documentElement || document.querySelector('html');
            html.setAttribute('xmlns', 'http://www.w3c.org/1999/xhtml');
            html.setAttribute('xml:lang', 'zh-CN');
            html.setAttribute('lang', 'zh-CN');
            [...document.querySelectorAll('img')].forEach(img => {
                img.alt = img.alt ? img.alt : '大搜车';
                img.title = img.title ? img.title : '大搜车';
            });
        }, this.entryUrl);
        const content = await page.content();
        await browser.close();
        return content;
    }
    handleBrowserError (error, url) {
        this.errorList.push({
            url,
            error: error.message || error.name
        })
        Util.error(error, url);
    }
    /**
     * 处理忽略参数
     * @param {*} url
     */
    handleIgnoreParam (url) {
        let urlObj = new URL(url);
        let origin = `${urlObj.origin}${urlObj.pathname}?`;
        let query = urlObj.search;
        if (!query) {
            return url;
        }
        let qs = query.slice(1).split('&');
        let queryObj = {};
        qs.forEach(value => {
            const v = value.split('=');
            queryObj[v[0]] = v[1] || ''
        });
        for(let i = 0; i < this.ignoreParams.length; i++) {
            let ignoreParam = this.ignoreParams[i];
            if(typeof queryObj[ignoreParam] !== 'undefined') {
                delete queryObj[ignoreParam];
            }
        }
        Object.keys(queryObj).forEach(v => {
            origin += `${v}=${queryObj[v]}&`
        })
        origin = origin.slice(0, -1);
        return origin;
    }
    /**
     * 将父页面爬取的子路由推入队列等待爬取
     * @param hrefs
     * @param parentFileName
     */
    async crawlChildrenPage (hrefs = [], parentFileName, parentUrl) {
        for(let i = 0; i < hrefs.length; i++) {
            let url = hrefs[i];
            let ignorePathFlag = false;
            // 处理无效链接
            if (!url || url.includes('javascript:') || url.includes('blank') || url.includes('tel:') || url.includes('mailto:') || url.charAt(0) === '#') {
                continue;
            }
            // 不是项目内部链接
            if (url.includes('//') && !url.includes(this.entryUrl)) {
                continue;
            }
            // 处理忽略路由
            for(let i = 0; i < this.ignorePath.length; i++) {
                let ignoreItem = this.ignorePath[i];
                if (!this.isAbsolutePath(ignoreItem)) {
                    continue;
                }
                let pathname = '';
                if (url.includes('//')) {
                    pathname = new URL(url).pathname;
                } else {
                    let parentPathName = new URL(parentUrl).pathname;
                    pathname = path.resolve(parentPathName, url);
                }
                if (pathname === ignoreItem) {
                    ignorePathFlag = true;
                    break;
                }
            }
            if (ignorePathFlag) {
                continue;
            }
            // 处理不同类型的路由写法
            if (!url.includes('//')) {
                let parentPathName = new URL(parentUrl).pathname;
                let currentPathName = path.resolve(parentPathName, url);
                url = `${this.entryUrl}${currentPathName}`
            }

            // 处理忽略参数;
            url = this.handleIgnoreParam(url);

            // 已经存在路由
            if (Boolean(this.mapRouteToFileName[url])) {
                continue;
            }
            const fileName  = this.generateUnRepeatFileName();
            this.recordTaskMap(url, fileName);
            this.queueTaskArr.push({
                url,
                fileName,
                parentFileName
            })
        }
    }
    /**
     * 生成随机不重复字符串
     */
    generateUnRepeatFileName () {
        let fileName = '';
        do {
            fileName = randomstring.generate();
        } while (Boolean(this.mapFileNameToRoute[fileName]));

        return fileName;
    }
    /**
     * 判断路由是否是绝对路径
     * @param {} path
     */
    isAbsolutePath (path) {
        return !path.includes('//') && path.charAt(0) === '/';
    }
    async handleInitTask () {
        const fileName = this.generateUnRepeatFileName(); // 生成随机不重复字符串
        this.recordTaskMap(this.entryUrl, fileName);
        for(let i = 0; i < this.whitePath.length; i++) {
            let wPath = this.whitePath[i];
            // 只接收绝对路径
            if (!this.isAbsolutePath(wPath)) {
                continue;
            }
            const whitePathFileName = this.generateUnRepeatFileName();
            let item = {
                url: urlModule.resolve(this.entryUrl, wPath),
                fileName: whitePathFileName
            }
            if (Boolean(this.mapRouteToFileName[item.url])) {
                continue;
            }
            this.recordTaskMap(item.url, item.fileName);
            this.queueTaskArr.push(item);
        }
        if (this.notFoundPath && this.notFoundPath.length) {
            for(let i = 0; i < this.notFoundPath.length; i++) {
                let nPath = this.notFoundPath[i];
                const notFoundPathFileName = this.generateUnRepeatFileName();
                let item = {
                    url: decodeURIComponent(nPath),
                    fileName: notFoundPathFileName
                }
                if (Boolean(this.mapRouteToFileName[item.url])) {
                    continue;
                }
                this.recordTaskMap(item.url, item.fileName);
                this.queueTaskArr.push(item);
            }
        }
        if (this.isSubproject) {
            console.log('子项目爬取')
            let currentTask = this.queueTaskArr.shift();
            await this.handleHtmlFile(currentTask.url, currentTask.fileName);
        } else {
            console.log('主项目爬取')
            await this.handleHtmlFile(this.entryUrl, fileName);
        }
    }
    recordTaskMap (url, fileName) {
        this.mapRouteToFileName[url] = fileName;
        this.mapFileNameToRoute[fileName] = url;
    }
    /**
     * 将当前节点插入树
     * @param url
     * @param fileName
     * @param parentFileName
     */
    async handleConfirmNodePosition (url, fileName, parentFileName) {
        if (!parentFileName) {
            const routeMapObj = {
                file_name: fileName,
                route_name: url,
                children: [],
                level: 1
            }
            this.routeMapArr.push(routeMapObj);
            return;
        }
        let level = 2;
        function deepQueryNode (url, fileName, parentFileName, level, arr) {
            for(let i = 0; i < arr.length; i++) {
                let pLevel = level;
                let value = arr[i];
                if (value.file_name === parentFileName) {
                    value.children.push({
                        file_name: fileName,
                        route_name: url,
                        children: [],
                        level
                    });
                    break;
                } else if (value.children.length) {
                    pLevel++;
                    deepQueryNode (url, fileName, parentFileName, pLevel, value.children)
                }
            }
        }

        deepQueryNode(url, fileName, parentFileName, level, this.routeMapArr)

    }
    /**
     * 处理html 去掉style标签
     * @param {*} html
     */
    removeUselessTag (html) {
        html = html.replace(/\<style([\s\S]*?)\>([\s\S]*?)\<\/style\>/g, '');
        return html;
    }
    async handleHtmlFile(url, fileName, parentFileName) {
        let isTaskUploadFile = false;
        if (this.completeTaskNum === (this.currentBatchTask * this.batchNum)) {
            try {
                await fs.mkdirSync(`${this.packageName}`);
            } catch(e) {
                console.log(`创建目录:${e}`);
            }
        }
        let writerStream = await fs.createWriteStream(`${this.packageName}/${fileName}.html`);
        let html = await this.getPrerenderHtml(url, fileName); // 等待底层服务puppeteer完成爬取页面的动作结束
        html = this.removeUselessTag(html);
        if (html) {
            this.handleConfirmNodePosition(url, fileName, parentFileName);
            this.completeTaskNum++;
            writerStream.write(html, 'UTF8');
        }
        // 回收内存
        html = null;
        writerStream.end();
        if ((this.currentBatchTask + 1) * this.batchNum === this.completeTaskNum) {
            isTaskUploadFile = await this.handleUploadFile();
        }
         // 从队列中取出第一条 直到队列为空后结束
        if (this.queueTaskArr.length) {
            let currentTask = this.queueTaskArr.shift();
            console.log(currentTask.url, 'currentTask.url');
            await this.handleHtmlFile(currentTask.url, currentTask.fileName, currentTask.parentFileName)
        } else {
            this.isAllFileHandled = true;
            if (!isTaskUploadFile) {
                await this.handleUploadFile();
            }
            console.log('任务完成');
        }
    }
    /**
     * 上传文件
     */
    async handleUploadFile () {
        let success = false;
        let writerStreamJson = await fs.createWriteStream(`${this.packageName}/main.json`);
        let mainJson = {
            detail: this.routeMapArr
        };
        writerStreamJson.write(JSON.stringify(mainJson, null, 4),'UTF8');
        writerStreamJson.end();
        try {
            const isUploadSuccess = await Util.uploadMaven(this.packageName, this.entryUrl, './', this.isAllFileHandled);
            if (isUploadSuccess) {
                console.log(`${this.packageName}-${this.currentBatchTask}上传成功`);
                success = true;
                this.currentBatchTask++;
            }
        } catch(error) {
            console.log(`上传失败: ${error}`);
        }
        return success;
    }
    // 主入口
    async index(data) {
        console.log(JSON.stringify(data), 'data');
        this.entryUrl = data.ENTRY.charAt(data.ENTRY.length - 1) === '/' ? data.ENTRY: `${data.ENTRY}/`; // 取entry
        this.packageName = data.MODULE_NAME; // 取moduleName + hash,  由breeze生成
        this.ignorePath = data.IGNORE_PATH || []; // 取ignorePath
        this.whitePath = data.WHITE_PATH ? [...data.WHITE_PATH, '/404.html'] : ['/404.html']; // 取whitePath
        this.ignoreParams = data.IGNORE_PARAMS || []; // 取whitePath
        this.isSubproject = +data.IS_SUBPROJECT; // 取IS_SUBPROJECT
        this.notFoundPath = data.NOT_FOUND_PATH; // 取IS_SUBPROJECT

        try {
            this.packageName && await doShell(`rm -rf ${this.packageName}`);
        } catch (e) {
            console.log(`delete ${this.packageName} error: ${e}`);
        }

        await this.handleInitTask();

        await this.msgCollect(data.BUILDID);
    }
    //  上传数据到breeze进行落地
    async msgCollect(id) {
        let success_pages = Object.keys(this.mapRouteToFileName).length - this.errorList.length;
        let error_list = JSON.stringify(this.errorList);
        console.log(error_list, success_pages, id);
        await axios.post('http://47.110.117.218:80/api/msgCollect', {
            id,
            success_pages,
            error_list
        });
    }
}

module.exports = Prerender;
