const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.text().includes('error') || msg.text().includes('Error')) {
        console.log('BROWSER LOG:', msg.type(), msg.text());
    }
  });
  page.on('pageerror', error => console.log('BROWSER PAGE ERROR:', error.message));

  try {
    console.log('Indo para o login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
    
    await page.evaluate(() => {
        const originalError = window.console.error;
        window.console.error = (...args) => {
            console.log('APP_CONSOLE_ERROR:', args.join(' '));
            originalError(...args);
        };
    });

    console.log('Digitando email e senha...');
    await page.type('input[type="email"]', 'miranda.rodrigo98@gmail.com');
    await page.type('input[type="password"]', '123456');
    
    console.log('Clicando submit...');
    await page.evaluate(() => {
        document.querySelector('button[type="submit"]').click();
    });
    
    console.log('Esperando 10 segundos...');
    await new Promise(r => setTimeout(r, 10000));
    
    console.log('URL final:', page.url());
    
    const body = await page.evaluate(() => document.body.innerHTML);
    console.log('PAGE HTML SNIPPET:', body.substring(0, 1000));
    
  } catch (err) {
    console.error('Script Error:', err);
  }

  await browser.close();
})();
