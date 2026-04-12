'use server';

import axios from 'axios';
import { getOmieConfig } from './omie-config';
import db from '@/lib/db';

const CATEGORIAS_RECEITAS_TOTAIS = [
  'Honorários Contábeis', 'Honorários Contábeis Anual', 'Sistemas', 
  'Certificado Digital', 'Honorários Doméstica', 'Comissões', 
  'Legalização', 'Imposto de Renda', 'MEI', 'Honorários Renegociados', 
  'Perícia', 'Serviços Avulsos', 'BPO Financeiro'
];

const CATEGORIAS_HONORARIOS = [
  'Honorários Contábeis', 'Honorários Contábeis Anual', 'Honorários Doméstica'
];

const CONTAS_ATIVAS = ['Cora', 'Inter', 'Itaú', 'Caixa Econômica', 'Caixinha'];

export async function getDashboardFinanceiroData(forceRefresh = false, fullRefresh = false) {
  let cachedDataRaw: any = null;
  const now = new Date();
  
  if (!forceRefresh) {
    try {
      const cached = (await db.query('SELECT data, updated_at FROM omie_dashboard_cache WHERE id = 1', [])).rows[0];
      if (cached && cached.data) {
        const lastUpdate = new Date(cached.updated_at);
        // Regra de recarga automática às 6h da manhã
        // Se a hora atual for >= 6 e a última atualização for de antes das 6h de hoje, força recarga completa
        const today6AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6, 0, 0);
        if (now >= today6AM && lastUpdate < today6AM) {
          fullRefresh = true;
          forceRefresh = true;
        } else {
          return { success: true, data: cached.data, cached: true, updated_at: lastUpdate };
        }
      }
    } catch (e) {
      console.warn("Aviso: tabela de cache não encontrada ou erro de leitura.");
    }
  }
  
  if (forceRefresh && !fullRefresh) {
    // Se for atualização forçada, carregamos o cache para fazer atualização INCREMENTAL rápida
    try {
      const cached = (await db.query('SELECT data FROM omie_dashboard_cache WHERE id = 1', [])).rows[0];
      if (cached && cached.data) {
        cachedDataRaw = cached.data;
      }
    } catch (e) {}
  }

  const config = await getOmieConfig();

  if (!config || !config.is_active || !config.app_key || !config.app_secret) {
    return { error: 'Credenciais da API Omie não configuradas ou inativas.' };
  }

  const appKey = config.app_key;
  const appSecret = config.app_secret;

  try {
    // 1. Categorias e Contas Correntes
    const payloadCat = {
      call: "ListarCategorias",
      app_key: appKey,
      app_secret: appSecret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    let resCat: any;
    try {
      resCat = await axios.post('https://app.omie.com.br/api/v1/geral/categorias/', payloadCat);
    } catch (e: any) {
      console.log('Error Categ:', e.response?.data);
      resCat = { data: { categoria_cadastro: [] } };
    }
    const catList = resCat.data.categoria_cadastro || [];
    const categoriasMap = new Map();
    catList.forEach((cat: any) => categoriasMap.set(cat.codigo, cat.descricao));

    const payloadCc = {
      call: "ListarContasCorrentes",
      app_key: appKey,
      app_secret: appSecret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc).catch(e => {
      console.log('Error CC:', e.response?.data);
      return { data: { ListarContasCorrentes: [] } };
    });
    const ccList = resCc.data.ListarContasCorrentes || [];
    
    const contasAtivasIds: number[] = [];
    ccList.forEach((cc: any) => {
      const nome = cc.descricao || cc.cDescricao || '';
      if (CONTAS_ATIVAS.some(c => nome.toLowerCase().includes(c.toLowerCase()))) {
        contasAtivasIds.push(cc.nCodCC || cc.nIdCC);
      }
    });
    console.log('Contas ativas:', contasAtivasIds);

    const formatOmieDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const today = new Date();
    const thirteenMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 12, 1);
    
    // Se tivermos cache válido, só precisamos buscar os últimos 3 meses (mês atual, mês anterior e retrasado)
    // Isso reduz de 14 meses (5 requisições por conta) para 3 meses (1 requisição por conta)
    const dataDeBusca = (cachedDataRaw && cachedDataRaw.blocoCaixa && cachedDataRaw.blocoCompetencia)
      ? new Date(today.getFullYear(), today.getMonth() - 2, 1) 
      : thirteenMonthsAgo;
    
    const dataDeStr = formatOmieDate(dataDeBusca);
    const dataAte = new Date(today.getFullYear(), today.getMonth() + 1, 0); // fim do mês atual
    const dataAteStr = formatOmieDate(dataAte);

    // O Omie limita o ListarExtrato a um período máximo de cerca de 90 dias (3 meses) por requisição.
    const periodosExtrato: { de: string, ate: string }[] = [];
    let curDate = new Date(dataDeBusca.getTime());
    while (curDate <= dataAte) {
      const nextDate = new Date(curDate.getFullYear(), curDate.getMonth() + 3, 0); // avança 3 meses (fim do mês)
      const actualNext = nextDate > dataAte ? dataAte : nextDate;
      periodosExtrato.push({
        de: formatOmieDate(curDate),
        ate: formatOmieDate(actualNext)
      });
      curDate = new Date(actualNext.getFullYear(), actualNext.getMonth() + 1, 1);
    }

    // 2. RECEITAS TOTAIS RECEBIDAS (REGIME DE CAIXA) -> via ListarExtrato
    let todasReceitas: any[] = [];
    const extratoPromises: (() => Promise<any[]>)[] = [];
    
    for (const nCodCC of contasAtivasIds) {
      for (const periodo of periodosExtrato) {
        extratoPromises.push(async () => {
          const localReceitas: any[] = [];
          let nPaginaExtrato = 1;
          let totalPaginasExtrato = 1;
          
          while (nPaginaExtrato <= totalPaginasExtrato) {
            const payloadExtrato = {
              call: "ListarExtrato",
              app_key: appKey,
              app_secret: appSecret,
              param: [{
                nCodCC,
                dPeriodoInicial: periodo.de,
                dPeriodoFinal: periodo.ate,
                nPagina: nPaginaExtrato,
                nRegPorPagina: 500
              }]
            };
            let retryCount = 0;
            let success = false;
            while (retryCount < 3 && !success) {
              try {
                const resExtrato = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payloadExtrato);
                const extrato = resExtrato.data.listaMovimentos || resExtrato.data.listaExtrato || resExtrato.data.extrato || [];
                totalPaginasExtrato = resExtrato.data.nTotPaginas || 1;
                
                const receitas = extrato.filter((item: any) => {
                  if (item.cDesCliente === 'SALDO' || item.cDesCliente === 'SALDO ANTERIOR' || !item.cDesCategoria) return false;
                  if (item.cNatureza && item.cNatureza !== 'R') return false; 
                  const valor = item.nValorDocumento || 0;
                  if (valor <= 0) return false; 
                  const categoria = item.cDesCategoria || '';
                  return CATEGORIAS_RECEITAS_TOTAIS.some(c => categoria.toLowerCase().includes(c.toLowerCase()));
                });
                localReceitas.push(...receitas);
                success = true;
              } catch (err: any) {
                const errMsg = err.response?.data?.faultstring || '';
                if (errMsg.includes('NPAGINA')) {
                  try {
                    const payloadSemPagina = { ...payloadExtrato, param: [{ nCodCC, dPeriodoInicial: periodo.de, dPeriodoFinal: periodo.ate }] };
                    const resExtrato = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payloadSemPagina);
                    const extrato = resExtrato.data.listaMovimentos || [];
                    const receitas = extrato.filter((item: any) => {
                      if (item.cDesCliente === 'SALDO' || item.cDesCliente === 'SALDO ANTERIOR' || !item.cDesCategoria) return false;
                      if (item.cNatureza && item.cNatureza !== 'R') return false; 
                      const valor = item.nValorDocumento || 0;
                      if (valor <= 0) return false; 
                      const categoria = item.cDesCategoria || '';
                      return CATEGORIAS_RECEITAS_TOTAIS.some(c => categoria.toLowerCase().includes(c.toLowerCase()));
                    });
                    localReceitas.push(...receitas);
                    totalPaginasExtrato = 1; // force exit
                    success = true;
                  } catch (e2) {
                     retryCount++;
                     await new Promise(r => setTimeout(r, 1000));
                  }
                } else {
                  retryCount++;
                  if (retryCount >= 3) break;
                  await new Promise(r => setTimeout(r, 1000));
                }
              }
            }
            nPaginaExtrato++;
          }
          return localReceitas;
        });
      }
    }
    const extratoResults = [];
    console.log(`Starting extrato requests... Total promises: ${extratoPromises.length}`);
    for (let i = 0; i < extratoPromises.length; i++) {
      console.log(`Processing extrato ${i + 1} of ${extratoPromises.length}`);
      const res = await extratoPromises[i]();
      extratoResults.push(res);
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('Finished extrato requests');
    extratoResults.forEach(arr => todasReceitas.push(...arr));

    // 3. FATURAMENTO TOTAL (REGIME DE COMPETÊNCIA) -> via ListarFaturamento
    let todosFaturamentos: any[] = [];
    try {
      const faturamentoPromises: (() => Promise<any[]>)[] = [];
      for (const periodo of periodosExtrato) {
        faturamentoPromises.push(async () => {
          const payloadFaturamento = {
            call: "ListarFaturamento",
            app_key: appKey,
            app_secret: appSecret,
            param: [{
              pagina: 1,
              registros_por_pagina: 500,
              dPeriodoInicial: periodo.de,
              dPeriodoFinal: periodo.ate
            }]
          };
          let nPaginaFat = 1;
          let totalPaginasFat = 1;

          while (nPaginaFat <= totalPaginasFat) {
            let retryFat = 0;
            let fatSuccess = false;
            while (retryFat < 3 && !fatSuccess) {
              try {
                // Voltar para Contas a Receber, pois NFSe nem sempre é emitida.
                // O faturamento do contrato gera uma Conta a Receber (status_titulo pode ser RECEBIDO, EM ABERTO, etc).
                const resFaturamento = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', {
                  call: "ListarContasReceber",
                  app_key: appKey,
                  app_secret: appSecret,
                  param: [{
                    pagina: nPaginaFat,
                    registros_por_pagina: 500,
                    filtrar_por_data_de: periodo.de,
                    filtrar_por_data_ate: periodo.ate
                  }]
                });
                
                const contasReceber = resFaturamento.data.conta_receber_cadastro || [];
                totalPaginasFat = resFaturamento.data.total_de_paginas || 1;

                const filtrados = contasReceber.filter((item: any) => {
                  const valor = item.valor_documento || 0;
                  if (valor <= 0) return false;
                  // Filtrar apenas categorias de Faturamento
                  return item.categorias?.some((cat: any) => {
                    return CATEGORIAS_FATURAMENTO.some(c => cat.descricao?.toLowerCase().includes(c.toLowerCase()));
                  });
                });

                localFaturamentos.push(...filtrados.map((item: any) => ({
                  data: item.data_previsao || item.data_vencimento, 
                  valor: item.valor_documento
                })));
                fatSuccess = true;
              } catch (e: any) {
                retryFat++;
                if (retryFat >= 3) break;
                await new Promise(r => setTimeout(r, 1000));
              }
            }
            nPaginaFat++;
          }
          return localFaturamentos;
        });
      }
      
      const faturamentoResults = [];
      console.log(`Starting faturamento requests... Total promises: ${faturamentoPromises.length}`);
      for (let i = 0; i < faturamentoPromises.length; i++) {
        console.log(`Processing faturamento ${i + 1} of ${faturamentoPromises.length}`);
        const res = await faturamentoPromises[i]();
        faturamentoResults.push(res);
        await new Promise(r => setTimeout(r, 200));
      }
      console.log('Finished faturamento requests');
      faturamentoResults.forEach(arr => todosFaturamentos.push(...arr));
    } catch (e) {}

    // 4. CONTRATOS E TICKET MÉDIO (HONORÁRIOS CONTÁBEIS)
    let todosContratos: any[] = [];
    try {
      const payloadContratosBase = {
            call: "ListarContratos",
            app_key: appKey,
            app_secret: appSecret,
            param: [{ pagina: 1, registros_por_pagina: 100 }]
          };
      const resContratosBase = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', payloadContratosBase);
      const totalPaginasContratos = resContratosBase.data.total_de_paginas || 1;
      
      const contratosPromises: (() => Promise<any[]>)[] = [];
      for (let p = 1; p <= totalPaginasContratos; p++) {
        contratosPromises.push(async () => {
          const payload = {
            call: "ListarContratos",
            app_key: appKey,
            app_secret: appSecret,
            param: [{ pagina: p, registros_por_pagina: 100 }]
          };
          let retryCount = 0;
          while (retryCount < 3) {
            try {
              const res = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', payload);
              return res.data.contratoCadastro || [];
            } catch (e: any) {
              retryCount++;
              if (retryCount >= 3) return [];
              await new Promise(r => setTimeout(r, 1000));
            }
          }
          return [];
        });
      }
      
      const contratosResults = [];
      for (let i = 0; i < contratosPromises.length; i++) {
        const res = await contratosPromises[i]();
        contratosResults.push(res);
        await new Promise(r => setTimeout(r, 200));
      }
      contratosResults.forEach(arr => todosContratos.push(...arr));
    } catch (e) {}

    // Processamento
    const processarMeses = (dados: any[], dataKey: string, valKey: string, mapInicial: Record<string, number> = {}) => {
      const mapObj: Record<string, number> = { ...mapInicial };
      dados.forEach(r => {
        const d = r[dataKey];
        if (!d) return;
        const parts = String(d).split('/');
        if (parts.length === 3) {
          const key = `${parts[2]}-${parts[1]}`;
          mapObj[key] = (mapObj[key] || 0) + (Number(r[valKey]) || 0);
        }
      });
      return mapObj;
    };

    // Carregar dados antigos do cache se for atualização incremental
    const mapCaixaInicial: Record<string, number> = {};
    const mapFaturamentoInicial: Record<string, number> = {};
    if (cachedDataRaw) {
      // Reconstroi os mapas baseando-se no ultimos12Meses
      const currentMonthLastYearKey = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const previousMonthLastYearKey = `${previousMonthDate.getFullYear() - 1}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

      if (cachedDataRaw.blocoCaixa?.ultimos12Meses) {
        cachedDataRaw.blocoCaixa.ultimos12Meses.forEach((m: any) => {
          mapCaixaInicial[m.month] = m.value;
        });
        mapCaixaInicial[currentMonthLastYearKey] = cachedDataRaw.blocoCaixa.mesAtual?.anoAnterior || 0;
        mapCaixaInicial[previousMonthLastYearKey] = cachedDataRaw.blocoCaixa.mesAnterior?.anoAnterior || 0;
      }
      
      if (cachedDataRaw.blocoCompetencia?.ultimos12Meses) {
        cachedDataRaw.blocoCompetencia.ultimos12Meses.forEach((m: any) => {
          mapFaturamentoInicial[m.month] = m.value;
        });
        mapFaturamentoInicial[currentMonthLastYearKey] = cachedDataRaw.blocoCompetencia.mesAtual?.anoAnterior || 0;
        mapFaturamentoInicial[previousMonthLastYearKey] = cachedDataRaw.blocoCompetencia.mesAnterior?.anoAnterior || 0;
      }
      
      // Zerar os últimos 3 meses no map inicial para serem sobrescritos pelas novas buscas
      for (let i = 0; i < 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        mapCaixaInicial[k] = 0;
        mapFaturamentoInicial[k] = 0;
      }
    }

    const receitasCaixaPorMes = processarMeses(todasReceitas, 'dDataLancamento', 'nValorDocumento', mapCaixaInicial);
    const faturamentoPorMes = processarMeses(todosFaturamentos, 'data', 'valor', mapFaturamentoInicial);

    const buildCharts = (mapData: Record<string, number>) => {
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const currentMonthLastYearKey = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const previousMonthLastYearKey = `${previousMonthDate.getFullYear() - 1}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

      const ultimos12Meses = [];
      for (let i = 12; i >= 1; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear())}`;
        ultimos12Meses.push({ month: key, label, value: mapData[key] || 0 });
      }

      return {
        ultimos12Meses,
        mesAtual: {
          atual: mapData[currentMonthKey] || 0,
          anoAnterior: mapData[currentMonthLastYearKey] || 0,
          labelAtual: `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`,
          labelAnoAnterior: `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear() - 1}`
        },
        mesAnterior: {
          atual: mapData[previousMonthKey] || 0,
          anoAnterior: mapData[previousMonthLastYearKey] || 0,
          labelAtual: `${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}/${previousMonthDate.getFullYear()}`,
          labelAnoAnterior: `${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}/${previousMonthDate.getFullYear() - 1}`
        }
      };
    };

    const blocoCaixa = buildCharts(receitasCaixaPorMes);
    const blocoCompetencia = buildCharts(faturamentoPorMes);

    // Ticket Médio
    const contratosAtivos = todosContratos.filter(c => c.cabecalho?.cCodSit === '10' || c.cabecalho?.cCodSit === '20');
    let receitaRecorrente = 0;
    const clientesAtivosSet = new Set<number>();
    contratosAtivos.forEach(c => {
      clientesAtivosSet.add(c.cabecalho.nCodCli);
      receitaRecorrente += (c.cabecalho.nValTotMes || 0);
    });
    const numClientesAtivos = clientesAtivosSet.size || 1;

    // Faturamento Honorários do mês anterior (baseado em contratos ativos? ou faturamento filtrado?)
    // Vamos usar o faturamento total do mês anterior e dividir pelo número de clientes.
    const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const previousMonthLastYearKey = `${previousMonthDate.getFullYear() - 1}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Faturamento e ticket médio do mês anterior vs ano anterior
    const faturamentoMesAnterior = faturamentoPorMes[previousMonthKey] || 0;
    const ticketMedioMesAnterior = numClientesAtivos > 0 ? faturamentoMesAnterior / numClientesAtivos : 0;
    const faturamentoMesAnteriorAnoAnterior = faturamentoPorMes[previousMonthLastYearKey] || 0;
    const ticketMedioMesAnteriorAnoAnterior = numClientesAtivos > 0 ? faturamentoMesAnteriorAnoAnterior / numClientesAtivos : 0;

    // Crescimento Mês Anterior (RRM e Ticket)
    const variacaoRRM = faturamentoMesAnteriorAnoAnterior > 0 
      ? ((faturamentoMesAnterior - faturamentoMesAnteriorAnoAnterior) / faturamentoMesAnteriorAnoAnterior) * 100 
      : (faturamentoMesAnterior > 0 ? 100 : 0);
    
    const variacaoTicket = ticketMedioMesAnteriorAnoAnterior > 0 
      ? ((ticketMedioMesAnterior - ticketMedioMesAnteriorAnoAnterior) / ticketMedioMesAnteriorAnoAnterior) * 100 
      : (ticketMedioMesAnterior > 0 ? 100 : 0);

    // Faturamento Total do Ano Anterior
    let faturamentoTotalAnoAnterior = 0;
    for (let m = 1; m <= 12; m++) {
      const k = `${today.getFullYear() - 1}-${String(m).padStart(2, '0')}`;
      faturamentoTotalAnoAnterior += (faturamentoPorMes[k] || 0);
    }
    const mediaMensalAnoAnterior = faturamentoTotalAnoAnterior / 12;
    const ticketMedioAnoAnterior = numClientesAtivos > 0 ? mediaMensalAnoAnterior / numClientesAtivos : 0;

    // Faturamento Total Ano Corrente (até mês anterior)
    let faturamentoAcumuladoAnoCorrente = 0;
    const mesAnteriorIndex = today.getMonth(); // 0-based, se estamos em Abril (3), soma Jan(1), Fev(2), Mar(3)
    for (let m = 1; m <= mesAnteriorIndex; m++) {
      const k = `${today.getFullYear()}-${String(m).padStart(2, '0')}`;
      faturamentoAcumuladoAnoCorrente += (faturamentoPorMes[k] || 0);
    }

    const finalData = {
      blocoCaixa,
      blocoCompetencia,
      blocoHonorarios: {
        faturamentoMesAnterior,
        faturamentoMesAnteriorAnoAnterior,
        variacaoRRM,
        ticketMedioMesAnterior,
        ticketMedioMesAnteriorAnoAnterior,
        variacaoTicket,
        faturamentoTotalAnoAnterior,
        mediaMensalAnoAnterior,
        ticketMedioAnoAnterior,
        faturamentoAcumuladoAnoCorrente,
        anoAnterior: today.getFullYear() - 1,
        anoCorrente: today.getFullYear(),
        mesAnteriorNome: `${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}/${previousMonthDate.getFullYear()}`,
        mesAnteriorNomeAnoAnterior: `${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}/${previousMonthDate.getFullYear() - 1}`
      }
    };

    // Salvar no Cache
    try {
      await db.query(`
        INSERT INTO omie_dashboard_cache (id, data, updated_at) 
        VALUES (1, $1, NOW()) 
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `, [JSON.stringify(finalData)]);
    } catch (e) {
      console.warn("Erro ao salvar cache", e);
    }

    return { success: true, data: finalData, cached: false, updated_at: new Date() };
  } catch (error: any) {
    console.error('Erro ao buscar dados do Dashboard Financeiro:', error.response?.data || error.message);
    return { error: 'Falha ao buscar dados do Dashboard Financeiro.' };
  }
}
