require('dotenv').config({ path: '.env' });
const axios = require('axios');
const fs = require('fs');

async function run() {
  try {
    const token = 'c4bd83b6cd8a2eefa00178647caacbab';
    const baseUrl = 'https://nzdcontabilidade.app.questorpublico.com.br';
    console.log('Buscando categorias em raw via fetch...');
    let response = await fetch(`${baseUrl}/api/v1/${token}/categorias`);
    let data = await response.text();
    console.log('Data len:', data.length);
    if(data.length > 0) {
        fs.writeFileSync('zen_categorias_raw.json', data);
        console.log('Salvo');
    }
  } catch(e) {
    console.error(e.message);
  }
}
run();