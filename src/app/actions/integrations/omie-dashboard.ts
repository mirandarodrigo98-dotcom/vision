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
    const formatOmieDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

    const today = new Date();
    // Para pegar também o ano anterior (janeiro do ano passado) para poder fazer os acumulados e comparações
    const dataDe = `01/01/${today.getFullYear() - 1}`;
    const dataAte = new Date(today.getFullYear(), today.getMonth() + 1, 0); // fim do mês atual
    const dataAteStr = formatOmieDate(dataAte);

    // 2. Buscar Contas a Receber (Receitas) para cada conta ativa
    // Usaremos ListarContasReceber que é mais estável para longos períodos que o ListarExtrato
    let todasReceitas: any[] = [];
    let pagina = 1;
    let totalPaginas = 1;
    do {
      const payloadContas = {
        call: "ListarContasReceber",
        app_key: appKey,
        app_secret: appSecret,
        param: [{
          pagina,
          registros_por_pagina: 500,
          filtrar_por_data_pagamento_de: dataDe,
          filtrar_por_data_pagamento_ate: dataAteStr,
        }]
      };
      
      try {
        const resContas = await axios.post('https://app.omie.com.br/api/v1/financas/contareceber/', payloadContas);
        const contas = resContas.data.conta_receber_cadastro || [];
        totalPaginas = resContas.data.total_de_paginas || 1;
        
        // Filtrar apenas contas liquidadas/recebidas que pertencem às contas ativas e categorias válidas
        const contasFiltradas = contas.filter((item: any) => {
          if (item.status_titulo !== 'RECEBIDO' && item.status_titulo !== 'LIQUIDADO') return false;
          if (item.valor_documento <= 0) return false;
          
          if (!contasAtivasIds.includes(item.id_conta_corrente)) return false;

          // precisamos converter codigo_categoria para nome da categoria
          const nomeCategoria = categoriasMap.get(item.codigo_categoria) || '';
          return CATEGORIAS_RECEITAS_TOTAIS.some(c => nomeCategoria.toLowerCase().includes(c.toLowerCase()));
        });
        
        // Mapear para o formato esperado pelo restante do código
        const receitasMapeadas = contasFiltradas.map((c: any) => ({
          dDataLancamento: c.data_pagamento || c.data_previsao,
          nValorDocumento: c.valor_documento,
          cDesCategoria: categoriasMap.get(c.codigo_categoria) || ''
        }));

        todasReceitas = [...todasReceitas, ...receitasMapeadas];
      } catch (err: any) {
        console.warn(`Erro ao buscar Contas a Receber (pág ${pagina}):`, err.response?.data?.faultstring || err.message);
        break; // abortar loop em caso de erro grave
      }
      pagina++;
    } while (pagina <= totalPaginas);

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
    // Filtrar apenas contratos ativos
    const contratosAtivos = todosContratos.filter(c => c.cabecalho?.cCodSit === '10' || c.cabecalho?.cCodSit === '20');
    
    let receitaRecorrente = 0;
    const clientesAtivosSet = new Set<number>();

    contratosAtivos.forEach(c => {
      clientesAtivosSet.add(c.cabecalho.nCodCli);
      receitaRecorrente += (c.cabecalho.nValTotMes || 0);
    });

    const numClientesAtivos = clientesAtivosSet.size || 1;

    // Calcular Ticket Médio baseado na Receita Recorrente atual
    const ticketMedio = receitaRecorrente / numClientesAtivos;

    // Faturamento Recorrente do Mês Anterior (referente ao ano anterior)
    // Se hoje é ABRIL 2026 -> Mês Anterior é MARÇO 2026. O mesmo mês do ano anterior seria MARÇO 2025.
    const faturamentoMesAnteriorAnoAnterior = receitasPorMes.get(previousMonthLastYearKey) || 0;
    // O Ticket médio desse mês anterior do ano passado = Faturamento / (vamos assumir o mesmo numero de clientes, pois Omie n traz histórico de base facilmente)
    // Para simplificar, Ticket Médio do mesmo período = Faturamento / Clientes
    const ticketMedioMesAnteriorAnoAnterior = faturamentoMesAnteriorAnoAnterior / numClientesAtivos;

    // Ticket Médio Acumulado do Ano Corrente
    let faturamentoAcumuladoAnoCorrente = 0;
    for (let m = 1; m <= today.getMonth() + 1; m++) {
      const k = `${today.getFullYear()}-${String(m).padStart(2, '0')}`;
      faturamentoAcumuladoAnoCorrente += (receitasPorMes.get(k) || 0);
    }
    // Meses passados até agora
    const mesesPassados = today.getMonth() + 1;
    const ticketMedioAcumuladoAnoCorrente = faturamentoAcumuladoAnoCorrente / numClientesAtivos / mesesPassados;

    // Ticket Médio Acumulado do Ano Anterior
    let faturamentoAcumuladoAnoAnterior = 0;
    for (let m = 1; m <= 12; m++) {
      const k = `${today.getFullYear() - 1}-${String(m).padStart(2, '0')}`;
      faturamentoAcumuladoAnoAnterior += (receitasPorMes.get(k) || 0);
    }
    const ticketMedioAcumuladoAnoAnterior = faturamentoAcumuladoAnoAnterior / numClientesAtivos / 12;

    return {
      success: true,
      data: {
        bloco1: {
          ultimos12Meses: ultimos12Meses.reverse(), // Ordenar cronologicamente do mais antigo pro mais novo
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
          faturamentoMesAnteriorAnoAnterior,
          ticketMedioMesAnteriorAnoAnterior,
          ticketMedioAcumuladoAnoCorrente,
          ticketMedioAcumuladoAnoAnterior
        }
      }
    };
  } catch (error: any) {
    console.error('Erro ao buscar dados do Dashboard Financeiro:', error.response?.data || error.message);
    return { error: 'Falha ao buscar dados do Dashboard Financeiro.' };
  }
}
