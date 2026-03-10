
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load envs
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL not found in environment');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

// --- Mock Helpers from utils/questor-companies ---

const parseQuestorNumber = (val: any): number => {
    if (!val) return 0;
    let numStr = String(val).trim();
    numStr = numStr.replace(/^R\$\s?/, '');

    if (numStr.includes(',') && numStr.includes('.')) {
        const lastDot = numStr.lastIndexOf('.');
        const lastComma = numStr.lastIndexOf(',');
        
        if (lastComma > lastDot) {
            numStr = numStr.replace(/\./g, '').replace(',', '.');
        } else {
            numStr = numStr.replace(/,/g, '');
        }
    } else if (numStr.includes(',')) {
        numStr = numStr.replace(',', '.');
    }
    
    numStr = numStr.replace(/[^\d.]/g, '');
    
    return parseFloat(numStr) || 0;
};

const cleanQuestorString = (val: any) => {
    if (!val) return '';
    let str = String(val);
    str = str.replace(/&nbsp;/g, ' ')
             .replace(/&nbsp/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&amp;nbsp;/g, ' ')
             .replace(/&NBSP;/g, ' ')
             .replace(/&NBSP/g, ' ');
    return str.replace(/\s+/g, ' ').trim();
};

const normalizeString = cleanQuestorString;

const get = (obj: any, keys: string[]) => {
    if (!obj) return undefined;
    
    for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') return obj[key];
        
        const lower = key.toLowerCase();
        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === lower);
        if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && String(obj[foundKey]).trim() !== '') return obj[foundKey];

        const foundSuffixKey = Object.keys(obj).find(k => k.toLowerCase().endsWith('.' + lower));
        if (foundSuffixKey && obj[foundSuffixKey] !== undefined && obj[foundSuffixKey] !== null && String(obj[foundSuffixKey]).trim() !== '') return obj[foundSuffixKey];
    }
    return undefined;
};

// --- Execution ---

async function run() {
    console.log('--- START QUESTOR NORMALIZATION CHECK ---');
    
    // 1. Get Config
    const res = await pool.query('SELECT * FROM questor_syn_config WHERE id = 1');
    const config = res.rows[0];
    
    if (!config) {
        console.error('Questor Config not found in DB');
        process.exit(1);
    }
    
    const baseUrl = config.internal_url || config.external_url || config.base_url;
    if (!baseUrl) {
        console.error('No Questor URL configured');
        process.exit(1);
    }
    
    const token = config.api_token;
    
    // 2. Execute Routine (POST)
    const routine = 'EmpresasVision';
    const params = { "E.CODIGOEMPRESA": "107" };
    
    let url = `${baseUrl.replace(/\/$/, '')}/TnWebDMProcesso/ProcessoExecutar?_AActionName=${routine}`;
    if (token) url += `&TokenApi=${encodeURIComponent(token)}`;
    
    console.log(`Executing routine ${routine} at ${url.replace(/TokenApi=[^&]+/, 'TokenApi=***')}...`);
    
    try {
        const fetchRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });
        
        if (!fetchRes.ok) {
            console.error(`Fetch failed: ${fetchRes.status} ${fetchRes.statusText}`);
            const text = await fetchRes.text();
            console.error('Body:', text);
            process.exit(1);
        }
        
        const json = await fetchRes.json();
        
        // Extract items like executeQuestorProcess does
        let items: any[] = [];
        try {
            const widgets = json.Widgets || {};
            // Flatten areas
            const areas = [];
            if (widgets.bottom) areas.push(...widgets.bottom);
            if (widgets.client) areas.push(...widgets.client);
            if (widgets.top) areas.push(...widgets.top); // Just in case
            
            for (const area of areas) {
                if (area.Itens) {
                    for (const item of area.Itens) {
                        if (item.grids) {
                            for (const grid of item.grids) {
                                const gridData = grid.items || grid.Items || grid.data || grid.Data;
                                if (Array.isArray(gridData)) {
                                    items = gridData;
                                    break;
                                }
                            }
                        }
                        if (items.length > 0) break;
                    }
                }
                if (items.length > 0) break;
            }
        } catch (e) {
             console.warn('Error traversing response structure', e);
        }

        if (items.length === 0) {
             // Fallback: maybe it's directly in ConjuntoDados like some routines?
             if (json.ConjuntoDados) items = json.ConjuntoDados;
             else if (json.conjuntoDados) items = json.conjuntoDados;
        }
        
        if (items.length === 0) {
            console.error('No items found in response');
            // Log structure keys to help debug
            console.log('JSON Keys:', Object.keys(json));
            if (json.Widgets) console.log('Widgets Keys:', Object.keys(json.Widgets));
            process.exit(1);
        }
        
        const companyRow = items[0];
        console.log('--- ROW DATA KEYS ---');
        console.log(Object.keys(companyRow).join(', '));
        
        console.log('--- TARGET VALUES ---');
        console.log('CAPITALSOCIAL:', companyRow['CAPITALSOCIAL']);
        console.log('DESCRTIPOLOGRAD:', companyRow['DESCRTIPOLOGRAD']);
        console.log('TIPOLOGRADOURO:', companyRow['TIPOLOGRADOURO']);
        
        // 3. Normalize
        const tipoLogradouro = normalizeString(get(companyRow, ['DESCRTIPOLOGRAD', 'TIPOLOGRADOURO', 'TIPO_LOGRADOURO', 'DS_TIPO_LOGRADOURO', 'TIPOLOGRAD', 'DS_TIPO', 'DSTIPOLOGRADOURO', 'TIPO', 'TIPOLOG', 'DSTIPOLOGRAD', 'DESCRICAOTIPO', 'TIPOENDERECO', 'TIPO_ENDERECO', 'DS_TIPO_LOGRAD', 'DS_TP_LOGRADOURO', 'TP_LOGRADOURO', 'NM_TIPO_LOGRADOURO', 'DESCRICAO_TIPO_LOGRADOURO', 'TIPO_LOGRAD', 'TP_LOGRAD']));
    
        const capitalSocialRaw = get(companyRow, ['CAPITALSOCIAL', 'CAPITAL', 'VALORCAPITAL', 'VLR_CAPITAL_SOCIAL', 'VL_CAPITAL', 'VALOR_CAPITAL', 'CAPITAL_SOCIAL', 'VLR_CAPITAL', 'CAPITAL_INTEGRALIZADO', 'VLR_CAPITAL_SOCIAL_ATUAL']);
        const capitalSocial = parseQuestorNumber(capitalSocialRaw);

        console.log('--- NORMALIZATION RESULTS ---');
        console.log('Extracted tipoLogradouro:', tipoLogradouro);
        console.log('Extracted capitalSocialRaw:', capitalSocialRaw);
        console.log('Extracted capitalSocial (parsed):', capitalSocial);

        if (!tipoLogradouro) console.error('FAIL: tipoLogradouro is empty');
        if (!capitalSocial) console.error('FAIL: capitalSocial is 0 or empty');
        if (tipoLogradouro && capitalSocial) console.log('SUCCESS: All fields extracted correctly');

    } catch (err) {
        console.error('Error executing fetch:', err);
    } finally {
        await pool.end();
    }
}

run();
