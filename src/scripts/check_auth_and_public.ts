
import { db } from '../db/index.js';

const CONFIG = {
    external_url: "http://hcs08305ayy.sn.mynetname.net:9001",
    // Token antigo para referência
    old_token: "7yU9tK2sP4rM6nB8vX3cZ1wA5qD0eF9gH2iJ4kL6mN8oP0rQ2sT4uV6wX8yZ0aB"
};

async function checkPublicEndpoint() {
    console.log('--- Checking Public Connectivity & Auth ---');
    const baseUrl = CONFIG.external_url.replace(/\/$/, '');
    
    // 1. Test PegarVersaoQuestor (Usually Public)
    const publicUrl = `${baseUrl}/TnWebDMDadosGerais/PegarVersaoQuestor`;
    console.log(`\nTesting Public Endpoint: ${publicUrl}`);
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const res = await fetch(publicUrl, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log(`Body: ${text.substring(0, 200)}`);
        
        if (res.status === 200) {
            console.log('>>> SUCESSO: Servidor acessível e respondendo em endpoint público!');
        } else {
            console.log('>>> AVISO: Servidor acessível mas retornou erro no endpoint público.');
        }
    } catch (e: any) {
        console.error(`>>> ERRO FATAL DE CONEXÃO: ${e.message}`);
    }

    // 2. Test Token Validation explicit msg
    const authUrl = `${baseUrl}/TnInfo/Info?TokenApi=${CONFIG.old_token}`;
    console.log(`\nTesting Auth with current token: ${authUrl}`);
    try {
        const res = await fetch(authUrl);
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Body: ${text}`); // Show full error for user confirmation
    } catch (e: any) {
        console.error(e.message);
    }
}

checkPublicEndpoint();
