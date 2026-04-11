import { getDashboardFinanceiroData } from '../src/app/actions/integrations/omie-dashboard';

async function test() {
    console.log("Iniciando requisição...");
    try {
        const res = await getDashboardFinanceiroData(true);
        console.log("Res keys:", Object.keys(res || {}));
        if (res.error) {
            console.error("Erro:", res.error);
        } else {
            console.log("Sucesso! Data:");
            console.log("Extrato Total:", res.data?.blocoCaixa?.ultimos12Meses?.reduce((a: any, b: any) => a + b.value, 0));
            console.log("Contratos Ativos:", res.data?.blocoHonorarios?.numClientesAtivos);
        }
    } catch(e) {
        console.error(e);
    }
}
test();