const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    await page.type('input[type="email"]', 'admin@nzdcontabilidade.com.br');
    
    // Click submit with wrong password to trigger error toast
    await page.evaluate(() => {
        document.querySelector('button[type="submit"]').click();
    });
    
    // Wait for a short time for toast to appear
    await new Promise(r => setTimeout(r, 500));
    
    const hasToaster = await page.evaluate(() => {
        return !!document.querySelector('[data-sonner-toaster]');
    });
    const html = await page.evaluate(() => {
        const toaster = document.querySelector('[data-sonner-toaster]');
        return toaster ? toaster.innerHTML : 'No toaster';
    });
    console.log('HAS TOASTER?', hasToaster);
    console.log('TOASTER HTML:', html);
    
  } catch (err) {
    console.error('Script Error:', err);
  }

  await browser.close();
})();
