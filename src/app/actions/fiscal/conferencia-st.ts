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
      // Procura match exato de NCM e CEST primeiro
      let regra = regrasSt.find(r => r.ncm_sh === ncm && r.cest === cest);
      // Se não achar com CEST, tenta só com NCM
      if (!regra) {
        regra = regrasSt.find(r => r.ncm_sh === ncm);
      }
      // Tenta achar com os 4 primeiros digitos do NCM se não achar o exato
      if (!regra && ncm.length >= 4) {
         const ncmPrefix = ncm.substring(0, 4);
         regra = regrasSt.find(r => r.ncm_sh?.startsWith(ncmPrefix));
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

          const ncm = prod.NCM || '';
          const cest = prod.CEST || '';
          const cfop = prod.CFOP || '';
          const descricao = prod.xProd || '';
          
          const valorItem = parseFloat(prod.vProd || '0');
          const frete = parseFloat(prod.vFrete || '0');
          const seguro = parseFloat(prod.vSeg || '0');
          const desconto = parseFloat(prod.vDesc || '0');
          const outrasDespesas = parseFloat(prod.vOutro || '0');
          const ipi = parseFloat(imposto.IPI?.IPITrib?.vIPI || '0');
          
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
          let aliquotaInterna = 0; // Default, idealmente precisariamos saber a aliquota interna do estado para o produto
          let valorStCalculado = 0;
          let status = 'Sem Valor a Recolher';
          let diferenca = 0;

          if (regra) {
             // Simplificação: usando MVA original
             mva = parseFloat(regra.mva_original || '0');
             
             // Base ST Calculada = (Valor Total do Item) * (1 + MVA/100)
             bcStCalculado = valorTotalItem * (1 + (mva / 100));
             
             // Aliquota interna padrão de PE/SP/RJ (apenas simulação)
             aliquotaInterna = 18; // 18% + 2% FECOEP = 20%
             
             // Se houver notas ou âmbito na regra, repassamos para a view
             let alerta = regra.notas || regra.ambito_aplicacao ? (regra.notas || '') : '';
             
             // Valor ST Calculado = (Base ST Calculada * Aliquota Interna) - ICMS Próprio
             const valorAntesAbatimento = bcStCalculado * (aliquotaInterna / 100);
             valorStCalculado = valorAntesAbatimento - valorIcmsProprio;
             
             if (valorStCalculado < 0) valorStCalculado = 0;

             diferenca = valorStCalculado - valorIcmsStDestacado;
             
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
