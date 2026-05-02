const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  try {
    console.log('Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });

    console.log('Typing credentials...');
    await page.type('input[type="email"]', 'miranda.rodrigo98@gmail.com');
    await page.type('input[type="password"]', '123456');

    console.log('Clicking login...');
    await page.click('button[type="submit"]');

    console.log('Waiting for navigation to / ...');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('Navigation complete. Current URL:', page.url());

    // Wait a bit to see if any client-side error occurs
    await new Promise(r => setTimeout(r, 5000));

    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    if (bodyHTML.includes('Application error: a client-side exception has occurred')) {
      console.log('APPLICATION ERROR FOUND IN HTML!');
    } else {
      console.log('No Application Error message found in HTML.');
    }

  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await browser.close();
  }
})();