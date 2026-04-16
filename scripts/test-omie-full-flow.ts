import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
    const config = await getOmieConfig();
    if (!config) return console.log("no config");

    const BANCO_INTER_ID = 6700224052; // Banco Inter
    const CAIXINHA_ID = 6645569108; // Caixinha

    try {
        console.log("1. Incluindo titulo no Banco Inter...");
        const incPayload = {
            call: "IncluirContaReceber",
            app_key: config.app_key,
            app_secret: config.app_secret,
            param: [{
                codigo_lancamento_integracao: "TESTE" + Date.now(),
                codigo_cliente_fornecedor: 6753553555,
                data_vencimento: "30/04/2026",
                valor_documento: 50,
                codigo_categoria: "1.01.01",
                data_previsao: "30/04/2026",
                id_conta_corrente: BANCO_INTER_ID,
                observacao: "Teste de fluxo manual"
            }]
        };
        let titleId;
        try {
            const resInc = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', incPayload);
            titleId = resInc.data.codigo_lancamento_omie;
            console.log("INCLUIR RES:", titleId);
        } catch (e: any) {
            console.log("INCLUIR ERR:", e.response?.data || e.message);
            return;
        }

        console.log("1.5. Gerando Boleto no Banco Inter...");
        const boletoPayload = {
            call: "GerarBoleto",
            app_key: config.app_key,
            app_secret: config.app_secret,
            param: [{
                nCodTitulo: titleId
            }]
        };
        try {
            const resBol = await axios.post('https://app.omie.com.br/api/v1/financas/contareceberboleto/', boletoPayload);
            console.log("GERAR BOLETO RES:", resBol.data);
        } catch (e: any) {
            console.log("GERAR BOLETO ERR:", e.response?.data || e.message);
        }

        console.log("2. Tentando LancarRecebimento (com boleto ativo)...");
        const payloadData = {
            codigo_lancamento: titleId,
            codigo_conta_corrente: BANCO_INTER_ID,
            valor: 50,
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
        } catch (e: any) {
            const errStr = e.response?.data?.faultstring || e.message;
            console.log("RECEIVE ERR (Esperado conectada):", errStr);
        }

        console.log("3. Cancelando o boleto...");
        const payloadCancel = {
            call: "CancelarBoleto",
            app_key: config.app_key,
            app_secret: config.app_secret,
            param: [{ nCodTitulo: titleId }]
        };
        try {
            const resCancel = await axios.post('https://app.omie.com.br/api/v1/financas/contareceberboleto/', payloadCancel);
            console.log("CANCEL RES:", resCancel.data);
        } catch (e: any) {
            console.log("CANCEL ERR:", e.response?.data || e.message);
        }

        console.log("4. Tentando LancarRecebimento de novo (apos cancelamento)...");
        try {
            const resRec2 = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload);
            console.log("RECEIVE 2 RES:", resRec2.data);
        } catch (e: any) {
            console.log("RECEIVE 2 ERR:", e.response?.data || e.message);
        }

    } catch (err) {
        console.error(err);
    }
}
main();