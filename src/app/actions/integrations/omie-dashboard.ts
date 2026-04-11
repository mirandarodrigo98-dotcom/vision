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

export async function getDashboardFinanceiroData(forceRefresh = false) {
  if (!forceRefresh) {
    try {
      const cached = (await db.query('SELECT data, updated_at FROM omie_dashboard_cache WHERE id = 1', [])).rows[0];
      if (cached) {
        const lastUpdate = new Date(cached.updated_at);
        const now = new Date();
        const diffHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
        // Usa o cache se for menor que 12 horas, a não ser que o usuário force
        if (diffHours < 12 && cached.data) {
          return { success: true, data: cached.data, cached: true, updated_at: lastUpdate };
        }
      }
    } catch (e) {
      console.warn("Aviso: tabela de cache não encontrada ou erro de leitura.");
    }
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
    const resCat = await axios.post('https://app.omie.com.br/api/v1/geral/categorias/', payloadCat);
    const catList = resCat.data.categoria_cadastro || [];
    const categoriasMap = new Map();
    catList.forEach((cat: any) => categoriasMap.set(cat.codigo, cat.descricao));

    const payloadCc = {
      call: "ListarContasCorrentes",
      app_key: appKey,
      app_secret: appSecret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
    const ccList = resCc.data.ListarContasCorrentes || [];
    
    const contasAtivasIds: number[] = [];
    ccList.forEach((cc: any) => {
      const nome = cc.descricao || cc.cDescricao || '';
      if (CONTAS_ATIVAS.some(c => nome.toLowerCase().includes(c.toLowerCase()))) {
        contasAtivasIds.push(cc.nIdCC || cc.nCodCC);
      }
    });

    const formatOmieDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    const today = new Date();
    // 12 meses para trás a partir do início do mês atual (ex: se estamos em Abr 26, pega desde Mai 25)
    // Para ter o ano anterior completo para comparação do Mês Anterior (ex: Março 25), precisamos voltar 13 meses.
    const thirteenMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 13, 1);
    const dataDeStr = formatOmieDate(thirteenMonthsAgo);
    const dataAte = new Date(today.getFullYear(), today.getMonth() + 1, 0); // fim do mês atual
    const dataAteStr = formatOmieDate(dataAte);

    // Como o Omie não aceita períodos muito longos no extrato (ex: > 1 ano retorna vazio), vamos quebrar em semestres ou anos
    const periodosExtrato: { de: string, ate: string }[] = [];
    let curDate = new Date(thirteenMonthsAgo.getTime());
    while (curDate <= dataAte) {
      const nextDate = new Date(curDate.getFullYear(), curDate.getMonth() + 6, 0); // avança 6 meses (fim do mês)
      const actualNext = nextDate > dataAte ? dataAte : nextDate;
      periodosExtrato.push({
        de: formatOmieDate(curDate),
        ate: formatOmieDate(actualNext)
      });
      curDate = new Date(actualNext.getFullYear(), actualNext.getMonth() + 1, 1);
    }

    // 2. RECEITAS TOTAIS RECEBIDAS (REGIME DE CAIXA) -> via ListarExtrato
    let todasReceitas: any[] = [];
    for (const nCodCC of contasAtivasIds) {
      for (const periodo of periodosExtrato) {
        let nPaginaExtrato = 1;
        let totalPaginasExtrato = 1;
        
        do {
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
          try {
            const resExtrato = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payloadExtrato);
            const extrato = resExtrato.data.listaMovimentos || resExtrato.data.listaExtrato || resExtrato.data.extrato || [];
            totalPaginasExtrato = resExtrato.data.nTotPaginas || 1;
            
            const receitas = extrato.filter((item: any) => {
              if (item.cDesCliente === 'SALDO' || item.cDesCliente === 'SALDO ANTERIOR' || !item.cDesCategoria) return false;
              if (item.cNatureza && item.cNatureza !== 'R') return false; // GARANTIR QUE É RECEITA
              const valor = item.nValorDocumento || 0;
              if (valor <= 0) return false; 
              
              const categoria = item.cDesCategoria || '';
              return CATEGORIAS_RECEITAS_TOTAIS.some(c => categoria.toLowerCase().includes(c.toLowerCase()));
            });
            
            todasReceitas = [...todasReceitas, ...receitas];
          } catch (err: any) {
            // Fallback sem paginação para APIs legadas
            try {
              const payloadExtratoSemPagina = {
                call: "ListarExtrato",
                app_key: appKey,
                app_secret: appSecret,
                param: [{
                  nCodCC,
                  dPeriodoInicial: periodo.de,
                  dPeriodoFinal: periodo.ate
                }]
              };
              const resExtrato2 = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payloadExtratoSemPagina);
              const extrato2 = resExtrato2.data.listaMovimentos || resExtrato2.data.listaExtrato || resExtrato2.data.extrato || [];
              const receitas2 = extrato2.filter((item: any) => {
                if (item.cDesCliente === 'SALDO' || item.cDesCliente === 'SALDO ANTERIOR' || !item.cDesCategoria) return false;
                if (item.cNatureza && item.cNatureza !== 'R') return false; // GARANTIR QUE É RECEITA
                const valor = item.nValorDocumento || 0;
                if (valor <= 0) return false;
                const categoria = item.cDesCategoria || '';
                return CATEGORIAS_RECEITAS_TOTAIS.some(c => categoria.toLowerCase().includes(c.toLowerCase()));
              });
              todasReceitas = [...todasReceitas, ...receitas2];
            } catch (e2) {}
            break;
          }
          nPaginaExtrato++;
        } while (nPaginaExtrato <= totalPaginasExtrato);
      }
    }

    // 3. FATURAMENTO TOTAL (REGIME DE COMPETÊNCIA) -> via ListarContasReceber (data de emissão)
    let todosFaturamentos: any[] = [];
    let paginaFaturamento = 1;
    let totalPaginasFaturamento = 1;
    do {
      const payloadContas = {
        call: "ListarContasReceber",
        app_key: appKey,
        app_secret: appSecret,
        param: [{
          pagina: paginaFaturamento,
          registros_por_pagina: 500,
          filtrar_por_data_de: dataDeStr,
          filtrar_por_data_ate: dataAteStr
        }]
      };
      try {
        const resContas = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadContas);
        const contas = resContas.data.conta_receber_cadastro || [];
        totalPaginasFaturamento = resContas.data.total_de_paginas || 1;
        
        const fatFiltrados = contas.filter((item: any) => {
          if (item.valor_documento <= 0) return false;
          const nomeCategoria = categoriasMap.get(item.codigo_categoria) || '';
          return CATEGORIAS_RECEITAS_TOTAIS.some(c => nomeCategoria.toLowerCase().includes(c.toLowerCase()));
        });
        
        const faturamentosMapeados = fatFiltrados.map((c: any) => ({
          data: c.data_emissao || c.data_previsao,
          valor: c.valor_documento
        }));

        todosFaturamentos = [...todosFaturamentos, ...faturamentosMapeados];
      } catch (err: any) {
        console.warn(`Erro Faturamento pág ${paginaFaturamento}:`, err.response?.data?.faultstring || err.message);
        break;
      }
      paginaFaturamento++;
    } while (paginaFaturamento <= totalPaginasFaturamento);

    // 4. CONTRATOS E TICKET MÉDIO (HONORÁRIOS CONTÁBEIS)
    let todosContratos: any[] = [];
    let paginaContratos = 1;
    let totalPaginasContratos = 1;
    do {
      const payloadContratos = {
        call: "ListarContratos",
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina: paginaContratos, registros_por_pagina: 100 }]
      };
      try {
        const resContratos = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', payloadContratos);
        const contratos = resContratos.data.contratoCadastro || [];
        todosContratos = [...todosContratos, ...contratos];
        totalPaginasContratos = resContratos.data.total_de_paginas || 1;
      } catch (err: any) {
        console.warn(`Erro Contratos pág ${paginaContratos}:`, err.response?.data?.faultstring || err.message);
        break;
      }
      paginaContratos++;
    } while (paginaContratos <= totalPaginasContratos);

    // Processamento
    const processarMeses = (dados: any[], dataKey: string, valKey: string) => {
      const map = new Map<string, number>();
      dados.forEach(r => {
        const d = r[dataKey];
        if (!d) return;
        const parts = d.split('/');
        if (parts.length === 3) {
          const key = `${parts[2]}-${parts[1]}`;
          map.set(key, (map.get(key) || 0) + r[valKey]);
        }
      });
      return map;
    };

    const receitasCaixaPorMes = processarMeses(todasReceitas, 'dDataLancamento', 'nValorDocumento');
    const faturamentoPorMes = processarMeses(todosFaturamentos, 'data', 'valor');

    const buildCharts = (mapData: Map<string, number>) => {
      const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const currentMonthLastYearKey = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      const previousMonthLastYearKey = `${previousMonthDate.getFullYear() - 1}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

      const ultimos12Meses = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
        ultimos12Meses.push({ month: key, label, value: mapData.get(key) || 0 });
      }

      return {
        ultimos12Meses,
        mesAtual: {
          atual: mapData.get(currentMonthKey) || 0,
          anoAnterior: mapData.get(currentMonthLastYearKey) || 0,
          labelAtual: today.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
          labelAnoAnterior: new Date(today.getFullYear() - 1, today.getMonth(), 1).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase() + ` ${today.getFullYear() - 1}`
        },
        mesAnterior: {
          atual: mapData.get(previousMonthKey) || 0,
          anoAnterior: mapData.get(previousMonthLastYearKey) || 0,
          labelAtual: previousMonthDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
          labelAnoAnterior: new Date(previousMonthDate.getFullYear() - 1, previousMonthDate.getMonth(), 1).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase() + ` ${previousMonthDate.getFullYear() - 1}`
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
    const faturamentoMesAnterior = faturamentoPorMes.get(previousMonthKey) || 0;
    const ticketMedioMesAnterior = faturamentoMesAnterior / numClientesAtivos;
    const faturamentoMesAnteriorAnoAnterior = faturamentoPorMes.get(previousMonthLastYearKey) || 0;
    const ticketMedioMesAnteriorAnoAnterior = faturamentoMesAnteriorAnoAnterior / numClientesAtivos;

    // Acumulados do ano corrente
    let faturamentoAcumuladoAnoCorrente = 0;
    for (let m = 1; m <= today.getMonth() + 1; m++) {
      const k = `${today.getFullYear()}-${String(m).padStart(2, '0')}`;
      faturamentoAcumuladoAnoCorrente += (faturamentoPorMes.get(k) || 0);
    }
    const ticketMedioAcumuladoAnoCorrente = faturamentoAcumuladoAnoCorrente / numClientesAtivos / (today.getMonth() + 1);

    // Acumulados do ano anterior
    let faturamentoAcumuladoAnoAnterior = 0;
    for (let m = 1; m <= 12; m++) {
      const k = `${today.getFullYear() - 1}-${String(m).padStart(2, '0')}`;
      faturamentoAcumuladoAnoAnterior += (faturamentoPorMes.get(k) || 0);
    }
    const ticketMedioAcumuladoAnoAnterior = faturamentoAcumuladoAnoAnterior / numClientesAtivos / 12;

    const finalData = {
      blocoCaixa,
      blocoCompetencia,
      blocoHonorarios: {
        ticketMedioMesAnterior,
        faturamentoMesAnterior,
        receitaRecorrente,
        numClientesAtivos,
        faturamentoMesAnteriorAnoAnterior,
        ticketMedioMesAnteriorAnoAnterior,
        ticketMedioAcumuladoAnoCorrente,
        ticketMedioAcumuladoAnoAnterior
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
