const puppeteer = require('puppeteer');

(async () => {
  console.log('Iniciando browser...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  // Interceptar todos os logs
  page.on('console', msg => {
    for (let i = 0; i < msg.args().length; ++i)
      console.log(`${i}: ${msg.args()[i]}`);
    console.log('PAGE LOG:', msg.text());
  });
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log('Acessando https://vision.nzdcontabilidade.com.br/login...');
  try {
    await page.goto('https://vision.nzdcontabilidade.com.br/login', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('Página carregada. Aguardando...');
    await new Promise(r => setTimeout(r, 5000));
  } catch (err) {
    console.error('Erro na navegação:', err);
  }

  await browser.close();
})();
