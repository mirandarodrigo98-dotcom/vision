
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars
import dotenv from 'dotenv';
const envPath = path.resolve(__dirname, '../../.env');
const envLocalPath = path.resolve(__dirname, '../../.env.local');

if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
} else {
    dotenv.config({ path: envPath });
}

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function debugQuestor() {
  console.log('--- Debugging Questor Connectivity (External URL Only) - Phase 67: SQL Endpoint Variations & Multipart ---');

  try {
    const res = await pool.query('SELECT * FROM questor_syn_config WHERE id = 1');
    const config = res.rows[0];
    
    if (!config || !config.external_url) {
      console.error('External URL not configured!');
      return;
    }

    let cleanUrl = config.external_url.replace(/\/$/, '');
    if (!cleanUrl.startsWith('http')) {
        cleanUrl = 'http://' + cleanUrl;
    }
    
    console.log(`Target Base URL: ${cleanUrl}`);

    const fetchWithLog = async (name: string, path: string, method: string = 'GET', body?: any, contentType?: string, queryParams?: URLSearchParams) => {
        let url = `${cleanUrl}/${path}`;
        
        // Default: Append TokenApi to Query String
        const qs = queryParams || new URLSearchParams();
        if (!qs.has('TokenApi')) {
            qs.append('TokenApi', config.api_token);
        }
        
        url += `?${qs.toString()}`;

        console.log(`\n[${name}] ${method} ${url}`);
        if (body && contentType !== 'multipart/form-data') {
             console.log(`  Body: ${typeof body === 'string' ? body.substring(0, 100) : 'Multipart/Binary or JSON'}...`);
        }
        
        const options: any = {
            method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json, text/plain, */*'
            },
            cache: 'no-store'
        };

        if (contentType && contentType !== 'multipart/form-data') {
             options.headers['Content-Type'] = contentType;
             options.body = body;
        } else if (contentType === 'multipart/form-data') {
            // Let fetch handle boundary
            options.body = body;
        } else if (body) {
            options.body = body;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);
            options.signal = controller.signal;

            const res = await fetch(url, options);
            clearTimeout(timeout);
            
            const text = await res.text();
            console.log(`  Status: ${res.status} ${res.statusText}`);
            
            let snippet = text.substring(0, 500).replace(/\r\n/g, '\n');
            console.log(`  Response: ${snippet}...`);
            
            return { status: res.status, text };
        } catch (e: any) {
            console.log(`  Error: ${e.message}`);
            return { error: e.message };
        }
    };

    const sql = "SELECT * FROM FUNC_CONTRATO WHERE CODIGOEMPRESA = 1";
    const type = 'nrwexJSON';
    
    // Phase 68: Focus on _AActionName and replicating success from TnWebDMConsulta
    console.log('--- Phase 68: _AActionName Fuzzing & Confirmation ---');

    // 1. Verify TnWebDMConsulta/Pegar (Known Good?)
    // Summary said it worked with _AActionName fuzzing.
    // Let's try to reproduce.
    const knownGoodEndpoint = 'TnWebDMConsulta/Pegar';
    console.log(`\n=== Verifying ${knownGoodEndpoint} ===`);
    const actionNames = ['Pegar', 'Consultar', 'Listar', 'Executar', 'Tabela', 'Geral', 'Questor', 'Empresa'];
    
    for (const name of actionNames) {
        let qs = new URLSearchParams();
        qs.append('_AActionName', name);
        // Maybe it needs other params?
        await fetchWithLog(`${knownGoodEndpoint} [_AActionName=${name}]`, knownGoodEndpoint, 'GET', null, undefined, qs);
    }

    // 2. Apply to TnWebDMDadosGerais/ExecutarSQL
    const targetEndpoint = 'TnWebDMDadosGerais/ExecutarSQL';
    console.log(`\n=== Testing ${targetEndpoint} with _AActionName ===`);
    
    const sqlActionNames = ['ExecutarSQL', 'Executar', 'SQL', 'Execute', 'Run', 'Query'];
    const paramNames = ['_AActionName', '_ActionName', '_AAction', 'Action', 'Method', '_Method'];

    for (const pName of paramNames) {
        for (const aName of sqlActionNames) {
            // Test GET
            let qs = new URLSearchParams();
            qs.append('_ASQL', sql);
            qs.append('_ATipoRetorno', type);
            qs.append(pName, aName);
            
            // Log less to avoid spam, but enough to see 200 vs 400
            // We rely on fetchWithLog to log status.
            await fetchWithLog(`${targetEndpoint} [GET ${pName}=${aName}]`, targetEndpoint, 'GET', null, undefined, qs);

            // Test POST Form
            let params = new URLSearchParams();
            params.append('_ASQL', sql);
            params.append('_ATipoRetorno', type);
            params.append(pName, aName);
            await fetchWithLog(`${targetEndpoint} [POST ${pName}=${aName}]`, targetEndpoint, 'POST', params.toString(), 'application/x-www-form-urlencoded');
        }
    }

    // 3. Test Generic 'Executar' endpoint on TnWebDMDadosGerais
    const genericEndpoint = 'TnWebDMDadosGerais/Executar';
    console.log(`\n=== Testing Generic ${genericEndpoint} ===`);
    for (const pName of paramNames) {
        for (const aName of sqlActionNames) {
             let params = new URLSearchParams();
            params.append('_ASQL', sql);
            params.append('_ATipoRetorno', type);
            params.append(pName, aName);
            await fetchWithLog(`${genericEndpoint} [POST ${pName}=${aName}]`, genericEndpoint, 'POST', params.toString(), 'application/x-www-form-urlencoded');
        }
    }

  } catch (error) {
    console.error('Script Error:', error);
  } finally {
      await pool.end();
  }
}

debugQuestor();
