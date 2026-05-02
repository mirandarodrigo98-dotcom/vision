const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    console.log('Typing email and password...');
    await page.type('input[type="email"]', 'admin@nzdcontabilidade.com.br');
    await page.type('input[type="password"]', 'nzd@2024');
    
    console.log('Clicking submit...');
    await page.evaluate(() => {
        document.querySelector('button[type="submit"]').click();
    });
    
    console.log('Waiting for 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    
  } catch (err) {
    console.error('Script Error:', err);
  }

  await browser.close();
})();
