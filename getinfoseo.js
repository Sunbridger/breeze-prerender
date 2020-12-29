const puppeteer = require('puppeteer');
const axios = require('axios');

class GetInfoSeo {
    constructor() {
        this.errList = [];
        this.browser = null;
        this.allProjectInfo = [];
    }
    async getSeoInfo(project) {
        const { entry, module_name: moduleName } = project;
        console.log(`${moduleName} begin 🚗`);
        const page = await this.browser.newPage();
        try {
            await page.goto(`https://seo.chinaz.com/${entry}`);
            await page.content();
            const result = await page.evaluate(() => {
                let selectorS = [{
                    key: 'bdi',
                    selector: '#seo_BaiduPages > a'
                }, {
                    key: 'bda',
                    selector: '#seo_BaiduLink > a'
                }, {
                    key: 'goi',
                    selector: '#seo_GooglePages > a'
                }, {
                    key: 'goa',
                    selector: '#seo_GoogleLink > a'
                }, {
                    key: 'tsi',
                    selector: '#seo_Pages360 > a'
                }, {
                    key: 'tsa',
                    selector: '#seo_Link360 > a'
                }, {
                    key: 'sgi',
                    selector: '#seo_SogouPages > a'
                }, {
                    key: 'sga',
                    selector: '#seo_SougouLink > a'
                }, {
                    key: 'bgi',
                    selector: '#seo_BingPages > a'
                }, {
                    key: 'bga',
                    selector: '#seo_BingLink > a'
                }];
                let result = {};
                selectorS.forEach(row => {
                    let a = document.querySelector(row.selector);
                    if (a) {
                        result[row.key] = a.innerText;
                    }
                });
                return result;
            });
            await page.close();
            console.log(`✅ ${moduleName} is Success`);
            return {
                moduleName,
                ...result
            };
        } catch (e) {
            console.log(`❌ ${moduleName} is fail`);
            await page.close();
            this.errList.push({entry, module_name: moduleName})
            return false;
        }
    }
    async index(data) {
        this.allProjectInfo = data.ALLPROJECTINFO;
        this.browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        let projectDataArr = await Promise.all(this.allProjectInfo.map(async project => await this.getSeoInfo(project)));
        projectDataArr = projectDataArr.filter(el => el);
        while (this.errList.length) {
            let arr = await Promise.all(this.errList.map(async (project, index) => {
                this.errList.splice(index, 1);
                return await this.getSeoInfo(project);
            }));
            arr = arr.filter(el => el);
            projectDataArr.push(...arr);
        }
        await this.browser.close();
        projectDataArr.forEach((el) => {
            let keys = Object.keys(el);
            let values = Object.values(el);
            values.forEach((item, index) => {
                if (!item) {
                    delete el[keys[index]];
                }
            })
        });
        console.log(projectDataArr, '准备反传给breeze的projectDataArr数据');
        projectDataArr.length && await axios.post('http://47.110.117.218:80/api/updateSeoInfo', {
            projectDataArr: JSON.stringify(projectDataArr)
        });
    }
}

module.exports = GetInfoSeo;
