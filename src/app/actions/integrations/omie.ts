'use server';

import axios from 'axios';
import { getOmieConfig } from './omie-config';

// Retorna as contas a receber do Omie
export async function listarContasReceber(dataEmissaoDe: string, dataEmissaoAte: string) {
  const config = await getOmieConfig();

  if (!config || !config.is_active || !config.app_key || !config.app_secret) {
    return { error: 'Credenciais da API Omie não configuradas ou inativas. Acesse Integrações > Omie para configurar.' };
  }

  const appKey = config.app_key;
  const appSecret = config.app_secret;

  try {
    const payload = {
      call: "ListarContasReceber",
      app_key: appKey,
      app_secret: appSecret,
      param: [
        {
          pagina: 1,
          registros_por_pagina: 500,
          apenas_importado_api: "N",
          filtrar_por_data_de: dataEmissaoDe,
          filtrar_por_data_ate: dataEmissaoAte,
          filtrar_apenas_inclusao: "S",
          exibir_resumo: "S"
        }
      ]
    };

    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    const contas = response.data.conta_receber_cadastro || [];
    if (contas.length === 0) return { data: [] };

    // 1. Extrair IDs únicos
    const clientesIds = [...new Set(contas.map((c: any) => c.codigo_cliente_fornecedor).filter(Boolean))];
    
    // 2. Buscar Clientes (em lotes de 50)
    const clientesMap = new Map();
    const lotesClientes = [];
    for (let i = 0; i < clientesIds.length; i += 50) {
      lotesClientes.push(clientesIds.slice(i, i + 50));
    }
    
    await Promise.all(lotesClientes.map(async (lote) => {
      try {
        const payloadCli = {
          call: "ListarClientes",
          app_key: appKey,
          app_secret: appSecret,
          param: [{
            pagina: 1,
            registros_por_pagina: 50,
            apenas_importado_api: "N",
            clientesPorCodigo: lote.map(id => ({ codigo_cliente_omie: id }))
          }]
        };
        const resCli = await axios.post('https://app.omie.com.br/api/v1/geral/clientes/', payloadCli);
        const clientesList = resCli.data.clientes_cadastro || [];
        clientesList.forEach((cli: any) => {
          clientesMap.set(cli.codigo_cliente_omie, cli.razao_social || cli.nome_fantasia);
        });
      } catch (err) {
        console.error("Erro ao buscar lote de clientes", err);
      }
    }));

    // 3. Buscar Categorias
    const categoriasMap = new Map();
    try {
      const payloadCat = {
        call: "ListarCategorias",
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina: 1, registros_por_pagina: 500 }]
      };
      const resCat = await axios.post('https://app.omie.com.br/api/v1/geral/categorias/', payloadCat);
      const catList = resCat.data.categoria_cadastro || [];
      catList.forEach((cat: any) => categoriasMap.set(cat.codigo, cat.descricao));
    } catch (err) {
      console.error("Erro ao buscar categorias", err);
    }

    // 4. Buscar Contas Correntes
    const contasCorrentesMap = new Map();
    try {
      const payloadCc = {
        call: "ListarContasCorrentes",
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina: 1, registros_por_pagina: 500, apenas_importado_api: "N" }]
      };
      const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
      const ccList = resCc.data.ListarContasCorrentes || resCc.data.conta_corrente_cadastro || resCc.data.ListarContasCorrentesResponse || [];
      ccList.forEach((cc: any) => contasCorrentesMap.set(cc.nIdCC, cc.descricao || cc.cDescricao));
    } catch (err) {
      console.error("Erro ao buscar contas correntes", err);
    }

    // 5. Enriquecer os dados
    const enrichedData = contas.map((c: any) => ({
      ...c,
      nome_cliente: clientesMap.get(c.codigo_cliente_fornecedor) || 'N/A',
      nome_categoria: categoriasMap.get(c.codigo_categoria) || c.codigo_categoria,
      nome_conta_corrente: contasCorrentesMap.get(c.id_conta_corrente) || c.id_conta_corrente,
      numero_boleto: c.numero_boleto || c.boleto?.cNumBoleto || '-'
    }));

    return { data: enrichedData };
  } catch (error: any) {
    const errorMsg = error.response?.data?.faultstring || error.message;
    console.error('Erro na integração Omie:', errorMsg);
    
    if (errorMsg && errorMsg.toLowerCase().includes('nenhum registro encontrado')) {
      return { data: [] };
    }
    
    return { error: 'Falha ao buscar as contas a receber no Omie. Verifique o período e as credenciais.' };
  }
}
