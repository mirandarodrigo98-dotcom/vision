const CONFIG = {
    url: 'http://192.168.11.2:9001',
    token: 'ctWMyxZeZbkrH4cWCMqWPB0EX0ynm3CjYEocPadmU1v8v4Vv1YusFnFS8kILAKbt'
};

async function testBaseline() {
    const endpoint = `${CONFIG.url}/TnWebDMConsulta/Pegar`;
    
    // 1. Baseline: Users table (Standard Questor table)
    console.log(`\n--- Baseline: TnGlbDMUsuario ---`);
    const paramsBase = new URLSearchParams({
        _AActionName: 'TnGlbDMUsuario',
        TokenApi: CONFIG.token,
        '_AsEcho': 'JSON',
        '_AiDisplayStart': '0',
        '_AiDisplayLength': '5'
    });
    
    try {
        const res = await fetch(`${endpoint}?${paramsBase}`);
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(`Response: ${text.substring(0, 300)}`);
    } catch (e) { console.log(e.message); }

    // 2. Target: FuncionariosVision with exact parameter casing from error message
    console.log(`\n--- Target: FuncionariosVision (f.CodigoEmpresa) ---`);
    // Try Company 1, 999, and others
    const companies = [1, 2, 4, 7, 999]; 
    
    for (const company of companies) {
        const paramsTarget = new URLSearchParams({
            _AActionName: 'FuncionariosVision',
            TokenApi: CONFIG.token,
            'f.CodigoEmpresa': company, // Case from error message
            '_AsEcho': 'JSON',
            '_AiDisplayStart': '0',
            '_AiDisplayLength': '10'
        });
        
        try {
            console.log(`Trying Company ${company}...`);
            const res = await fetch(`${endpoint}?${paramsTarget}`);
            const text = await res.text();
            if (text.length > 50 && !text.includes('"Message":""')) {
                console.log(`SUCCESS? Response: ${text.substring(0, 300)}`);
            } else {
                console.log(`Empty/Error: ${text.substring(0, 100)}`);
            }
        } catch (e) { console.log(e.message); }
    }
}

async function run() {
    await testBaseline();
}

run();
