
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Configurações
const CONFIG = {
    url: 'http://192.168.11.2:9001',
    token: 'ctWMyxZeZbkrH4cWCMqWPB0EX0ynm3CjYEocPadmU1v8v4Vv1YusFnFS8kILAKbt'
};

async function discoverRoutines() {
    console.log(`--- DESCOBERTA DE ROTINAS DE CADASTRO QUESTOR ---`);
    console.log(`URL: ${CONFIG.url}`);
    
    // Tipo 1 = Cadastros
    const endpoint = `/TnWebDMMenus/Pegar?_ATipo=1&TokenApi=${CONFIG.token}`;
    const url = `${CONFIG.url}${endpoint}`;

    console.log(`Consultando rotinas de cadastro: ${url}`);

    try {
        const res = await fetch(url);
        const text = await res.text();
        
        console.log(`Status: ${res.status}`);
        
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.log('Resposta não é JSON válido:', text.substring(0, 500));
            return;
        }
        
        console.log('\n--- BUSCANDO ROTINAS ---');
        
        const results: any[] = [];
        
        function search(items: any[], path: string = '') {
            if (!Array.isArray(items)) return;
            
            for (const item of items) {
                const currentPath = path ? `${path} > ${item.Text || item.Caption || '?'}` : (item.Text || item.Caption || '?');
                
                if (item.Name) {
                    const name = item.Name.toUpperCase();
                    const textLabel = (item.Text || item.Caption || '').toUpperCase();
                    const pathUpper = currentPath.toUpperCase();
                    
                    // Filtro mais específico para encontrar a tela PRINCIPAL
                    if (textLabel === 'FUNCIONÁRIOS' || textLabel === 'FUNCIONARIOS' || 
                        pathUpper.endsWith('> FUNCIONÁRIOS') || pathUpper.endsWith('> FUNCIONARIOS')) {
                        results.push({ name: item.Name, path: currentPath });
                    }
                }
                
                if (item.Childs && Array.isArray(item.Childs)) {
                    search(item.Childs, currentPath);
                }
            }
        }
        
        // Tentar identificar onde está a lista de itens
        const rootItems = Array.isArray(data) ? data : (data.Items || data.Data || []);
        
        if (Array.isArray(rootItems)) {
             search(rootItems);
        } else {
             console.log('Estrutura de dados não iterável:', typeof data);
             console.log('Chaves:', Object.keys(data));
        }
        
        console.log(`\nEncontradas ${results.length} rotinas potenciais:`);
        results.forEach(r => console.log(`[${r.name}] - ${r.path}`));

    } catch (error: any) {
        console.error(`Erro de execução: ${error.message}`);
    }
}

discoverRoutines();
