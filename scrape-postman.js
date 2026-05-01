const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://documenter.getpostman.com/view/19136635/UyxhonL3', { waitUntil: 'networkidle0', timeout: 60000 });
  
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('postman-content.html', html);
  
  await browser.close();
})();