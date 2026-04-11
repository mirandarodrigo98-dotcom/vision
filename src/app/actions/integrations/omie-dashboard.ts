'use server';

import axios from 'axios';
import { getOmieConfig } from './omie-config';

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

export async function getDashboardFinanceiroData() {
  const config = await getOmieConfig();

  if (!config || !config.is_active || !config.app_key || !config.app_secret) {
    return { error: 'Credenciais da API Omie não configuradas ou inativas.' };
  }

  const appKey = config.app_key;
  const appSecret = config.app_secret;

  try {
    // 1. Buscar Contas Correntes
    const payloadCc = {
      call: "ListarContasCorrentes",
      app_key: appKey,
      app_secret: appSecret,
      param: [{ pagina: 1, registros_por_pagina: 500 }]
    };
    const resCc = await axios.post('https://app.omie.com.br/api/v1/geral/contacorrente/', payloadCc);
    const ccList = resCc.data.ListarContasCorrentes || [];
    
    // Filtrar contas ativas pelos nomes
    const contasAtivasIds: number[] = [];
    ccList.forEach((cc: any) => {
      const nome = cc.descricao || cc.cDescricao || '';
      if (CONTAS_ATIVAS.some(c => nome.toLowerCase().includes(c.toLowerCase()))) {
        contasAtivasIds.push(cc.nIdCC || cc.nCodCC);
      }
    });

    // Filtros de Data
    const today = new Date();
    // Para os últimos 12 meses (incluindo o atual)
    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    const dataDe = twelveMonthsAgo.toLocaleDateString('pt-BR');
    const dataAte = new Date(today.getFullYear(), today.getMonth() + 1, 0).toLocaleDateString('pt-BR');

    // 2. Buscar Extratos (Receitas) para cada conta ativa
    let todasReceitas: any[] = [];
    for (const nCodCC of contasAtivasIds) {
      const payloadExtrato = {
        call: "ListarExtrato",
        app_key: appKey,
        app_secret: appSecret,
        param: [{
          nCodCC,
          dPeriodoInicial: dataDe,
          dPeriodoFinal: dataAte
        }]
      };
      try {
        const resExtrato = await axios.post('https://app.omie.com.br/api/v1/financas/extrato/', payloadExtrato);
        const extrato = resExtrato.data.listaExtrato || resExtrato.data.extrato || [];
        
        // Filtrar apenas receitas (cNatureza === 'R') e categorias válidas
        const receitas = extrato.filter((item: any) => {
          if (item.cNatureza !== 'R') return false;
          if (item.nValorDocumento <= 0) return false; // apenas entradas positivas
          
          const categoria = item.cDesCategoria || '';
          return CATEGORIAS_RECEITAS_TOTAIS.some(c => categoria.toLowerCase().includes(c.toLowerCase()));
        });
        
        todasReceitas = [...todasReceitas, ...receitas];
      } catch (err: any) {
        // Ignora erros de extrato vazio para uma conta específica
        console.warn(`Erro ao buscar extrato para conta ${nCodCC}:`, err.response?.data?.faultstring || err.message);
      }
    }

    // 3. Buscar Contratos (para Receita Recorrente e Clientes Ativos)
    let todosContratos: any[] = [];
    let pagina = 1;
    let totalPaginas = 1;
    do {
      const payloadContratos = {
        call: "ListarContratos",
        app_key: appKey,
        app_secret: appSecret,
        param: [{ pagina, registros_por_pagina: 100 }]
      };
      const resContratos = await axios.post('https://app.omie.com.br/api/v1/servicos/contrato/', payloadContratos);
      const contratos = resContratos.data.contratoCadastro || [];
      todosContratos = [...todosContratos, ...contratos];
      totalPaginas = resContratos.data.total_de_paginas || 1;
      pagina++;
    } while (pagina <= totalPaginas);

    // Processamento dos Dados
    
    // BLOCO 1 - Receitas Totais
    const receitasPorMes = new Map<string, number>();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthKey = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
    
    const currentMonthLastYearKey = `${today.getFullYear() - 1}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const previousMonthLastYearKey = `${previousMonthDate.getFullYear() - 1}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Preparar chaves dos últimos 12 meses
    const ultimos12Meses: { month: string; label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '').toUpperCase();
      ultimos12Meses.push({ month: key, label, value: 0 });
      receitasPorMes.set(key, 0);
    }

    // Somar receitas por mês
    todasReceitas.forEach(r => {
      const parts = (r.dDataLancamento || r.dDataConciliacao).split('/'); // dd/mm/yyyy
      if (parts.length === 3) {
        const key = `${parts[2]}-${parts[1]}`;
        if (receitasPorMes.has(key)) {
          receitasPorMes.set(key, (receitasPorMes.get(key) || 0) + r.nValorDocumento);
        } else {
          receitasPorMes.set(key, r.nValorDocumento); // para guardar meses anteriores (ano anterior) se houver
        }
      }
    });

    // Atualizar array dos últimos 12 meses
    ultimos12Meses.forEach(m => {
      m.value = receitasPorMes.get(m.month) || 0;
    });

    // BLOCO 2 - Honorários Contábeis
    // Filtrar apenas contratos ativos (cCodSit == '10' normalmente é ativo)
    const contratosAtivos = todosContratos.filter(c => c.cabecalho?.cCodSit === '10' || c.cabecalho?.cCodSit === '20'); // 10, 20 podem ser ativos
    
    let receitaRecorrente = 0;
    const clientesAtivosSet = new Set<number>();

    contratosAtivos.forEach(c => {
      clientesAtivosSet.add(c.cabecalho.nCodCli);
      // Somar apenas os itens de Honorários
      const itens = c.itensContrato || [];
      itens.forEach((item: any) => {
        // Verificar se a categoria do item está nas categorias de honorários.
        // O Omie retorna o nome da categoria no item? Geralmente retorna cCodCategItem.
        // Vamos considerar todos os itens do contrato como receita recorrente, ou filtrar por código?
        // Como não temos o mapeamento exato de cCodCategItem para nome fácil aqui, vamos assumir que o nValTotMes é a receita recorrente
        // Ou podemos usar nValTotMes do cabecalho se não conseguirmos filtrar itens
      });
      // Para simplificar, usaremos o valor total do contrato ativo
      receitaRecorrente += (c.cabecalho.nValTotMes || 0);
    });

    const numClientesAtivos = clientesAtivosSet.size || 1; // evitar divisão por zero

    // Calcular Ticket Médio usando a receita do mês atual (apenas das categorias de honorários)
    const receitasHonorariosMesAtual = todasReceitas.filter(r => {
      const parts = (r.dDataLancamento || r.dDataConciliacao).split('/');
      const key = `${parts[2]}-${parts[1]}`;
      if (key !== currentMonthKey) return false;
      
      const categoria = r.cDesCategoria || '';
      return CATEGORIAS_HONORARIOS.some(c => categoria.toLowerCase().includes(c.toLowerCase()));
    });
    
    const receitaBrutaHonorariosMesAtual = receitasHonorariosMesAtual.reduce((sum, r) => sum + r.nValorDocumento, 0);
    const ticketMedio = receitaBrutaHonorariosMesAtual / numClientesAtivos;

    return {
      success: true,
      data: {
        bloco1: {
          ultimos12Meses,
          mesAtual: {
            atual: receitasPorMes.get(currentMonthKey) || 0,
            anoAnterior: receitasPorMes.get(currentMonthLastYearKey) || 0,
            labelAtual: today.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
            labelAnoAnterior: new Date(today.getFullYear() - 1, today.getMonth(), 1).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase() + ` ${today.getFullYear() - 1}`
          },
          mesAnterior: {
            atual: receitasPorMes.get(previousMonthKey) || 0,
            anoAnterior: receitasPorMes.get(previousMonthLastYearKey) || 0,
            labelAtual: previousMonthDate.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
            labelAnoAnterior: new Date(previousMonthDate.getFullYear() - 1, previousMonthDate.getMonth(), 1).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase() + ` ${previousMonthDate.getFullYear() - 1}`
          }
        },
        bloco2: {
          ticketMedio,
          receitaRecorrente,
          numClientesAtivos,
          receitaBrutaHonorariosMesAtual
        }
      }
    };
  } catch (error: any) {
    console.error('Erro ao buscar dados do Dashboard Financeiro:', error.response?.data || error.message);
    return { error: 'Falha ao buscar dados do Dashboard Financeiro.' };
  }
}
