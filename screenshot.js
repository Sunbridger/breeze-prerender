const puppeteer = require('puppeteer');
const Util = require('./utils/index');


let url = ''
let filename = ''
let pageWidth = 1280;

async function entry (data) {
    url = decodeURIComponent(data.SCREENSHOTURL) || ''
    filename = data.SCREENSHOTFILENAME || ''
    pageWidth = +data.SCREENSHOTWIDTH || 1280
    await getUrlScreenShot()
    await Util.uploadOss(filename, './');
}

async function getUrlScreenShot () {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    const page = await browser.newPage()
    page.setViewport({
        width: pageWidth,
        height: 689,
        deviceScaleFactor: 2
    })
    let isErrorStatus = false;
    process.on('unhandledRejection', (reason, p) => {
        console.error("Unhandled Rejection at: Promise", p, "reason:", reason);
        browser.close()
        isErrorStatus = true
    });
    try {
        await page.goto(url, { waitUntil: 'networkidle0' });
    } catch (error) {
        isErrorStatus = true;
        browser.close();
    }
    if (isErrorStatus) {
        return ''
    }
    await page.evaluate(() => {
        let imgUrlEl = document.querySelector('.imgUrl');
        if (imgUrlEl) {
            imgUrlEl.style.display = 'block';
        }
        let scrollHeight = document.documentElement.scrollHeight || 0;
        window.scrollBy(0, scrollHeight);
    })
    await page.waitFor(2000);
    await page.screenshot({ 
        path: filename,
        fullPage: true,
        type: 'jpeg',
        quality: 100
    });
    await browser.close()
    return true
}

module.exports = {
    entry
}