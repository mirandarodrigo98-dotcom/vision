const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.error('PAGE ERROR:', error.message));

  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });

  // Fill login
  console.log('Filling email...');
  await page.type('input[type="email"]', 'admin@nzdcontabilidade.com.br');
  await page.click('button[type="submit"]');
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Filling password...');
  await page.type('input[type="password"]', 'nzd@2024'); // Assuming this is the password for local testing
  await page.click('button[type="submit"]');

  console.log('Waiting for navigation to dashboard...');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(e => console.log('Nav timeout'));
  
  console.log('Current URL:', page.url());
  
  // Try to logout
  console.log('Trying to click logout...');
  try {
    // Open dropdown
    await page.click('button:has(svg.lucide-chevron-down)');
    await new Promise(r => setTimeout(r, 1000));
    // Click Sair
    const [logoutBtn] = await page.$x("//span[contains(., 'Sair')]");
    if (logoutBtn) {
      await logoutBtn.click();
      console.log('Clicked Sair');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      console.log('Navigated to:', page.url());
    }
  } catch (e) {
    console.error('Logout error:', e);
  }

  await browser.close();
})();
