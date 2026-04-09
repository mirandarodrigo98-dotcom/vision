'use server';

import axios from 'axios';
import db from '@/lib/db';
import { getOmieConfig } from './omie-config';
import { sendDigisacMessage, getDigisacConfig } from '@/app/actions/integrations/digisac';

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
    const clientesMap = new Map<number, string>();
    const cnpjMap = new Map<number, string>();
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
          cnpjMap.set(cli.codigo_cliente_omie, cli.cnpj_cpf || '');
        });
      } catch (err: any) {
        console.error("Erro ao buscar lote de clientes", err.response?.data || err.message);
        throw err;
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
      ccList.forEach((cc: any) => {
        // Ignorar contas inativas (se houver campo de inativo)
        if (cc.inativo === "S" || cc.cStatus === "I") return;
        contasCorrentesMap.set(cc.nIdCC || cc.nCodCC, cc.descricao || cc.cDescricao);
      });
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
        cnpj_cliente: cnpjMap.get(c.codigo_cliente_fornecedor) || '',
        nome_categoria: categoriasMap.get(catCode) || catCode || '-',
        nome_conta_corrente: contasCorrentesMap.get(c.id_conta_corrente) || c.id_conta_corrente || '-',
        numero_boleto: c.boleto?.cNumBancario || c.boleto?.cNumBoleto || c.numero_documento || '-',
        codigo_barras: c.codigo_barras_ficha_compensacao || c.boleto?.cCodigoBarras || '-',
        tipo_documento: TIPO_DOC_MAP[c.codigo_tipo_documento] || c.codigo_tipo_documento || c.tipo_documento || '-',
        valor_pago_calculado: valorPago,
        data_pagamento_calculada: dataPagamento
      };
    });

    return { 
      data: enrichedData,
      contasCorrentes: Array.from(contasCorrentesMap.entries()).map(([id, nome]) => ({ id, nome }))
    };
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

export async function lancarRecebimentoOmie(payloadData: any) {
  const config = await getOmieConfig();
  if (!config || !config.is_active || !config.app_key || !config.app_secret) {
    return { error: 'Credenciais da API Omie não configuradas ou inativas.' };
  }
  try {
    const payload = {
      call: "LancarRecebimento",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [payloadData]
    };
    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return { data: response.data };
  } catch (error: any) {
    console.error('Erro ao lançar recebimento:', error.response?.data || error.message);
    return { error: error.response?.data?.faultstring || 'Falha ao registrar o recebimento.' };
  }
}

export async function cancelarRecebimentoOmie(codigoBaixa: number) {
  const config = await getOmieConfig();
  if (!config || !config.is_active || !config.app_key || !config.app_secret) {
    return { error: 'Credenciais da API Omie não configuradas ou inativas.' };
  }
  try {
    const payload = {
      call: "CancelarRecebimento",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ codigo_baixa: codigoBaixa }]
    };
    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return { data: response.data };
  } catch (error: any) {
    console.error('Erro ao cancelar recebimento:', error.response?.data || error.message);
    return { error: error.response?.data?.faultstring || 'Falha ao cancelar o recebimento.' };
  }
}

export async function consultarContaReceberOmie(codigoLancamento: number) {
  const config = await getOmieConfig();
  if (!config || !config.is_active || !config.app_key || !config.app_secret) {
    return { error: 'Credenciais da API Omie não configuradas ou inativas.' };
  }
  try {
    const payload = {
      call: "ConsultarContaReceber",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ codigo_lancamento_omie: codigoLancamento }]
    };
    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return { data: response.data };
  } catch (error: any) {
    console.error('Erro ao consultar conta:', error.response?.data || error.message);
    return { error: error.response?.data?.faultstring || 'Falha ao consultar os detalhes da conta.' };
  }
}

export async function enviarBoletoDigisacOmie(conta: any) {
  try {
    const cnpjRaw = conta.cnpj_cliente || '';
    const cleanCnpj = cnpjRaw.replace(/[^0-9]/g, '');

    if (!cleanCnpj) {
      return { error: 'CNPJ/CPF do cliente não encontrado no título.' };
    }

    // 1. Encontrar o cliente localmente
    const company = await db.prepare("SELECT id, razao_social FROM client_companies WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ?").get(cleanCnpj) as any;

    if (!company) {
      return { error: `Cliente não encontrado no cadastro de empresas do Vision para o CNPJ/CPF ${cnpjRaw}.` };
    }

    // 2. Encontrar o contato Financeiro
    const phone = await db.prepare(`
      SELECT p.number, p.name
      FROM company_phones p
      JOIN contact_categories c ON p.category_id = c.id
      WHERE p.company_id = ? AND (c.name ILIKE '%Financeiro%' OR c.name ILIKE '%Todas%')
      LIMIT 1
    `).get(company.id) as any;

    if (!phone || !phone.number) {
      return { error: `Nenhum telefone com a categoria "Financeiro" ou "Todas" cadastrado para a empresa ${company.razao_social}.` };
    }

    // 3. Pegar URL do PDF do Boleto
    let pdfUrl = conta.cLinkBoleto;
    if (!pdfUrl) {
      const resBoleto = await obterBoletoOmie(conta.codigo_lancamento_omie);
      if (resBoleto.error || !resBoleto.data?.cLinkBoleto) {
        return { error: 'Não foi possível obter o PDF do boleto no Omie.' };
      }
      pdfUrl = resBoleto.data.cLinkBoleto;
    }

    // Fazer o download do PDF em Base64 para garantir envio no Digisac
    const pdfData = await downloadBoletoPdfServer(pdfUrl);
    if (pdfData.error || !pdfData.base64) {
      return { error: 'Não foi possível fazer o download do boleto para envio.' };
    }
    const base64File = `data:application/pdf;base64,${pdfData.base64}`;

    let fileName = 'boleto.pdf';
    try {
      const urlObj = new URL(pdfUrl);
      const pathParts = urlObj.pathname.split('/');
      const extracted = pathParts[pathParts.length - 1];
      if (extracted && extracted.endsWith('.pdf')) {
        fileName = extracted;
      } else {
        fileName = `boleto_${conta.codigo_lancamento_omie}.pdf`;
      }
    } catch (e) {
      fileName = `boleto_${conta.codigo_lancamento_omie}.pdf`;
    }

    // 4. Montar a mensagem
    const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor_documento || 0);
    const vencimento = conta.data_vencimento || '';

    const messageBody = `_Essa é uma mensagem automática_\n\nPrezado(a) *${phone.name}*.\nVocê está recebendo o boleto de Honorários Contábeis da empresa *${company.razao_social}* *${cnpjRaw}* no valor de *${valor}* com vencimento em *${vencimento}*.\nQualquer dúvida estamos à disposição através da Central de Atendimento (24) 3026-5648.\n\nDepartamento Financeiro`;

    const configDigisac = await getDigisacConfig();
    if (!configDigisac || !configDigisac.is_active || !configDigisac.connection_phone) {
      return { error: 'Integração Digisac inativa ou número de conexão não configurado.' };
    }

    // 5. Enviar via Digisac
    const result = await sendDigisacMessage({
      number: phone.number,
      serviceId: configDigisac.connection_phone,
      body: messageBody,
      base64File: base64File,
      fileName: fileName
    });

    if (!result.success) {
      return { error: result.error || 'Erro ao enviar via Digisac.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao enviar boleto via Digisac:', error);
    return { error: `Falha interna: ${error.message || String(error)}` };
  }
}

export async function enviarCobrancaDigisacOmie(conta: any) {
  try {
    const cnpjRaw = conta.cnpj_cliente || '';
    const cleanCnpj = cnpjRaw.replace(/[^0-9]/g, '');

    if (!cleanCnpj) {
      return { error: 'CNPJ/CPF do cliente não encontrado no título.' };
    }

    const company = await db.prepare("SELECT id, razao_social FROM client_companies WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = ?").get(cleanCnpj) as any;

    if (!company) {
      return { error: `Cliente não encontrado no cadastro de empresas do Vision para o CNPJ/CPF ${cnpjRaw}.` };
    }

    const phone = await db.prepare(`
      SELECT p.number, p.name
      FROM company_phones p
      JOIN contact_categories c ON p.category_id = c.id
      WHERE p.company_id = ? AND (c.name ILIKE '%Financeiro%' OR c.name ILIKE '%Todas%')
      LIMIT 1
    `).get(company.id) as any;

    if (!phone || !phone.number) {
      return { error: `Nenhum telefone com a categoria "Financeiro" ou "Todas" cadastrado para a empresa ${company.razao_social}.` };
    }

    const valor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(conta.valor_documento || 0);
    
    // Converter data de vencimento (geralmente YYYY-MM-DD ou DD/MM/YYYY) para DD/MM/YYYY
    let vencimento = conta.data_vencimento || '';
    if (vencimento.includes('-')) {
      const parts = vencimento.split('-');
      if (parts[0].length === 4) {
        vencimento = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }

    const messageBody = `_*Essa é uma mensagem automática. Não é necessário responder.*_

Olá *${phone.name}*.
Como vai? Esperamos que esteja bem!
Nosso sistema identificou que consta em aberto o boleto da empresa *${company.razao_social} - ${cnpjRaw}* no valor de *${valor}* vencido em *${vencimento}*.
Sabemos que imprevistos acontecem mas se o valor já tiver sido pago desconsidere essa mensagem.
Se precisar de nossa ajuda não hesite em nos contatar através da nossa Central de Atendimento (24) 3026-5648.

Atenciosamente
*NZD Contabilidade*
Departamento Financeiro`;

    const configDigisac = await getDigisacConfig();
    if (!configDigisac || !configDigisac.is_active || !configDigisac.connection_phone) {
      return { error: 'Integração Digisac inativa ou número de conexão não configurado.' };
    }

    // Enviar via Digisac (apenas texto)
    const result = await sendDigisacMessage({
      number: phone.number,
      serviceId: configDigisac.connection_phone,
      body: messageBody
    });

    if (!result.success) {
      return { error: result.error || 'Erro ao enviar cobrança via Digisac.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao enviar cobrança via Digisac:', error);
    return { error: `Falha interna: ${error.message || String(error)}` };
  }
}
