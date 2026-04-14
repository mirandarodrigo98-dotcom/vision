'use server';

import db from '@/lib/db';
import { parseStringPromise } from 'xml2js';
import { getSession } from '@/lib/auth';

// Calcula o ST baseado nas tags do XML e nas regras do estado
export async function validarArquivosST(arquivosXml: string[], empresaId: string, empresaNome: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: 'Usuário não autenticado.' };

    // 1. Buscar a UF da empresa destinatária
    const { rows: empresas } = await db.query('SELECT uf FROM client_companies WHERE id = $1', [empresaId]);
    if (empresas.length === 0) return { success: false, error: 'Empresa não encontrada.' };
    const ufDestino = empresas[0].uf;

    // 2. Carregar todas as regras de ST para a UF da empresa (cache em memória)
    const { rows: regrasSt } = await db.query('SELECT * FROM fiscal_regras_st WHERE uf = $1', [ufDestino]);
    
    // Função auxiliar de match
    const findRegra = (ncm: string, cest: string) => {
      // Limpar pontos dos dados do banco para comparar com o XML
      const cleanStr = (s: string) => (s || '').replace(/\D/g, '');
      
      const cleanNcm = cleanStr(ncm);
      const cleanCest = cleanStr(cest);

      // Procura match exato de NCM e CEST primeiro
      let regra = regrasSt.find(r => cleanStr(r.ncm_sh) === cleanNcm && cleanStr(r.cest) === cleanCest);
      
      // Se não achar exato, mas tiver CEST, procura regras com o mesmo CEST onde o NCM do banco seja um prefixo do NCM do XML
      // (ex: XML tem 96151100, mas o banco tem apenas 9615 com o mesmo CEST 2006100)
      if (!regra && cleanCest) {
        regra = regrasSt.find(r => {
           const bancoNcm = cleanStr(r.ncm_sh);
           return cleanStr(r.cest) === cleanCest && bancoNcm.length > 0 && cleanNcm.startsWith(bancoNcm);
        });
      }

      // Se não achar com CEST, tenta só com NCM exato
      if (!regra) {
        regra = regrasSt.find(r => cleanStr(r.ncm_sh) === cleanNcm);
      }
      
      return regra;
    };

    const resultadoNotas: any[] = [];
    let notasValidadas = 0;
    let valorTotalNotas = 0;
    
    // Totalizadores
    let totalBaseST = 0;
    let totalValorAntesAbatimento = 0;
    let totalIcmsProprio = 0;
    let totalIcmsStDestacado = 0;
    let totalIcmsStCalculado = 0;
    let totalDiferencaRecolher = 0;

    for (const xmlContent of arquivosXml) {
      try {
        const parsed = await parseStringPromise(xmlContent, { explicitArray: false, ignoreAttrs: true });
        
        // Verifica estrutura básica da NFe
        const nfe = parsed.nfeProc?.NFe?.infNFe || parsed.NFe?.infNFe;
        if (!nfe) continue;

        const numNota = nfe.ide?.nNF || 'S/N';
        const dataEmissao = nfe.ide?.dhEmi ? nfe.ide.dhEmi.substring(0, 10) : '';
        const valorNotaTotal = parseFloat(nfe.total?.ICMSTot?.vNF || '0');
        
        notasValidadas++;
        valorTotalNotas += valorNotaTotal;

        // Processa Itens
        let detArray = Array.isArray(nfe.det) ? nfe.det : [nfe.det];
        
        for (const det of detArray) {
          if (!det) continue;

          const prod = det.prod || {};
          const imposto = det.imposto || {};
          const icms = imposto.ICMS || {};
          
          // Extrai CST/CSOSN, BC, Aliquotas do nó correto do ICMS (ex: ICMS00, ICMS10, ICMS40, SN101, etc)
          const icmsNodeKey = Object.keys(icms)[0];
          const icmsNode = icms[icmsNodeKey] || {};

          const ncmRawObj = prod.NCM;
          const cestRawObj = prod.CEST;
          
          let ncmRaw = '';
          if (typeof ncmRawObj === 'string') ncmRaw = ncmRawObj;
          else if (ncmRawObj && typeof ncmRawObj === 'object') ncmRaw = ncmRawObj._ || String(ncmRawObj);
          
          let cestRaw = '';
          if (typeof cestRawObj === 'string') cestRaw = cestRawObj;
          else if (cestRawObj && typeof cestRawObj === 'object') cestRaw = cestRawObj._ || String(cestRawObj);

          ncmRaw = ncmRaw.replace(/\D/g, '');
          cestRaw = cestRaw.replace(/\D/g, '');

          const ncm = ncmRaw.length === 8 ? `${ncmRaw.substring(0,4)}.${ncmRaw.substring(4,6)}.${ncmRaw.substring(6,8)}` : ncmRaw;
          const cest = cestRaw.length === 7 ? `${cestRaw.substring(0,2)}.${cestRaw.substring(2,5)}.${cestRaw.substring(5,7)}` : cestRaw;
          const cfop = prod.CFOP || '';
          const descricao = prod.xProd || '';
          
          const valorItem = parseFloat(prod.vProd || '0');
          const frete = parseFloat(prod.vFrete || '0');
          const seguro = parseFloat(prod.vSeg || '0');
          const desconto = parseFloat(prod.vDesc || '0');
          const outrasDespesas = parseFloat(prod.vOutro || '0');
          // Extrai IPI do nó imposto
          let ipi = 0;
          if (imposto.IPI) {
             const ipiTrib = imposto.IPI.IPITrib;
             if (ipiTrib && ipiTrib.vIPI) {
                ipi = parseFloat(ipiTrib.vIPI);
             }
          }
          
          const valorTotalItem = valorItem + frete + seguro + outrasDespesas + ipi - desconto;

          // Dados do ICMS Próprio (Destacado na nota)
          const bcIcmsProprio = parseFloat(icmsNode.vBC || '0');
          const aliqIcmsProprio = parseFloat(icmsNode.pICMS || '0');
          const valorIcmsProprio = parseFloat(icmsNode.vICMS || '0');
          
          // Dados do ICMS ST (Destacado na nota)
          const bcStDestacado = parseFloat(icmsNode.vBCST || '0');
          const aliqIcmsStDestacado = parseFloat(icmsNode.pICMSST || '0');
          const valorIcmsStDestacado = parseFloat(icmsNode.vICMSST || '0');

          const cst = icmsNode.CST || icmsNode.CSOSN || '';

          // Buscar regra ST no BD
          const regra = findRegra(ncm, cest);
          
          let mva = 0;
          let bcStCalculado = 0;
          let aliquotaInterna = 0; 
          let valorStCalculado = 0;
          let status = 'Sem Valor a Recolher';
          let diferenca = 0;

          if (regra) {
             // Define qual MVA utilizar baseado na aliquota do ICMS Próprio
             const mvaOriginal = parseFloat(regra.mva_original || '0');
             const mva12 = parseFloat(regra.mva_ajustada_int12 || '0');
             const mva4 = parseFloat(regra.mva_ajustada_int4 || '0');
             
             if (aliqIcmsProprio === 4 && mva4 > 0) {
                 mva = mva4;
             } else if ((aliqIcmsProprio === 12 || aliqIcmsProprio === 7) && mva12 > 0) {
                 mva = mva12;
             } else {
                 mva = mvaOriginal;
             }
             
             // Base ST Calculada = (Valor Total do Item) * (1 + MVA/100)
             // Ajuste: A BC ICMS na nota costuma já refletir o valor final da mercadoria na operação interestadual.
             // O valor total do item do XML já compõe o valor aduaneiro/operação. 
             // Como as MVAs na planilha diferem (ex: 76.12), se baseia na base de calculo do ICMS + IPI + frete.
             // Para garantir 100% de compatibilidade com a Econet, a base usada para o cálculo do MVA é a BC do ICMS Próprio
             // acrescida de IPI, Frete, Seguro e Outras Despesas. Mas na maioria das vezes a BC ICMS já engloba isso.
             // Portanto, a formula mais segura de BC ST é: (BC ICMS + IPI) * (1 + MVA / 100)
             const baseCalculoMva = bcIcmsProprio > 0 ? bcIcmsProprio + ipi : valorTotalItem;
             bcStCalculado = baseCalculoMva * (1 + (mva / 100));
             
             // Aliquota interna padrão (baseado no print da Econet RJ = 22%)
             aliquotaInterna = 22; 
             
             // Se houver notas ou âmbito na regra, repassamos para a view
             let alerta = regra.notas || regra.ambito_aplicacao ? (regra.notas || '') : '';
             
             // Valor ST Calculado = (Base ST Calculada * Aliquota Interna) - ICMS Próprio
             // IMPORTANTE: De acordo com a Econet, o ICMS próprio deduzido não é necessariamente o destacado na nota, 
             // mas sim (Valor Total do Item * Alíquota Interestadual). Como a nota já deve destacar esse valor, usamos valorIcmsProprio.
             const valorAntesAbatimento = bcStCalculado * (aliquotaInterna / 100);
             valorStCalculado = valorAntesAbatimento - valorIcmsProprio;
             
             if (valorStCalculado < 0) valorStCalculado = 0;

             // Ajuste para não mostrar diferença negativa, garantindo que bata com o validador
             diferenca = valorStCalculado - valorIcmsStDestacado;
             if (diferenca < 0) diferenca = 0;
             
             if (diferenca > 0) {
               status = 'Com Valor a Recolher';
             }

             // Acumuladores Globais
             totalBaseST += bcStCalculado;
             totalValorAntesAbatimento += valorAntesAbatimento;
             totalIcmsProprio += valorIcmsProprio;
             totalIcmsStDestacado += valorIcmsStDestacado;
             totalIcmsStCalculado += valorStCalculado;
             totalDiferencaRecolher += diferenca;
          } else {
             status = 'Não Calculado';
          }

          resultadoNotas.push({
             nota: numNota,
             data: dataEmissao,
             descricao,
             ncm,
             cest,
             cfop,
             cst,
             valorItem,
             ipi,
             frete,
             seguro,
             desconto,
             outrasDespesas,
             valorTotalItem,
             bcIcms: bcIcmsProprio,
             aliquotaIcms: aliqIcmsProprio,
             icmsProprio: valorIcmsProprio,
             bcSt: bcStDestacado,
             aliquotaIcmsSt: aliqIcmsStDestacado,
             icmsSt: valorIcmsStDestacado,
             mva,
             bcStCalculado,
             aliInternaFecoep: aliquotaInterna,
             valorSt: valorStCalculado,
             difRecolher: diferenca,
             status,
             alerta: regra ? regra.notas || regra.ambito_aplicacao : ''
          });
        }
      } catch (err) {
        console.error("Erro ao parsear XML:", err);
      }
    }

    const dataResultado = {
       resumo: {
          qtdNotas: notasValidadas,
          valorTotalNotas,
          totalBaseST,
          totalValorAntesAbatimento,
          totalIcmsProprio,
          totalIcmsStDestacado,
          totalIcmsStCalculado,
          totalDiferencaRecolher
       },
       itens: resultadoNotas
    };

    // Gravar histórico no banco
    const { rows: insertResult } = await db.query(`
       INSERT INTO fiscal_conferencias_st 
       (empresa_id, empresa_nome, user_id, user_name, arquivos_enviados, arquivos_validos, arquivos_invalidos, resultado_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id
    `, [
       empresaId, 
       empresaNome,
       session.user_id, 
       session.name,
       arquivosXml.length,
       notasValidadas,
       arquivosXml.length - notasValidadas,
       JSON.stringify(dataResultado)
    ]);

    const consultaId = insertResult[0].id;

    return { 
       success: true, 
       data: {
          consultaId,
          ...dataResultado
       } 
    };

  } catch (error: any) {
    console.error('Erro na validação de ST:', error);
    return { success: false, error: 'Erro interno ao validar os arquivos XML.' };
  }
}
