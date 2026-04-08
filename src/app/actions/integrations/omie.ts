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
          filtrar_apenas_inclusao: "S"
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
      ccList.forEach((cc: any) => contasCorrentesMap.set(cc.nIdCC || cc.nCodCC, cc.descricao || cc.cDescricao));
    } catch (err) {
      console.error("Erro ao buscar contas correntes", err);
    }

    // 5. Enriquecer os dados
    const enrichedData = contas.map((c: any) => {
      // O codigo da categoria pode vir na raiz ou dentro do array categorias
      const catCode = c.codigo_categoria || (c.categorias && c.categorias.length > 0 ? c.categorias[0].codigo_categoria : null);
      
      // O valor pago pode não vir explicitamente se não usarmos o exibir_resumo (que falha em algumas contas)
      // Vamos inferir que se está recebido, o valor pago é o valor do documento
      let valorPago = 0;
      let dataPagamento = null;
      
      if (c.status_titulo === 'RECEBIDO' || c.status_titulo === 'LIQUIDADO') {
        valorPago = c.valor_pago || c.valor_baixa || c.resumo?.valor_pago || c.valor_documento || 0;
        dataPagamento = c.data_pagamento || c.data_baixa || c.resumo?.data_pagamento || c.info?.dAlt || c.info?.dInc || null;
      }

      const TIPO_DOC_MAP: Record<string, string> = {
        'BOL': 'Boleto',
        'REC': 'Recibo',
        'NF': 'Nota Fiscal',
        'CHQ': 'Cheque',
        'DEP': 'Depósito',
        'TRA': 'Transferência',
        'DIN': 'Dinheiro',
        'CRT': 'Cartão',
        'PIX': 'Pix',
        'Boleto': 'Boleto',
        'Recibo': 'Recibo'
      };

      return {
        ...c,
        nome_cliente: clientesMap.get(c.codigo_cliente_fornecedor) || 'N/A',
        nome_categoria: categoriasMap.get(catCode) || catCode || '-',
        nome_conta_corrente: contasCorrentesMap.get(c.id_conta_corrente) || c.id_conta_corrente || '-',
        numero_boleto: c.boleto?.cNumBancario || c.boleto?.cNumBoleto || c.numero_documento || '-',
        codigo_barras: c.codigo_barras_ficha_compensacao || c.boleto?.cCodigoBarras || '-',
        tipo_documento: TIPO_DOC_MAP[c.codigo_tipo_documento] || c.codigo_tipo_documento || c.tipo_documento || '-',
        valor_pago_calculado: valorPago,
        data_pagamento_calculada: dataPagamento
      };
    });

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

export async function obterBoletoOmie(codigoLancamento: number) {
  const config = await getOmieConfig();

  if (!config || !config.is_active || !config.app_key || !config.app_secret) {
    return { error: 'Credenciais da API Omie não configuradas ou inativas.' };
  }

  try {
    const payload = {
      call: "GerarBoleto",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [
        {
          nCodTitulo: codigoLancamento
        }
      ]
    };

    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceberboleto/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    return { data: response.data };
  } catch (error: any) {
    console.error('Erro na integração Omie ao obter boleto:', error.response?.data || error.message);
    return { error: 'Falha ao obter o link do boleto no Omie.' };
  }
}

export async function downloadBoletoPdfServer(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Falha ao acessar o link do boleto');
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return { base64 };
  } catch (error: any) {
    console.error('Erro ao baixar PDF do boleto:', error);
    return { error: 'Falha ao baixar o PDF do boleto.' };
  }
}
