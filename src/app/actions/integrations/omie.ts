'use server';

import axios from 'axios';
import db from '@/lib/db';
import { getOmieConfig } from './omie-config';
import { sendDigisacMessage, getDigisacConfig } from '@/app/actions/integrations/digisac';

// Retorna as contas a receber do Omie
export async function listarContasReceber(dataEmissaoDe: string, dataEmissaoAte: string, companyId: number = 1) {
  const config = await getOmieConfig(companyId);

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
        
        // Exibir no modal apenas as contas que possuem a palavra "Vision" ou "vision" na observação
        const obs = (cc.observacao || '').toLowerCase();
        if (!obs.includes('vision')) return;
        
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

export async function obterBoletoOmie(codigoLancamento: number, companyId: number = 1) {
  const config = await getOmieConfig(companyId);

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
    // IMPORTANTE: NÃO enviar User-Agent de navegador (ex: Mozilla/5.0...) 
    // pois a API/Portal do Omie detecta navegadores e retorna uma página HTML (Visualizador) em vez do arquivo PDF binário.
    let response = await fetch(url, {
      headers: {
        'Accept': 'application/pdf, application/octet-stream, */*'
      }
    });

    if (!response.ok) throw new Error(`Falha ao acessar o link do boleto. Status: ${response.status}`);
    
    let contentType = response.headers.get('content-type') || '';
    
    // Se por acaso o Omie retornar HTML mesmo sem User-Agent (ex: tela de visualização do boleto),
    // vamos varrer o HTML em busca do link real do PDF (geralmente em um iframe ou variável)
    if (contentType.includes('text/html')) {
      const htmlText = await response.text();
      // O Omie geralmente coloca o link do PDF dentro de um iframe com id "pdf" ou src="...pdf"
      const pdfMatch = htmlText.match(/<iframe[^>]+src=["']([^"']+\.pdf[^"']*)["']/i) 
                    || htmlText.match(/window\.location\.href\s*=\s*["']([^"']+\.pdf[^"']*)["']/i)
                    || htmlText.match(/https?:\/\/[^"'\s>]+\.pdf/i);
                    
      if (pdfMatch && pdfMatch[1]) {
         let realPdfUrl = pdfMatch[1];
         if (!realPdfUrl.startsWith('http')) {
             const urlObj = new URL(url);
             realPdfUrl = `${urlObj.protocol}//${urlObj.host}${realPdfUrl.startsWith('/') ? '' : '/'}${realPdfUrl}`;
         }
         response = await fetch(realPdfUrl, {
           headers: { 'Accept': 'application/pdf, application/octet-stream, */*' }
         });
         if (!response.ok) throw new Error(`Falha ao baixar o PDF real extraído do HTML. Status: ${response.status}`);
      } else {
         console.warn('Aviso: O link retornou HTML, mas não encontramos um link de PDF válido dentro dele.');
         // Tentar prosseguir, mas provavelmente vai dar erro no cabeçalho PDF
         response = await fetch(url, { headers: { 'Accept': '*/*' }}); 
      }
    } else {
      // Se não for HTML, precisamos pegar o arrayBuffer da resposta que já temos
      // Mas como a resposta é um stream consumível, se tivéssemos lido como text(), não poderíamos ler como arrayBuffer.
      // Como não lemos ainda, está seguro.
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // Validar se o buffer realmente parece ser um PDF
    const buffer = Buffer.from(arrayBuffer);
    const header = buffer.subarray(0, 5).toString('utf-8');
    if (header !== '%PDF-') {
      console.warn('Aviso crítico: O arquivo baixado do Omie não possui cabeçalho de PDF padrão. Pode ser uma página HTML de erro ou redirecionamento.', header);
      return { 
        error: 'O link do boleto no Omie não retornou um arquivo PDF válido.', 
        fallbackUrl: url 
      };
    }

    const base64 = buffer.toString('base64');
    return { base64 };
  } catch (error: any) {
    console.error('Erro ao baixar PDF do boleto:', error);
    return { error: 'Falha ao baixar o PDF do boleto.' };
  }
}

export async function cancelarBoletoTituloOmie(codigoLancamento: number, companyId: number = 1) {
  const config = await getOmieConfig(companyId);
  if (!config || !config.is_active || !config.app_key || !config.app_secret) return { error: 'Configuração Omie inválida' };

  try {
    const payload = {
      call: "CancelarBoleto",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ nCodTitulo: codigoLancamento }]
    };
    const response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceberboleto/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error('Erro ao cancelar boleto do título:', error.response?.data || error.message);
    return { error: error.response?.data?.faultstring || 'Falha ao cancelar boleto.' };
  }
}

export async function lancarRecebimentoOmie(payloadData: any, companyId: number = 1) {
  const config = await getOmieConfig(companyId);
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
    let response;
    
    try {
      response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (apiError: any) {
      const faultstring = apiError.response?.data?.faultstring || '';
      
      // Se a conta for integrada (ex: Banco Inter) e tiver boleto, o Omie bloqueia a baixa manual.
      // O procedimento padrão do Omie é cancelar o boleto antes de permitir o recebimento.
      if (faultstring.includes('não é permitido que recebimentos manuais') || faultstring.includes('conectada')) {
        console.log('Detectado bloqueio de conta integrada. Tentando bypass (cancelar boleto e alterar conta)...');
        
        const cancelResult = await cancelarBoletoTituloOmie(payloadData.codigo_lancamento, companyId);
        if (cancelResult.error) {
           console.log('Boleto não pôde ser cancelado ou já estava cancelado:', cancelResult.error);
           // Continuamos mesmo assim, pois o boleto pode não existir, e o problema ser apenas a conta do título
        } else {
           console.log('Boleto cancelado com sucesso.');
        }
        
        console.log('Alterando a conta do título para a conta selecionada para permitir a baixa...');
        try {
          const payloadAlter = {
            call: "AlterarContaReceber",
            app_key: config.app_key,
            app_secret: config.app_secret,
            param: [{
                codigo_lancamento_omie: payloadData.codigo_lancamento,
                id_conta_corrente: payloadData.codigo_conta_corrente
            }]
          };
          await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadAlter, {
            headers: { 'Content-Type': 'application/json' }
          });
          console.log('Conta do título alterada com sucesso.');
        } catch (alterError: any) {
          console.error('Falha ao alterar a conta do título:', alterError.response?.data || alterError.message);
          // Lança o erro original se a alteração falhar, pois a baixa também vai falhar
          throw apiError; 
        }

        console.log('Retentando o recebimento...');
        // Retenta o lançamento do recebimento após o cancelamento do boleto e alteração da conta
        response = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payload, {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        throw apiError;
      }
    }
    
    // Armazenar localmente o codigo_baixa gerado pelo Vision para possibilitar o cancelamento futuro
    if (response.data && response.data.codigo_baixa && payloadData.codigo_lancamento) {
      try {
        await db.query(`
          INSERT INTO omie_recebimentos (codigo_lancamento, codigo_baixa, valor, data)
          VALUES ($1, $2, $3, NOW())
        `, [payloadData.codigo_lancamento, response.data.codigo_baixa, payloadData.valor]);
      } catch (err) {
        console.error('Erro ao salvar codigo_baixa localmente:', err);
      }
    }
    
    return { data: response.data };
  } catch (error: any) {
    console.error('Erro ao lançar recebimento:', error.response?.data || error.message);
    return { error: error.response?.data?.faultstring || 'Falha ao registrar o recebimento.' };
  }
}

export async function getOmieBankSyncStatus(companyId: number = 1) {
  const config = await getOmieConfig(companyId);
  if (!config || !config.is_active || !config.app_key || !config.app_secret) return null;

  try {
    const payload = {
      call: "ListarContasCorrentes",
      app_key: config.app_key,
      app_secret: config.app_secret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };

    const response = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const ccList = response.data.ListarContasCorrentes || [];
    
    // Filtramos apenas as contas de interesse ativas
    const targetBanks = ccList.filter((c: any) => 
      c.inativo !== "S" && 
      (c.descricao.toLowerCase().includes('itau') || 
       c.descricao.toLowerCase().includes('itaú') || 
       c.codigo_banco === '341' || 
       c.descricao.toLowerCase().includes('inter') || 
       c.codigo_banco === '077')
    );

    // Agora precisamos buscar a data real da última movimentação de cada conta
    const result = [];
    for (const bank of targetBanks) {
        let lastSyncDate = bank.data_alt || bank.saldo_data || '-';
        let lastSyncTime = bank.hora_alt || '-';
        
        try {
            // Buscamos os lançamentos recentes desta conta corrente
            const today = new Date();
            const pastDate = new Date();
            pastDate.setDate(today.getDate() - 30); // Busca últimos 30 dias para não pesar
            
            const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            
            const extratoPayload = {
              call: "ListarExtrato",
              app_key: config.app_key,
              app_secret: config.app_secret,
              param: [{ 
                  nCodCC: bank.nCodCC,
                  dPeriodoInicial: formatDate(pastDate),
                  dPeriodoFinal: formatDate(today)
              }]
            };

            const extratoRes = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', extratoPayload, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            let records = extratoRes.data.listaMovimentos || [];
            if (records.length > 0) {
                // Filtramos para não considerar saldos previstos (que não têm hora de inclusão real)
                const validRecords = records.filter((r: any) => r.cDataInclusao && r.cHoraInclusao);
                
                if (validRecords.length > 0) {
                    validRecords.sort((a: any, b: any) => {
                        const parseDate = (d: string) => d ? d.split('/').reverse().join('') : '';
                        const dateA = parseDate(a.cDataInclusao);
                        const dateB = parseDate(b.cDataInclusao);
                        if (dateA !== dateB) {
                            return dateA < dateB ? 1 : -1;
                        }
                        const hrA = a.cHoraInclusao || '';
                        const hrB = b.cHoraInclusao || '';
                        return hrA < hrB ? 1 : -1;
                    });
                    
                    const latest = validRecords[0];
                    lastSyncDate = latest.cDataInclusao;
                    lastSyncTime = latest.cHoraInclusao;
                }
            }
        } catch (e) {
            // Se falhar (ex: nenhum título encontrado), mantemos a data de alteração básica da CC
            console.log(`Fallback de data para banco ${bank.descricao} - Sem lançamentos recentes.`);
        }

        result.push({
            banco: bank.descricao,
            agencia: bank.codigo_agencia,
            conta: bank.numero_conta_corrente,
            data_alt: lastSyncDate,
            hora_alt: lastSyncTime
        });
    }

    return result;
  } catch (error: any) {
    console.error('Erro ao buscar contas correntes do Omie:', error.response?.data || error.message);
    return null;
  }
}

export async function cancelarRecebimentoOmie(codigoBaixa: number, companyId: number = 1) {
  const config = await getOmieConfig(companyId);
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
    
    // Limpar localmente o codigo_baixa após o cancelamento
    try {
      await db.query(`DELETE FROM omie_recebimentos WHERE codigo_baixa = $1`, [codigoBaixa]);
    } catch (err) {
      console.error('Erro ao remover codigo_baixa localmente:', err);
    }
    
    return { data: response.data };
  } catch (error: any) {
    console.error('Erro ao cancelar recebimento:', error.response?.data || error.message);
    return { error: error.response?.data?.faultstring || 'Falha ao cancelar o recebimento.' };
  }
}

export async function consultarContaReceberOmie(codigoLancamento: number, companyId: number = 1) {
  const config = await getOmieConfig(companyId);
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
    
    const data = response.data;
    
    // Obter os recebimentos registrados localmente pelo Vision
    try {
      const localRecebimentos = (await db.query(`SELECT codigo_baixa, valor, data FROM omie_recebimentos WHERE codigo_lancamento = $1 ORDER BY data DESC`, [codigoLancamento])).rows as any[];
      if (localRecebimentos.length > 0) {
        data.local_recebimentos = localRecebimentos;
      }
    } catch (err) {
      console.error('Erro ao buscar recebimentos locais:', err);
    }
    
    return { data };
  } catch (error: any) {
    console.error('Erro ao consultar conta:', error.response?.data || error.message);
    return { error: error.response?.data?.faultstring || 'Falha ao consultar os detalhes da conta.' };
  }
}

export async function enviarBoletoDigisacOmie(conta: any, companyId: number = 1) {
  try {
    const cnpjRaw = conta.cnpj_cliente || '';
    const cleanCnpj = cnpjRaw.replace(/[^0-9]/g, '');

    if (!cleanCnpj) {
      return { error: 'CNPJ/CPF do cliente não encontrado no título.' };
    }

    // 1. Encontrar o cliente localmente
    const company = (await db.query(`SELECT id, razao_social FROM client_companies WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = $1`, [cleanCnpj])).rows[0] as any;

    if (!company) {
      return { error: `Cliente não encontrado no cadastro de empresas do Vision para o CNPJ/CPF ${cnpjRaw}.` };
    }

    // 2. Encontrar o contato Financeiro
    const phone = (await db.query(`
      SELECT p.number, p.name
      FROM company_phones p
      JOIN contact_categories c ON p.category_id = c.id
      WHERE p.company_id = $1 AND (c.name ILIKE '%Financeiro%' OR c.name ILIKE '%Todas%')
      LIMIT 1
    `, [company.id])).rows[0] as any;

    if (!phone || !phone.number) {
      return { error: `Nenhum telefone com a categoria "Financeiro" ou "Todas" cadastrado para a empresa ${company.razao_social}.` };
    }

    // 3. Pegar URL do PDF do Boleto
    let pdfUrl = conta.cLinkBoleto;
    if (!pdfUrl) {
      const resBoleto = await obterBoletoOmie(conta.codigo_lancamento_omie, companyId);
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
      contactName: phone.name,
      body: null, // Separar o corpo para não dar 500 no Digisac
      base64File: base64File,
      fileName: fileName
    });

    if (!result.success) {
      return { error: result.error || 'Erro ao enviar boleto (PDF) via Digisac.' };
    }

    const resultMsg = await sendDigisacMessage({
      number: phone.number,
      serviceId: configDigisac.connection_phone,
      body: messageBody
    });

    if (!resultMsg.success) {
      return { error: resultMsg.error || 'Erro ao enviar mensagem via Digisac.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao enviar boleto via Digisac:', error);
    return { error: `Falha interna: ${error.message || String(error)}` };
  }
}

export async function enviarCobrancaDigisacOmie(conta: any, companyId: number = 1) {
  try {
    const cnpjRaw = conta.cnpj_cliente || '';
    const cleanCnpj = cnpjRaw.replace(/[^0-9]/g, '');

    if (!cleanCnpj) {
      return { error: 'CNPJ/CPF do cliente não encontrado no título.' };
    }

    const company = (await db.query(`SELECT id, razao_social FROM client_companies WHERE REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', '') = $1`, [cleanCnpj])).rows[0] as any;

    if (!company) {
      return { error: `Cliente não encontrado no cadastro de empresas do Vision para o CNPJ/CPF ${cnpjRaw}.` };
    }

    const phone = (await db.query(`
      SELECT p.number, p.name
      FROM company_phones p
      JOIN contact_categories c ON p.category_id = c.id
      WHERE p.company_id = $1 AND (c.name ILIKE '%Financeiro%' OR c.name ILIKE '%Todas%')
      LIMIT 1
    `, [company.id])).rows[0] as any;

    if (!phone || !phone.number) {
      return { error: `Nenhum telefone com a categoria "Financeiro" ou "Todas" cadastrado para a empresa ${company.razao_social}.` };
    }

    // 3. Pegar URL do PDF do Boleto
    let pdfUrl = conta.cLinkBoleto;
    if (!pdfUrl) {
      const resBoleto = await obterBoletoOmie(conta.codigo_lancamento_omie, companyId);
      if (resBoleto.error || !resBoleto.data?.cLinkBoleto) {
        return { error: 'Não foi possível obter o PDF do boleto no Omie.' };
      }
      pdfUrl = resBoleto.data.cLinkBoleto;
    }

    const configDigisac = await getDigisacConfig();
    if (!configDigisac || !configDigisac.is_active || !configDigisac.connection_phone) {
      return { error: 'Integração Digisac inativa ou número de conexão não configurado.' };
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

    let messageBody = `_*Essa é uma mensagem automática. Não é necessário responder.*_

Olá *${phone.name}*.
Como vai? Esperamos que esteja bem!
Nosso sistema identificou que consta em aberto o boleto da empresa *${company.razao_social} - ${cnpjRaw}* no valor de *${valor}* vencido em *${vencimento}*.
Sabemos que imprevistos acontecem mas se o valor já tiver sido pago desconsidere essa mensagem.
Se precisar de nossa ajuda não hesite em nos contatar através da nossa Central de Atendimento (24) 3026-5648.

Atenciosamente
*NZD Contabilidade*
Departamento Financeiro`;

    // Fazer o download do PDF em Base64 para garantir envio no Digisac
    const pdfData = await downloadBoletoPdfServer(pdfUrl);
    
    // Se não conseguimos o PDF em binário, enviamos apenas a mensagem de texto com o link.
    if (pdfData.error && pdfData.fallbackUrl) {
       messageBody += `\n\nAcesse o seu boleto através deste link: ${pdfData.fallbackUrl}`;
       
       const resultMsg = await sendDigisacMessage({
         number: phone.number,
         serviceId: configDigisac.connection_phone,
         body: messageBody
       });

       if (!resultMsg.success) {
         return { error: resultMsg.error || 'Erro ao enviar a cobrança via Digisac.' };
       }

       return { success: true, warning: 'Boleto enviado como link, pois o banco bloqueou o download do arquivo PDF direto.' };
    } else if (pdfData.error || !pdfData.base64) {
      return { error: pdfData.error || 'Não foi possível fazer o download do boleto para envio.' };
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
         fileName = `boleto_atrasado_${conta.codigo_lancamento_omie}.pdf`;
       }
     } catch (e) {
       fileName = `boleto_atrasado_${conta.codigo_lancamento_omie}.pdf`;
     }

     // Enviar via Digisac (Primeiro o arquivo sem texto, depois a mensagem - mais seguro)
    // A API Digisac dá 500 às vezes quando junta "file" grande e "text" longo
    const resultFile = await sendDigisacMessage({
      number: phone.number,
      serviceId: configDigisac.connection_phone,
      contactName: phone.name,
      body: null, // Força a mensagem ser separada
      base64File: base64File,
      fileName: fileName
    });

    if (!resultFile.success) {
      return { error: resultFile.error || 'Erro ao anexar o PDF da cobrança via Digisac.' };
    }

    const resultMsg = await sendDigisacMessage({
      number: phone.number,
      serviceId: configDigisac.connection_phone,
      body: messageBody
    });

    if (!resultMsg.success) {
      return { error: resultMsg.error || 'Erro ao enviar o texto da cobrança via Digisac.' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao enviar cobrança via Digisac:', error);
    return { error: `Falha interna: ${error.message || String(error)}` };
  }
}
