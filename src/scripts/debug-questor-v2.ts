
import https from 'https';
import http from 'http';

// Configuração com NOVO TOKEN
const CONFIG = {
    api_token: "ctWMyxZeZbkrH4cWCMqWPB0EX0ynm3CjYEocPadmU1v8v4Vv1YusFnFS8kILAKbt",
    external_url: "http://hcs08305ayy.sn.mynetname.net:9001"
};

// Logger
function log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

async function fetchWithLog(
    label: string, 
    endpoint: string, 
    method: string = 'GET', 
    body: any = null, 
    contentType: string | null = null,
    headers: Record<string, string> = {},
    queryParams: Record<string, string> = {},
    useDefaultAuth: boolean = true
) {
    const baseUrl = CONFIG.external_url.replace(/\/$/, '');
    
    // Query String Construction
    const params = new URLSearchParams(queryParams);
    const requestHeaders: Record<string, string> = {
        ...headers
    };
    
    // Auth via Query Parameter (CRITICAL FIX)
    if (useDefaultAuth) {
        params.append('TokenApi', CONFIG.api_token);
        // Remove headers just in case they conflict, though unlikely
        // requestHeaders['Authorization'] = `Bearer ${CONFIG.api_token}`;
    }

    const queryString = params.toString();
    const url = `${baseUrl}/${endpoint}${queryString ? '?' + queryString : ''}`;

    log(`Testing ${label} - ${method} ${url}`);

    if (contentType) {
        requestHeaders['Content-Type'] = contentType;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(url, {
            method,
            headers: requestHeaders,
            body: body,
            signal: controller.signal,
            cache: 'no-store'
        });

        clearTimeout(timeoutId);

        const status = response.status;
        const resText = await response.text();
        
        console.log(`[${status}] Response for ${label}:`);
        
        // Log inteligente para Info
        if (label === 'Info') {
             console.log(resText.substring(0, 5000));
        } else {
             console.log(resText.substring(0, 1000));
        }
        
        return { success: true, status, text: resText };

    } catch (error: any) {
        console.error(`Error in ${label}:`, error.message);
        return { success: false, error: error.message };
    }
}

async function debugQuestorPhase205() {
    console.log('--- Debugging Questor Connectivity (Phase 205: Menu Discovery) ---');
    
    const queryParams = { 'TokenApi': CONFIG.api_token };
    
    // 1. TnWebDMMenus/Pegar - Try to list menus
    console.log('\n=== 1. TnWebDMMenus/Pegar (Exploration) ===');
    const menuTypes = ['0', '1', 'Main', 'Menu', 'Principal', 'Tree'];
    
    for (const type of menuTypes) {
        const params = {
            ...queryParams,
            '_ATipo': type
        };
        // Tentar GET e POST
        await fetchWithLog(`Menu Pegar (Type=${type})`, 'TnWebDMMenus/Pegar', 'GET', null, null, {}, params, false);
        await fetchWithLog(`Menu Pegar (Type=${type}) POST`, 'TnWebDMMenus/Pegar', 'POST', null, null, {}, params, false);
    }
}

async function debugQuestorPhase206() {
    console.log('--- Debugging Questor Connectivity (Phase 206: SQL Execution with NEW TOKEN) ---');
    
    // Teste SQL Simples
    const sql = "select current_timestamp";
    const sqlBase64 = Buffer.from(sql).toString('base64');
    
    const body = new URLSearchParams();
    body.append('_ASQL', sqlBase64);
    body.append('_ABase64', 'True');
    body.append('_ATipoRetorno', 'JSON');
    
    console.log('\n=== 1. TnWebDMSql/Executar (Simple Select) ===');
    await fetchWithLog(
        'SQL Executar (Base64)', 
        'TnWebDMSql/Executar', 
        'POST', 
        body, 
        'application/x-www-form-urlencoded'
    );

    // Teste SQL Sem Base64
    const bodyPlain = new URLSearchParams();
    bodyPlain.append('_ASQL', sql);
    bodyPlain.append('_ABase64', 'False');
    bodyPlain.append('_ATipoRetorno', 'JSON');
    
    console.log('\n=== 2. TnWebDMSql/Executar (Plain Text) ===');
    await fetchWithLog(
        'SQL Executar (Plain)', 
        'TnWebDMSql/Executar', 
        'POST', 
        bodyPlain, 
        'application/x-www-form-urlencoded'
    );
}

async function debugQuestorPhase207() {
    console.log('--- Debugging Questor Connectivity (Phase 207: Comprehensive Discovery with NEW TOKEN) ---');
    
    // 1. TnInfo/Info
    console.log('\n=== 1. TnInfo/Info ===');
    const infoRes = await fetchWithLog('Info', 'TnInfo/Info', 'GET');
    
    // 2. TnWebDMMenus/Pegar
    console.log('\n=== 2. TnWebDMMenus/Pegar ===');
    const menuTypes = ['0', '1', 'Main', 'Menu', 'Principal', 'Tree'];
    for (const type of menuTypes) {
        await fetchWithLog(`Menu Pegar (Type=${type})`, 'TnWebDMMenus/Pegar', 'GET', null, null, {}, { '_ATipo': type });
    }

    // 3. TnWebDMDadosGerais/Executar
    console.log('\n=== 3. TnWebDMDadosGerais/Executar ===');
    // Tentar descobrir actions
    const actions = ['GetEmpresas', 'GetFiliais', 'GetFuncionarios', 'Listar', 'Pegar', 'Executar', 'Versao', 'Version', 'Ping', 'Status'];
    for (const action of actions) {
        await fetchWithLog(`DadosGerais (Action=${action})`, 'TnWebDMDadosGerais/Executar', 'POST', null, null, {}, { '_AAction': action });
    }
}

async function debugQuestorPhase208() {
    console.log('--- Debugging Questor Connectivity (Phase 208: Auth Fuzzing on TnInfo/Info) ---');
    
    const token = CONFIG.api_token;
    const variations = [
        { label: 'Header: TokenApi', headers: { 'TokenApi': token }, params: {} },
        { label: 'Header: tokenapi', headers: { 'tokenapi': token }, params: {} },
        { label: 'Header: Authorization Bearer', headers: { 'Authorization': `Bearer ${token}` }, params: {} },
        { label: 'Header: Authorization Basic', headers: { 'Authorization': `Basic ${Buffer.from(token + ':').toString('base64')}` }, params: {} },
        { label: 'Header: X-Questor-Token', headers: { 'X-Questor-Token': token }, params: {} },
        { label: 'Header: api_token', headers: { 'api_token': token }, params: {} },
        { label: 'Query: TokenApi', headers: {}, params: { 'TokenApi': token } },
        { label: 'Query: tokenapi', headers: {}, params: { 'tokenapi': token } },
        { label: 'Query: api_token', headers: {}, params: { 'api_token': token } },
        { label: 'Query: key', headers: {}, params: { 'key': token } },
        { label: 'Query: _AToken', headers: {}, params: { '_AToken': token } },
        { label: 'Query: _ATokenApi', headers: {}, params: { '_ATokenApi': token } },
    ];

    for (const v of variations) {
        // Disable default auth to test specific variations
        await fetchWithLog(`Auth Test (${v.label})`, 'TnInfo/Info', 'GET', null, null, v.headers, v.params, false);
    }
}

async function debugQuestorPhase209() {
    console.log('--- Debugging Questor Connectivity (Phase 209: Retest SQL with Query Auth) ---');
    
    // Teste SQL Simples
    const sql = "select current_timestamp";
    const sqlBase64 = Buffer.from(sql).toString('base64');
    
    const body = new URLSearchParams();
    body.append('_ASQL', sqlBase64);
    body.append('_ABase64', 'True');
    body.append('_ATipoRetorno', 'JSON');
    
    console.log('\n=== 1. TnWebDMSql/Executar (Base64) ===');
    await fetchWithLog(
        'SQL Executar (Base64)', 
        'TnWebDMSql/Executar', 
        'POST', 
        body, 
        'application/x-www-form-urlencoded'
    );

    // Teste SQL Plain
    const bodyPlain = new URLSearchParams();
    bodyPlain.append('_ASQL', sql);
    bodyPlain.append('_ABase64', 'False');
    bodyPlain.append('_ATipoRetorno', 'JSON');
    
    console.log('\n=== 2. TnWebDMSql/Executar (Plain) ===');
    await fetchWithLog(
        'SQL Executar (Plain)', 
        'TnWebDMSql/Executar', 
        'POST', 
        bodyPlain, 
        'application/x-www-form-urlencoded'
    );
}

async function debugQuestorPhase210() {
    console.log('--- Debugging Questor Connectivity (Phase 210: Discovery with Fixed Auth) ---');
    
    // 1. TnWebDMMenus/Pegar
    console.log('\n=== 1. TnWebDMMenus/Pegar ===');
    const menuTypes = ['0', '1', 'Main', 'Menu', 'Principal', 'Tree'];
    for (const type of menuTypes) {
        await fetchWithLog(`Menu Pegar (Type=${type})`, 'TnWebDMMenus/Pegar', 'GET', null, null, {}, { '_ATipo': type });
    }

    // 2. TnWebDMDadosGerais/Executar
    console.log('\n=== 2. TnWebDMDadosGerais/Executar ===');
    const actions = ['GetEmpresas', 'GetFiliais', 'GetFuncionarios', 'Listar', 'Pegar', 'Executar', 'Versao', 'Version', 'Ping', 'Status'];
    for (const action of actions) {
        await fetchWithLog(`DadosGerais (Action=${action})`, 'TnWebDMDadosGerais/Executar', 'POST', null, null, {}, { '_AAction': action });
    }

    // 3. TnWebDMRelatorio/Executar (Attempt to trigger report execution or error)
    console.log('\n=== 3. TnWebDMRelatorio/Executar ===');
    await fetchWithLog('Relatorio Executar', 'TnWebDMRelatorio/Executar', 'POST', null, null, {}, { '_AActionName': 'Relatorio' });
}

async function debugQuestorPhase211() {
    console.log('--- Debugging Questor Connectivity (Phase 211: Relatorio & Menus Refined) ---');
    
    // 1. TnWebDMRelatorio/Executar - Supply missing parameters
    console.log('\n=== 1. TnWebDMRelatorio/Executar (Probing) ===');
    const relatorioParams = {
        '_AActionName': 'Relatorio',
        '_ATipoRetorno': 'JSON'
    };
    await fetchWithLog('Relatorio Executar (Basic)', 'TnWebDMRelatorio/Executar', 'POST', null, null, {}, relatorioParams);

    // Try to sneak in SQL
    const sql = "select current_timestamp";
    const sqlBase64 = Buffer.from(sql).toString('base64');
    const sqlParams = {
        '_AActionName': 'Relatorio', // or 'ExecutarSQL', 'SQL'
        '_ATipoRetorno': 'JSON',
        '_ASQL': sqlBase64,
        '_ABase64': 'True'
    };
    await fetchWithLog('Relatorio Executar (SQL Attempt)', 'TnWebDMRelatorio/Executar', 'POST', null, null, {}, sqlParams);

    // 2. TnWebDMMenus/Pegar - Try valid integers
    console.log('\n=== 2. TnWebDMMenus/Pegar (Integers) ===');
    const menuInts = ['0', '1', '2', '3', '10', '100', '-1'];
    for (const type of menuInts) {
        await fetchWithLog(`Menu Pegar (Type=${type})`, 'TnWebDMMenus/Pegar', 'GET', null, null, {}, { '_ATipo': type });
    }
}

import fs from 'fs';
import path from 'path';

async function debugQuestorPhase226() {
    console.log('--- Debugging Questor Connectivity (Phase 226: Processo Fuzzing & Service Re-Check) ---');
    console.log('Using Token:', CONFIG.api_token);

    // 1. Re-check Services (Simulated by probing based on dump analysis)
    // We will assume I did this offline or will do it via a separate script if needed.
    // But let's probe for likely candidates.
    const candidates = ['TnWebDMSQL', 'TnWebDMQuery', 'TnWebDMExecucao', 'TnWebDMImportacao'];
    for (const cand of candidates) {
        await fetchWithLog(
            `Candidate Probe (${cand})`, 
            `${cand}/Pegar`, 
            'GET', 
            null, 
            null
        );
    }

    // 2. TnWebDMProcesso Fuzzing
    console.log('\n=== 2. TnWebDMProcesso Fuzzing ===');
    const processActions = ['Listar', 'ExecutarSQL', 'Processar', 'Executar'];
    for (const action of processActions) {
        // GET
        await fetchWithLog(
            `Processo GET (${action})`, 
            'TnWebDMProcesso/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            {
                '_AActionName': action,
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );

        // POST Form
        const params = new URLSearchParams();
        params.append('_AActionName', action);
        params.append('_AiDisplayStart', '0');
        params.append('_AiDisplayLength', '10');
        params.append('_AsEcho', 'True');

        await fetchWithLog(
            `Processo POST (${action})`, 
            'TnWebDMProcesso/Pegar', 
            'POST', 
            params.toString(), 
            'application/x-www-form-urlencoded'
        );
    }

    // 3. TnWebDMConsulta Filter Cracking Part 9
    console.log('\n=== 3. TnWebDMConsulta Filter Part 9 ===');
    const filterKeys = ['Condition', 'Criteria', '_ASQLWhere', '_ASQLFilter', 'q', 'query'];
    for (const key of filterKeys) {
        await fetchWithLog(
            `Filter Probe (${key})`, 
            'TnWebDMConsulta/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            {
                '_AActionName': 'TnFpaDMFuncContrato',
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True',
                [key]: 'CODIGOEMPRESA=1'
            }
        );
    }
}

// debugQuestorPhase226().catch(console.error);

// debugQuestorPhase228().catch(console.error);

async function debugQuestorPhase229() {
    console.log('--- Debugging Questor Connectivity (Phase 229: Prefix Variations & Processo Actions) ---');
    console.log('Using Token:', CONFIG.api_token);

    // 1. Prefix Variation Probe (TnWeb vs nWeb vs Web)
    console.log('\n=== 1. Prefix Variation Probe ===');
    const prefixes = ['nWeb', 'Web', 'Tn'];
    const modules = ['DMIntegracao', 'DMProcesso', 'DMSQL']; // DMSQL is a guess

    for (const prefix of prefixes) {
        for (const mod of modules) {
            const endpoint = `${prefix}${mod}/Pegar`;
            await fetchWithLog(
                `Prefix Probe (${endpoint})`, 
                endpoint, 
                'GET', 
                null, 
                null, 
                {},
                {
                    '_AActionName': 'ExecutarSQL',
                    '_AiDisplayStart': '0',
                    '_AiDisplayLength': '10',
                    '_AsEcho': 'True'
                }
            );
        }
    }

    // 2. TnWebDMProcesso Action Brute Force
    console.log('\n=== 2. TnWebDMProcesso Action Brute Force ===');
    const actions = [
        'Execute', 'Run', 'SQL', 'Query', 'Command', 'Process', 'Task', 'Job',
        'Executar', 'Rodar', 'Processar', 'Integrar', 'Importar', 'Exportar'
    ];

    for (const action of actions) {
        await fetchWithLog(
            `Processo Action (${action})`, 
            'TnWebDMProcesso/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            {
                '_AActionName': action,
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }

    // 3. TnWebDMIntegracao Method Probe
    console.log('\n=== 3. TnWebDMIntegracao Method Probe ===');
    const methods = ['POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
    for (const method of methods) {
        await fetchWithLog(
            `Integracao Method (${method})`,
            'TnWebDMIntegracao/Pegar',
            method,
            null,
            null,
            {},
            {
                '_AActionName': 'ExecutarSQL'
            }
        );
    }
}

// debugQuestorPhase229().catch(console.error);

async function debugQuestorPhase230() {
    console.log('--- Debugging Questor Connectivity (Phase 230: DadosGerais & Filter Syntax) ---');
    console.log('Using Token:', CONFIG.api_token);

    // 1. TnWebDMDadosGerais Probe
    console.log('\n=== 1. TnWebDMDadosGerais Probe ===');
    const geraisActions = ['DataHoraServidor', 'Versao', 'Ping', 'Echo', 'Teste', 'GetDate', 'GetVersion'];
    for (const action of geraisActions) {
        await fetchWithLog(
            `Gerais Action (${action})`,
            'TnWebDMDadosGerais/Pegar',
            'GET',
            null,
            null,
            {},
            {
                '_AActionName': action,
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }

    // 2. TnWebDMProcesso Recursive Action
    console.log('\n=== 2. TnWebDMProcesso Recursive Action ===');
    await fetchWithLog(
        `Processo Recursive`,
        'TnWebDMProcesso/Pegar',
        'GET',
        null,
        null,
        {},
        {
            '_AActionName': 'TnWebDMProcesso',
            '_AiDisplayStart': '0',
            '_AiDisplayLength': '10',
            '_AsEcho': 'True'
        }
    );

    // 3. TnWebDMConsulta Filter Syntax
    console.log('\n=== 3. TnWebDMConsulta Filter Syntax ===');
    const syntaxes = [
        'CODIGOEMPRESA:1',
        '(CODIGOEMPRESA=1)',
        '[CODIGOEMPRESA=1]',
        'Upper(CODIGOEMPRESA)=1',
        '1=1',
        'CODIGOEMPRESA eq 1',
        'CODIGOEMPRESA = 1' // with spaces
    ];

    for (const syntax of syntaxes) {
        await fetchWithLog(
            `Filter Syntax (${syntax})`,
            'TnWebDMConsulta/Pegar',
            'GET',
            null,
            null,
            {},
            {
                '_AActionName': 'TnFpaDMFuncContrato',
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True',
                'Filter': syntax // Trying 'Filter' param name again with new syntax
            }
        );
    }
}

// debugQuestorPhase230().catch(console.error);

async function debugQuestorPhase231() {
    console.log('--- Debugging Questor Connectivity (Phase 231: Filter-Less Tables) ---');
    console.log('Using Token:', CONFIG.api_token);

    // 1. TnWebDMConsulta Filter-Less Table Probe
    console.log('\n=== 1. TnWebDMConsulta Filter-Less Table Probe ===');
    const tables = ['TnGlbDMPais', 'TnGlbDMEstado', 'TnGlbDMMunicipio', 'TnGlbDMMoeda'];
    
    for (const table of tables) {
        await fetchWithLog(
            `Table Probe (${table})`, 
            'TnWebDMConsulta/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            {
                '_AActionName': table,
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }

    // 2. TnWebDMConsulta Filter Variations
    console.log('\n=== 2. TnWebDMConsulta Filter Variations ===');
    const filters = ['1=1', 'True', 'All', 'None', '*', '%', 'IsNotNull'];
    for (const f of filters) {
        await fetchWithLog(
            `Filter Variation (${f})`, 
            'TnWebDMConsulta/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            {
                '_AActionName': 'TnFpaDMFuncContrato',
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True',
                'Filter': f
            }
        );
    }
}

// debugQuestorPhase231().catch(console.error);

async function debugQuestorPhase232() {
    console.log('--- Debugging Questor Connectivity (Phase 232: Integracao Path Fuzzing & Filter Keys) ---');
    console.log('Using Token:', CONFIG.api_token);

    // 1. TnWebDMIntegracao Path Fuzzing
    console.log('\n=== 1. TnWebDMIntegracao Path Fuzzing ===');
    const integracaoPaths = [
        'TnWebDMIntegracao/ExecutarSQL',
        'TnWebDMIntegracao/Run',
        'TnWebDMIntegracao/Execute',
        'TnWebDMIntegracao/SQL',
        'TnWebDMIntegracao/Executar',
        'TnWebDMIntegracao/Integrar'
    ];
    
    for (const p of integracaoPaths) {
        await fetchWithLog(
            `Integracao Path (${p})`, 
            p, 
            'POST', 
            null, 
            null, 
            {},
            {
                '_ASQL': 'SELECT 1',
                '_AActionName': 'ExecutarSQL'
            }
        );
    }

    // 2. TnWebDMConsulta Filter Key Discovery
    console.log('\n=== 2. TnWebDMConsulta Filter Key Discovery ===');
    const filterKeys = [
        '_AFilter', '_AWhere', '_ACriteria', '_ACondition', 
        '_ASQLFilter', '_ASQLWhere', 'Criteria', 'Condition', 
        'Where', 'Params', 'Key', 'ID', 'Code'
    ];
    
    for (const key of filterKeys) {
        const queryParams = {
            '_AActionName': 'TnFpaDMFuncContrato',
            '_AiDisplayStart': '0',
            '_AiDisplayLength': '10',
            '_AsEcho': 'True'
        };
        // Add dynamic key
        (queryParams as any)[key] = 'CODIGOEMPRESA=1';

        await fetchWithLog(
            `Filter Key (${key})`, 
            'TnWebDMConsulta/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            queryParams
        );
    }

    // 3. TnWebDMDadosObjetos Fuzzing
    console.log('\n=== 3. TnWebDMDadosObjetos Fuzzing ===');
    const objects = ['Funcionario', 'Pessoa', 'Empresa', 'Contrato', 'Socio', 'User', 'Usuario'];
    for (const obj of objects) {
        await fetchWithLog(
            `Object Probe (${obj})`, 
            'TnWebDMDadosObjetos/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            {
                '_AActionName': obj,
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }
}

// debugQuestorPhase232().catch(console.error);

async function debugQuestorPhase233() {
    console.log('--- Debugging Questor Connectivity (Phase 233: Object Names, Base64 Filters, Cadastros) ---');
    console.log('Using Token:', CONFIG.api_token);

    // 1. TnWebDMDadosObjetos with Full Names
    console.log('\n=== 1. TnWebDMDadosObjetos with Full Names ===');
    const modules = [
        'TnFpaDMFuncContrato', 
        'TnGlbDMPessoa', 
        'TnGlbDMFerias', 
        'TnFpaDMMovimento',
        'TnGlbDMEmpresa',
        'TnFpaDMFuncionario',
        'TnWebDMDadosObjetos'
    ];

    for (const mod of modules) {
        await fetchWithLog(
            `Object Name (${mod})`, 
            'TnWebDMDadosObjetos/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            {
                '_AActionName': mod,
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }

    // 2. TnWebDMConsulta Base64 Filters
    console.log('\n=== 2. TnWebDMConsulta Base64 Filters ===');
    const plainFilter = 'CODIGOEMPRESA=1';
    const b64Filter = Buffer.from(plainFilter).toString('base64');
    
    await fetchWithLog(
        `Base64 Filter (Filter=${b64Filter})`, 
        'TnWebDMConsulta/Pegar', 
        'GET', 
        null, 
        null, 
        {},
        {
            '_AActionName': 'TnFpaDMFuncContrato',
            '_AiDisplayStart': '0',
            '_AiDisplayLength': '10',
            '_AsEcho': 'True',
            'Filter': b64Filter
        }
    );

    // 3. TnWebDMCadastros Probe
    console.log('\n=== 3. TnWebDMCadastros Probe ===');
    const cadastrosActions = ['Pegar', 'Listar', 'Salvar', 'Incluir', 'TnFpaDMFuncContrato', 'TnGlbDMPessoa'];
    
    for (const action of cadastrosActions) {
        await fetchWithLog(
            `Cadastros Probe (${action})`,
            'TnWebDMCadastros/Pegar',
            'GET',
            null,
            null,
            {},
            {
                '_AActionName': action,
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }
}

// debugQuestorPhase233().catch(console.error);

async function debugQuestorPhase234() {
    console.log('--- Debugging Questor Connectivity (Phase 234: POST Body, Cadastros Fuzzing, Relatorio Listar) ---');
    console.log('Using Token:', CONFIG.api_token);

    // 1. TnWebDMConsulta POST Body
    console.log('\n=== 1. TnWebDMConsulta POST Body ===');
    const bodies = [
        { Filter: 'CODIGOEMPRESA=1' },
        { _AFilter: 'CODIGOEMPRESA=1' },
        { Criteria: 'CODIGOEMPRESA=1' },
        { Params: { CODIGOEMPRESA: 1 } },
        { SQL: 'SELECT * FROM FUNCIONARIO' }
    ];

    for (const body of bodies) {
        await fetchWithLog(
            `Consulta POST Body (${JSON.stringify(body)})`,
            'TnWebDMConsulta/Pegar',
            'POST',
            JSON.stringify(body),
            { 'Content-Type': 'application/json' },
            {},
            {
                '_AActionName': 'TnFpaDMFuncContrato',
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }

    // 2. TnWebDMCadastros Parameter Fuzzing
    console.log('\n=== 2. TnWebDMCadastros Parameter Fuzzing ===');
    const idParams = [
        { ID: 1 },
        { Codigo: 1 },
        { Key: 1 },
        { _AID: 1 },
        { _ACodigo: 1 },
        { PK: 1 }
    ];

    for (const params of idParams) {
        await fetchWithLog(
            `Cadastros Params (${JSON.stringify(params)})`,
            'TnWebDMCadastros/Pegar',
            'GET',
            null,
            null,
            {},
            {
                '_AActionName': 'Pegar',
                ...params
            }
        );
    }

    // 3. TnWebDMRelatorio Listar
    console.log('\n=== 3. TnWebDMRelatorio Listar ===');
    const relActions = ['Listar', 'List', 'GetReports', 'Relatorios', 'Menu', 'Index'];
    for (const action of relActions) {
        await fetchWithLog(
            `Relatorio Action (${action})`,
            'TnWebDMRelatorio/Pegar',
            'GET',
            null,
            null,
            {},
            {
                '_AActionName': action,
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }

    // 4. TnWebDMDadosObjetos SQL Injection Attempt
    console.log('\n=== 4. TnWebDMDadosObjetos SQL Injection Attempt ===');
    const sqlActions = ['ExecutarSQL', 'SQL', 'Query', 'TExecutarSQL', 'TSQL', 'TQuery'];
    for (const action of sqlActions) {
        await fetchWithLog(
            `DadosObjetos SQL (${action})`,
            'TnWebDMDadosObjetos/Pegar',
            'GET',
            null,
            null,
            {},
            {
                '_AActionName': action,
                '_ASQL': 'SELECT 1'
            }
        );
    }
}

// debugQuestorPhase234().catch(console.error);

async function debugQuestorPhase235() {
    console.log('--- Debugging Questor Connectivity (Phase 235: Consulta SQL, Path Injection, Relatorio Executar) ---');
    console.log('Using Token:', CONFIG.api_token);

    // 1. TnWebDMConsulta Action SQL
    console.log('\n=== 1. TnWebDMConsulta Action SQL ===');
    const sqlActions = ['ExecutarSQL', 'SQL', 'Query', 'Command', 'Execute', 'Run'];
    for (const action of sqlActions) {
        await fetchWithLog(
            `Consulta Action SQL (${action})`, 
            'TnWebDMConsulta/Pegar', 
            'GET', 
            null, 
            null, 
            {},
            {
                '_AActionName': action,
                '_ASQL': 'SELECT 1',
                '_AiDisplayStart': '0',
                '_AiDisplayLength': '10',
                '_AsEcho': 'True'
            }
        );
    }

    // 2. TnWebDMConsulta Path Injection
    console.log('\n=== 2. TnWebDMConsulta Path Injection ===');
    const paths = [
        'TnWebDMConsulta/Pegar/TnFpaDMFuncContrato/1',
        'TnWebDMConsulta/Pegar/TnFpaDMFuncContrato/CODIGOEMPRESA=1',
        'TnWebDMConsulta/Pegar/TnFpaDMFuncContrato?CODIGOEMPRESA=1'
    ];

    for (const p of paths) {
        await fetchWithLog(
            `Consulta Path (${p})`, 
            p, 
            'GET', 
            null, 
            null, 
            {},
            {}
        );
    }

    // 3. TnWebDMRelatorio Executar
    console.log('\n=== 3. TnWebDMRelatorio Executar ===');
    await fetchWithLog(
        `Relatorio Executar (TnFpaDMFuncContrato)`, 
        'TnWebDMRelatorio/Executar', 
        'GET', 
        null, 
        null, 
        {},
        {
            '_AActionName': 'TnFpaDMFuncContrato',
            '_ATipoRetorno': '1',
            '_AiDisplayStart': '0',
            '_AiDisplayLength': '10',
            '_AsEcho': 'True'
        }
    );
    
    // 4. TnWebDMIntegracao POST to Executar
    console.log('\n=== 4. TnWebDMIntegracao POST to Executar ===');
    await fetchWithLog(
        `Integracao POST Executar`, 
        'TnWebDMIntegracao/Executar', 
        'POST', 
        '_ASQL=SELECT 1', 
        { 'Content-Type': 'application/x-www-form-urlencoded' }, 
        {},
        {
            '_AActionName': 'ExecutarSQL'
        }
    );

    // 5. Trojan Horse in _AsEcho
    console.log('\n=== 5. Trojan Horse in _AsEcho ===');
    await fetchWithLog(
        `Trojan Horse _AsEcho`, 
        'TnWebDMConsulta/Pegar', 
        'GET', 
        null, 
        null, 
        {},
        {
            '_AActionName': 'TnFpaDMFuncContrato',
            '_AiDisplayStart': '0',
            '_AiDisplayLength': '10',
            '_AsEcho': "True' OR 1=1--"
        }
    );
}

// debugQuestorPhase235().catch(console.error);

// debugQuestorPhase236().catch(console.error);

// debugQuestorPhase237().catch(console.error);
// debugQuestorPhase238().catch(console.error);
// debugQuestorPhase239().catch(console.error);
// debugQuestorPhase240().catch(console.error);
// debugQuestorPhase241().catch(console.error);
// debugQuestorPhase242().catch(console.error);
// debugQuestorPhase243().catch(console.error);
// debugQuestorPhase244().catch(console.error);
// debugQuestorPhase245().catch(console.error);
// debugQuestorPhase246().catch(console.error);
// --- Phase 260: Port Scan ---
async function debugQuestorPhase260() {
    console.log('--- Debugging Questor Connectivity (Phase 260: Port Scan) ---');
    console.log('Target: hcs08305ayy.sn.mynetname.net');
    console.log('Objective: Find alternative ports if 9001 is a zombie instance.');
    
    // Config
    const host = 'http://hcs08305ayy.sn.mynetname.net';
    const ports = [80, 443, 8080, 8888, 9000, 9002, 9876, 3050]; // 3050 is Firebird/Interbase default
    
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Connection': 'close'
    };

    console.log(`Scanning ${ports.length} ports with 5s timeout...`);

    for (const port of ports) {
        const url = `${host}:${port}/`;
        const start = Date.now();
        
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
            
            console.log(`[SCAN] Port ${port}...`);
            
            const response = await fetch(url, { 
                method: 'GET', 
                headers: headers,
                signal: controller.signal 
            });
            clearTimeout(timeout);
            
            console.log(`[OPEN] Port ${port} -> Status: ${response.status}`);
            
        } catch (error: any) {
            // Differentiate between timeout (likely dropped/filtered) and connection refused (closed)
            const msg = error.message;
            if (msg.includes('aborted')) {
                console.log(`[FILTERED/TIMEOUT] Port ${port}`);
            } else if (msg.includes('ECONNREFUSED')) {
                console.log(`[CLOSED] Port ${port}`);
            } else {
                console.log(`[ERR] Port ${port}: ${msg}`);
            }
        }
    }
}

debugQuestorPhase260().catch(console.error);
