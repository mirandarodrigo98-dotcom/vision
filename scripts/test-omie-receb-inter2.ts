import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
    const config = await getOmieConfig();
    if (!config) return console.log("no config");

    try {
        const titleId = 7166017918; 
        
        console.log("Tentando alterar a conta do titulo para a conta Vision...");
        const payloadAlter = {
            call: "AlterarContaReceber",
            app_key: config.app_key,
            app_secret: config.app_secret,
            param: [{
                codigo_lancamento_omie: titleId,
                id_conta_corrente: 6700224052
            }]
        };
        try {
            const resAlter = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadAlter);
            console.log("ALTER RES:", resAlter.data);
        } catch (e) {
            console.log("ALTER ERR:", e.response?.data || e.message);
        }

        console.log("Tentando LancarRecebimento...");
        const payloadData = {
            codigo_lancamento: titleId,
            codigo_conta_corrente: 6700224052,
            valor: 10,
            data: "15/04/2026",
            observacao: "Teste de recebimento"
        };
        const payload = {
            call: "LancarRecebimento",
            app_key: config.app_key,
            app_secret: config.app_secret,
            param: [payloadData]
        };
        try {
            const resRec = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
            console.log("RECEIVE RES:", resRec.data);
        } catch (e) {
            console.log("RECEIVE ERR:", e.response?.data || e.message);
        }

    } catch (err) {
        console.error(err);
    }
}
main();