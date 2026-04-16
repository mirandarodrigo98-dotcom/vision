const axios = require('axios');
const { Pool } = require('pg');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const { rows } = await pool.query('SELECT * FROM omie_config WHERE id = 1');
    const config = rows[0];
    pool.end();

    try {
        const titleId = 7166017918;
        // Cancel boleto first
        try {
            const payloadCancel = {
                call: "CancelarBoleto",
                app_key: config.app_key,
                app_secret: config.app_secret,
                param: [{ nCodTitulo: titleId }]
            };
            const resCancel = await axios.post('https://app.omie.com.br/api/v1/financas/contareceberboleto/', payloadCancel);
            console.log("CANCEL RES:", resCancel.data);
        } catch (e) {
            console.log("CANCEL ERR:", e.response?.data || e.message);
        }

        // Try to receive WITH Banco Inter
        const payloadData1 = {
            codigo_lancamento: titleId,
            codigo_conta_corrente: 6700224052,
            valor: 10,
            data: "15/04/2026"
        };
        
        const payload1 = {
          call: "LancarRecebimento",
          app_key: config.app_key,
          app_secret: config.app_secret,
          param: [payloadData1]
        };
        
        try {
            const res1 = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload1);
            console.log("RECEBIMENTO:", res1.data);
        } catch (e1) {
            console.log("RECEBIMENTO ERROR:", e1.response?.data || e1.message);
        }
    } catch(e) {
        console.log("ERROR MSG:", e.message);
    }
}
main();