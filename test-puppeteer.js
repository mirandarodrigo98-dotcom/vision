const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    console.log('Navigating...');
    await page.goto('https://83b03guvrf.apidog.io/', { waitUntil: 'networkidle2' });
    
    console.log('Waiting...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Extracting text...');
    const text = await page.evaluate(() => {
      return document.body.innerText;
    });
    
    fs.writeFileSync('apidog.txt', text);
    console.log('Saved to apidog.txt');
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();