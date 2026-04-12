import axios from 'axios';
import { getOmieConfig } from '../src/app/actions/integrations/omie-config';

async function main() {
  const config = await getOmieConfig();
  if (!config) return;

  const payloadNfse = {
    call: "ListarNFSEs",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      nPagina: 1,
      nRegPorPagina: 100,
      dEmiInicial: "01/01/2026",
      dEmiFinal: "31/12/2026",
      cStatusNFSe: "F"
    }]
  };

  try {
    const res = await axios.post('https://app.omie.com.br/api/v1/servicos/nfse/', payloadNfse);
    console.log('ListarNfse:', Object.keys(res.data));
    console.log('ListarNfse data:', JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.log('Error NFSe:', e.response?.data);
  }

  const payloadRecibo = {
    call: "ListarRecibos",
    app_key: config.app_key,
    app_secret: config.app_secret,
    param: [{
      nPagina: 1,
      nRegPorPagina: 10
    }]
  };

  try {
    const res2 = await axios.post('https://app.omie.com.br/api/v1/servicos/recibo/', payloadRecibo);
    console.log('ListarRecibo count:', res2.data.recibo?.length || res2.data.lista_recibos?.length);
    if (res2.data.recibo?.length > 0 || res2.data.lista_recibos?.length > 0) {
      const arr = res2.data.recibo || res2.data.lista_recibos;
      console.log('Sample Recibo:', JSON.stringify(arr[0].cabecalho, null, 2));
    }
  } catch (e: any) {
    console.log('Error Recibo:', e.response?.data);
  }
}
main();
