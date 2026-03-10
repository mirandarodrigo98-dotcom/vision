const CONFIG = {
    url: 'http://192.168.11.2:9001',
    token: 'ctWMyxZeZbkrH4cWCMqWPB0EX0ynm3CjYEocPadmU1v8v4Vv1YusFnFS8kILAKbt'
};

async function bruteForce() {
    const endpoint = `${CONFIG.url}/TnWebDMProcesso/ProcessoExecutar`;
    const routine = 'FuncionariosVision';
    
    console.log(`\n--- Brute Force Parameters for ${routine} ---`);

    // List of parameter names to try
    const paramNames = [
        'f.CodigoEmpresa',
        'F.CODIGOEMPRESA',
        'CODIGOEMPRESA',
        'CodigoEmpresa',
        'Empresa',
        'pCodigoEmpresa'
    ];

    // 1. GET Requests
    console.log('\n--- GET Requests ---');
    for (const name of paramNames) {
        const params = new URLSearchParams();
        params.append('_AActionName', routine);
        params.append('TokenApi', CONFIG.token);
        params.append(name, '1');
        params.append('_AsEcho', 'JSON');
        
        try {
            const res = await fetch(`${endpoint}?${params}`);
            const text = await res.text();
            if (!text.includes('requerido')) {
                console.log(`SUCCESS GET? [${name}]: ${text.substring(0, 100)}`);
            } else {
                console.log(`Failed GET [${name}]: Parameter required`);
            }
        } catch (e) {}
    }

    // 2. POST JSON Requests
    console.log('\n--- POST JSON Requests ---');
    for (const name of paramNames) {
        const body = {
            _AActionName: routine,
            TokenApi: CONFIG.token,
            _AsEcho: 'JSON'
        };
        body[name] = 1; // Send as Number

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const text = await res.text();
            
            // Filter out common errors
            if (res.status === 200 && !text.includes('requerido')) {
                 console.log(`SUCCESS POST [${name}]: ${text.substring(0, 300)}`);
            } else if (res.status === 500) {
                 // console.log(`Error 500 POST [${name}]: ${text.substring(0, 100)}`); 
            } else {
                 // console.log(`Failed POST [${name}]: ${text.substring(0, 50)}`);
            }
        } catch (e) {}
    }
}

async function run() {
    await bruteForce();
}

run();
