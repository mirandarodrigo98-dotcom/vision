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
        
        // Sempre retorna do cache se não for forceRefresh. 
        // A atualização automática das 6h é feita exclusivamente pelo Cron Job no servidor (vercel.json)
        console.log('Retornando do cache...');
        return { success: true, data: cached.data, cached: true, updated_at: lastUpdate };
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
    // Precisamos de dados desde 01/01 do ano anterior para compor o "Faturamento Total (Ano Anterior)" corretamente,
    // e também garantir os meses comparativos (ex: 03/2025).
    const dataInicialAnoAnterior = new Date(today.getFullYear() - 1, 0, 1); // 01/01/AnoAnterior
    
    // Se tivermos cache válido e os dados históricos já existirem, só precisamos buscar os últimos 3 meses (mês atual, mês anterior e retrasado)
    const dataDeBusca = (cachedDataRaw && cachedDataRaw.blocoCaixa && cachedDataRaw.blocoCompetencia && cachedDataRaw.receitasCaixaPorMes)
      ? new Date(today.getFullYear(), today.getMonth() - 2, 1) 
      : dataInicialAnoAnterior;
    
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
                  if (item.cSituacao && item.cSituacao.toLowerCase() === 'previsto') return false;
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
                      if (item.cSituacao && item.cSituacao.toLowerCase() === 'previsto') return false;
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

    // 3. FATURAMENTO TOTAL (REGIME DE COMPETÊNCIA) -> via ListarOS (Status 60 - Faturado/Gerado)
    let todosFaturamentos: any[] = [];
    try {
      const faturamentoPromises: (() => Promise<any[]>)[] = [];
      for (const periodo of periodosExtrato) {
        faturamentoPromises.push(async () => {
          const localFaturamentos: any[] = [];
          const payloadFaturamento = {
            call: "ListarOS",
            app_key: appKey,
            app_secret: appSecret,
            param: [{
              pagina: 1,
              registros_por_pagina: 500,
              filtrar_por_data_faturamento_de: periodo.de,
              filtrar_por_data_faturamento_ate: periodo.ate,
              filtrar_por_status: "F"
            }]
          };
          let nPaginaFat = 1;
          let totalPaginasFat = 1;

          while (nPaginaFat <= totalPaginasFat) {
            let retryFat = 0;
            let fatSuccess = false;
            while (retryFat < 3 && !fatSuccess) {
              try {
                payloadFaturamento.param[0].pagina = nPaginaFat;
                const resFaturamento = await axios.post('https://app.omie.com.br/api/v1/servicos/os/', payloadFaturamento);
                
                const oss = resFaturamento.data.osCadastro?.filter((item: any) => item.InfoCadastro?.cCancelada !== 'S') || [];
                totalPaginasFat = resFaturamento.data.total_de_paginas || 1;

                localFaturamentos.push(...oss.map((item: any) => ({
                  data: item.Cabecalho?.dDtPrevisao || item.Cabecalho?.dDtFaturamento, 
                  valor: item.Cabecalho?.nValorTotal || 0,
                  clienteId: item.Cabecalho?.nCodCli
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

    // 5. CAPTAÇÃO DE CLIENTES
    const entradasPorMes: Record<string, number> = {};
    const saidasPorMes: Record<string, number> = {};
    
    if (cachedDataRaw && cachedDataRaw.entradasPorMes) Object.assign(entradasPorMes, cachedDataRaw.entradasPorMes);
    if (cachedDataRaw && cachedDataRaw.saidasPorMes) Object.assign(saidasPorMes, cachedDataRaw.saidasPorMes);

    // Zerar os últimos 3 meses no map inicial para serem sobrescritos
    for (let i = 0; i < 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      entradasPorMes[k] = 0;
      saidasPorMes[k] = 0;
    }

    const clientesCaptacao: Record<number, { entrada: string | null, saida: string | null, isActive: boolean }> = {};
    
    // Identificar Entradas (dVigInicial mais antigo) e Status Ativo
    todosContratos.forEach(c => {
      const cliId = c.cabecalho?.nCodCli;
      if (!cliId) return;
      if (!clientesCaptacao[cliId]) clientesCaptacao[cliId] = { entrada: null, saida: null, isActive: false };
      
      const status = c.cabecalho.cCodSit;
      if (status === '10' || status === '20') clientesCaptacao[cliId].isActive = true;
      
      const dInc = c.cabecalho.dVigInicial;
      if (dInc) {
        const parts = dInc.split('/');
        if (parts.length === 3) {
          const key = `${parts[2]}-${parts[1]}`;
          if (!clientesCaptacao[cliId].entrada || key < clientesCaptacao[cliId].entrada!) {
            clientesCaptacao[cliId].entrada = key;
          }
        }
      }
    });

    // Identificar Saídas (último faturamento gerado para clientes inativos)
    const lastFatCli: Record<number, string> = {};
    todosFaturamentos.forEach(f => {
      if (!f.clienteId || !f.data) return;
      const parts = String(f.data).split('/');
      if (parts.length === 3) {
        const key = `${parts[2]}-${parts[1]}`;
        if (!lastFatCli[f.clienteId] || key > lastFatCli[f.clienteId]) {
          lastFatCli[f.clienteId] = key;
        }
      }
    });

    Object.keys(clientesCaptacao).forEach(k => {
      const cliId = Number(k);
      const c = clientesCaptacao[cliId];
      if (!c.isActive && lastFatCli[cliId]) {
        c.saida = lastFatCli[cliId];
      }
    });

    // Contabilizar
    Object.values(clientesCaptacao).forEach(c => {
      if (c.entrada) entradasPorMes[c.entrada] = (entradasPorMes[c.entrada] || 0) + 1;
      if (c.saida) saidasPorMes[c.saida] = (saidasPorMes[c.saida] || 0) + 1;
    });

    // Build Chart para Captação
    const buildCaptacao = () => {
      const ultimos12Meses = [];
      let totalEntradasPeriodo = 0;
      let totalSaidasPeriodo = 0;
      
      for (let i = 12; i >= 1; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear())}`;
        const entradas = entradasPorMes[key] || 0;
        const saidas = saidasPorMes[key] || 0;
        ultimos12Meses.push({ month: key, label, entradas, saidas });
        totalEntradasPeriodo += entradas;
        totalSaidasPeriodo += saidas;
      }
      
      const saldoPeriodo = totalEntradasPeriodo - totalSaidasPeriodo;
      const percentualSaldo = totalEntradasPeriodo > 0 ? (saldoPeriodo / totalEntradasPeriodo) * 100 : 0;

      // Cards Ano Retrasado
      let entradasAnoRetrasado = 0;
      let saidasAnoRetrasado = 0;
      for (let m = 1; m <= 12; m++) {
        const k = `${today.getFullYear() - 2}-${String(m).padStart(2, '0')}`;
        entradasAnoRetrasado += (entradasPorMes[k] || 0);
        saidasAnoRetrasado += (saidasPorMes[k] || 0);
      }

      // Cards Ano Anterior
      let entradasAnoAnterior = 0;
      let saidasAnoAnterior = 0;
      for (let m = 1; m <= 12; m++) {
        const k = `${today.getFullYear() - 1}-${String(m).padStart(2, '0')}`;
        entradasAnoAnterior += (entradasPorMes[k] || 0);
        saidasAnoAnterior += (saidasPorMes[k] || 0);
      }
      
      const variacaoEntradasAnoAnterior = entradasAnoRetrasado > 0 ? ((entradasAnoAnterior - entradasAnoRetrasado) / entradasAnoRetrasado) * 100 : (entradasAnoAnterior > 0 ? 100 : 0);
      const variacaoSaidasAnoAnterior = saidasAnoRetrasado > 0 ? ((saidasAnoAnterior - saidasAnoRetrasado) / saidasAnoRetrasado) * 100 : (saidasAnoAnterior > 0 ? 100 : 0);

      // Cards Ano Corrente
      let entradasAnoCorrente = 0;
      let saidasAnoCorrente = 0;
      let entradasAnoAnteriorMesmoPeriodo = 0;
      let saidasAnoAnteriorMesmoPeriodo = 0;
      const mesAnteriorIndex = today.getMonth(); // 0-based
      for (let m = 1; m <= mesAnteriorIndex; m++) {
        const k = `${today.getFullYear()}-${String(m).padStart(2, '0')}`;
        const kAnterior = `${today.getFullYear() - 1}-${String(m).padStart(2, '0')}`;
        entradasAnoCorrente += (entradasPorMes[k] || 0);
        saidasAnoCorrente += (saidasPorMes[k] || 0);
        entradasAnoAnteriorMesmoPeriodo += (entradasPorMes[kAnterior] || 0);
        saidasAnoAnteriorMesmoPeriodo += (saidasPorMes[kAnterior] || 0);
      }

      const variacaoEntradasAnoCorrente = entradasAnoAnteriorMesmoPeriodo > 0
        ? ((entradasAnoCorrente - entradasAnoAnteriorMesmoPeriodo) / entradasAnoAnteriorMesmoPeriodo) * 100
        : (entradasAnoCorrente > 0 ? 100 : 0);
      const variacaoSaidasAnoCorrente = saidasAnoAnteriorMesmoPeriodo > 0
        ? ((saidasAnoCorrente - saidasAnoAnteriorMesmoPeriodo) / saidasAnoAnteriorMesmoPeriodo) * 100
        : (saidasAnoCorrente > 0 ? 100 : 0);

      // Trimestre (3 meses anteriores ao atual)
      let entradasTrimestre = 0;
      let saidasTrimestre = 0;
      let entradasTrimestreAnterior = 0;
      let saidasTrimestreAnterior = 0;

      for (let i = 1; i <= 3; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const dAnt = new Date(today.getFullYear() - 1, today.getMonth() - i, 1);
        const kAnt = `${dAnt.getFullYear()}-${String(dAnt.getMonth() + 1).padStart(2, '0')}`;
        
        entradasTrimestre += (entradasPorMes[k] || 0);
        saidasTrimestre += (saidasPorMes[k] || 0);
        entradasTrimestreAnterior += (entradasPorMes[kAnt] || 0);
        saidasTrimestreAnterior += (saidasPorMes[kAnt] || 0);
      }
      
      const variacaoEntradasTrimestre = entradasTrimestreAnterior > 0 ? ((entradasTrimestre - entradasTrimestreAnterior) / entradasTrimestreAnterior) * 100 : (entradasTrimestre > 0 ? 100 : 0);
      const variacaoSaidasTrimestre = saidasTrimestreAnterior > 0 ? ((saidasTrimestre - saidasTrimestreAnterior) / saidasTrimestreAnterior) * 100 : (saidasTrimestre > 0 ? 100 : 0);

      return {
        ultimos12Meses,
        saldoPeriodo,
        percentualSaldo,
        anoAnterior: {
          entradas: entradasAnoAnterior,
          saidas: saidasAnoAnterior,
          variacaoEntradas: variacaoEntradasAnoAnterior,
          variacaoSaidas: variacaoSaidasAnoAnterior,
          label: (today.getFullYear() - 1).toString()
        },
        anoCorrente: {
          entradas: entradasAnoCorrente,
          saidas: saidasAnoCorrente,
          variacaoEntradas: variacaoEntradasAnoCorrente,
          variacaoSaidas: variacaoSaidasAnoCorrente,
          label: today.getFullYear().toString()
        },
        trimestre: {
          entradas: entradasTrimestre,
          saidas: saidasTrimestre,
          variacaoEntradas: variacaoEntradasTrimestre,
          variacaoSaidas: variacaoSaidasTrimestre,
          label: "Últimos 3 Meses"
        }
      };
    };

    const blocoCaptacao = buildCaptacao();

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
      if (cachedDataRaw.receitasCaixaPorMes) {
        Object.assign(mapCaixaInicial, cachedDataRaw.receitasCaixaPorMes);
      }
      if (cachedDataRaw.faturamentoPorMes) {
        Object.assign(mapFaturamentoInicial, cachedDataRaw.faturamentoPorMes);
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
    let faturamentoAcumuladoAnoAnteriorMesmoPeriodo = 0;
    const mesAnteriorIndex = today.getMonth(); // 0-based, se estamos em Abril (3), soma Jan(1), Fev(2), Mar(3)
    for (let m = 1; m <= mesAnteriorIndex; m++) {
      const k = `${today.getFullYear()}-${String(m).padStart(2, '0')}`;
      const kAnterior = `${today.getFullYear() - 1}-${String(m).padStart(2, '0')}`;
      faturamentoAcumuladoAnoCorrente += (faturamentoPorMes[k] || 0);
      faturamentoAcumuladoAnoAnteriorMesmoPeriodo += (faturamentoPorMes[kAnterior] || 0);
    }

    const variacaoAcumulado = faturamentoAcumuladoAnoAnteriorMesmoPeriodo > 0
      ? ((faturamentoAcumuladoAnoCorrente - faturamentoAcumuladoAnoAnteriorMesmoPeriodo) / faturamentoAcumuladoAnoAnteriorMesmoPeriodo) * 100
      : (faturamentoAcumuladoAnoCorrente > 0 ? 100 : 0);
      
    const ticketMedioAcumuladoAnoCorrente = (mesAnteriorIndex > 0 && numClientesAtivos > 0) ? (faturamentoAcumuladoAnoCorrente / mesAnteriorIndex) / numClientesAtivos : 0;
    const ticketMedioAcumuladoAnoAnterior = (mesAnteriorIndex > 0 && numClientesAtivos > 0) ? (faturamentoAcumuladoAnoAnteriorMesmoPeriodo / mesAnteriorIndex) / numClientesAtivos : 0;

    const finalData = {
      blocoCaixa,
      blocoCompetencia,
      blocoCaptacao,
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
        faturamentoAcumuladoAnoAnteriorMesmoPeriodo,
        variacaoAcumulado,
        ticketMedioAcumuladoAnoCorrente,
        ticketMedioAcumuladoAnoAnterior,
        anoAnterior: today.getFullYear() - 1,
        anoCorrente: today.getFullYear(),
        mesAnteriorNome: `${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}/${previousMonthDate.getFullYear()}`,
        mesAnteriorNomeAnoAnterior: `${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}/${previousMonthDate.getFullYear() - 1}`
      },
      receitasCaixaPorMes,
      faturamentoPorMes,
      entradasPorMes,
      saidasPorMes
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
