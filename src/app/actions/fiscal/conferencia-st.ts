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
      
      // Se não achar exato, mas tiver CEST, começa a varredura do NCM (do final para o início)
      if (!regra && cleanCest && cleanNcm.length > 2) {
         for (let i = cleanNcm.length - 1; i >= 2; i--) {
            const varreduraNcm = cleanNcm.substring(0, i);
            regra = regrasSt.find(r => cleanStr(r.cest) === cleanCest && cleanStr(r.ncm_sh) === varreduraNcm);
            if (regra) break; // Encontrou match, para a varredura
         }
      }

      // Se não achar com CEST exato, tenta encontrar a regra onde o NCM é exato mas o CEST tá um pouco diferente ou vazio (Fallback perigoso)
      // Como o CEST é mandatório para a ST, não deveriamos achar só pelo NCM a menos que o CEST esteja completamente ausente na nota
      if (!regra && !cleanCest) {
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
    let totalFecpSt = 0;
    let totalIcmsStPuro = 0;

    for (const xmlContent of arquivosXml) {
      try {
        const parsed = await parseStringPromise(xmlContent, { explicitArray: false, ignoreAttrs: true });
        
        // Verifica estrutura básica da NFe
        const nfe = parsed.nfeProc?.NFe?.infNFe || parsed.NFe?.infNFe;
        if (!nfe) continue;

        const numNota = nfe.ide?.nNF || 'S/N';
        const serieNota = nfe.ide?.serie || '';
        const dataEmissao = nfe.ide?.dhEmi ? nfe.ide.dhEmi.substring(0, 10) : '';
        const valorNotaTotal = parseFloat(nfe.total?.ICMSTot?.vNF || '0');
        const cnpjEmitente = nfe.emit?.CNPJ || nfe.emit?.CPF || '';
        
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
          let valorIcmsProprio = parseFloat(icmsNode.vICMS || '0');
          
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
          let fecpStCalculado = 0;
          let icmsStPuroCalculado = 0;
          let status = 'Sem Valor a Recolher';
          let diferenca = 0;
          let alerta = '';

          if (regra) {
             // Aliquota interna padrão (baseado no print da Econet RJ = 22%)
             aliquotaInterna = 22; 
             
             // Define qual MVA utilizar
             const mvaOriginal = parseFloat(regra.mva_original || '0');
             
             if (aliqIcmsProprio > 0 && aliqIcmsProprio < aliquotaInterna && mvaOriginal > 0) {
                 // Calcula MVA Ajustada dinamicamente com base na MVA Original e Alíquotas
                 // Fórmula: MVA Ajustada = { [(1 + MVA Original) * (1 - ALQ Inter) / (1 - ALQ Intra)] - 1 } * 100
                 const mvaDecimal = mvaOriginal / 100;
                 const alqInterDecimal = aliqIcmsProprio / 100;
                 const alqIntraDecimal = aliquotaInterna / 100;
                 
                 const mvaAjustadaDecimal = ((1 + mvaDecimal) * (1 - alqInterDecimal) / (1 - alqIntraDecimal)) - 1;
                 mva = Number((mvaAjustadaDecimal * 100).toFixed(2));
             } else {
                 mva = mvaOriginal;
             }
             
             // Base ST Calculada = (Valor Total do Item) * (1 + MVA/100)
             const baseCalculoMva = bcIcmsProprio > 0 ? bcIcmsProprio + ipi : valorTotalItem;
             bcStCalculado = baseCalculoMva * (1 + (mva / 100));
             
             // A Econet exige que o Valor do ICMS Próprio deduzido seja calculado exatamente sobre a BC do ICMS
             // em vez de confiar apenas no valor destacado na nota.
             valorIcmsProprio = (bcIcmsProprio > 0 ? bcIcmsProprio : valorTotalItem) * (aliqIcmsProprio / 100);

             // Se houver notas ou âmbito na regra, repassamos para a view
             alerta = '';
             if (regra.ambito_aplicacao) alerta += `[Âmbito] ${regra.ambito_aplicacao} `;
             if (regra.notas) alerta += `[Notas] ${regra.notas} `;
             if (regra.notas_econet) alerta += `[Econet] ${regra.notas_econet} `;
             alerta = alerta.trim();

             // Checagem de inteligência para ST Suspensa / MVA não recalculada / PMPF
             if (regra.notas_econet && regra.notas_econet.toUpperCase().includes('ST SUSPENSA')) {
                 mva = 0;
                 bcStCalculado = 0;
                 status = 'Isento/Suspenso';
                 alerta = `[ATENÇÃO] ST SUSPENSA: A Legislação suspende o regime de ST para este item. Verifique a vigência. ` + alerta;
             }

             if (regra.notas_econet && regra.notas_econet.toUpperCase().includes('PMPF')) {
                 alerta = `[ATENÇÃO] PMPF: A base de cálculo prioritária é o PMPF. A MVA listada é apenas subsidiária. ` + alerta;
             }
             
             // Valor ST Calculado = (Base ST Calculada * Aliquota Interna) - ICMS Próprio Calculado
             const valorAntesAbatimento = bcStCalculado * (aliquotaInterna / 100);
             valorStCalculado = valorAntesAbatimento - valorIcmsProprio;
             
             if (valorStCalculado < 0) valorStCalculado = 0;

             // Separação em FECP ST (2%) e ICMS ST Puro (20%)
             fecpStCalculado = bcStCalculado * (2 / 100);
             icmsStPuroCalculado = valorStCalculado - fecpStCalculado;
             if (icmsStPuroCalculado < 0) icmsStPuroCalculado = 0;

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
             totalFecpSt += fecpStCalculado;
             totalIcmsStPuro += icmsStPuroCalculado;
          } else {
             status = 'Não Calculado';
          }

          resultadoNotas.push({
             nota: numNota,
             serie: serieNota,
             cnpj_emitente: cnpjEmitente,
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
             fecp_st_calculado: fecpStCalculado,
             icms_st_puro_calculado: icmsStPuroCalculado,
             difRecolher: diferenca,
             status,
             alerta
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
          totalFecpSt,
          totalIcmsStPuro,
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
