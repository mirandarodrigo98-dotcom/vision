import axios from 'axios';
import db from '../src/lib/db';

async function run() {
  console.log('Iniciando análise de clientes da NZD Contabilidade...');
  
  // 1. Obter credenciais Omie da NZD Contabilidade (company_id = 1)
  const config = (await db.query('SELECT app_key, app_secret FROM omie_config WHERE id = 1')).rows[0];
  if (!config) {
    console.error('Configuração Omie não encontrada para NZD Contabilidade (id = 1).');
    process.exit(1);
  }
  
  const appKey = config.app_key;
  const appSecret = config.app_secret;
  
  // 2. Identificar OS geradas no mês passado
  const now = new Date(); // Considerando a data atual do sistema (25/04/2026)
  const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 01/03/2026
  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0); // 31/03/2026
  
  const formatOmieDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  
  const deStr = formatOmieDate(firstDay);
  const ateStr = formatOmieDate(lastDay);
  
  console.log(`Buscando OS com faturamento entre ${deStr} e ${ateStr}`);
  
  let nPagina = 1;
  let totalPaginas = 1;
  const clienteIds = new Set<number>();
  
  while (nPagina <= totalPaginas) {
    const payloadFaturamento = {
      call: "ListarOS",
      app_key: appKey,
      app_secret: appSecret,
      param: [{
        pagina: nPagina,
        registros_por_pagina: 500,
        filtrar_por_data_faturamento_de: deStr,
        filtrar_por_data_faturamento_ate: ateStr,
        filtrar_por_status: "F"
      }]
    };
    
    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/servicos/os/', payloadFaturamento);
      totalPaginas = res.data.total_de_paginas || 1;
      
      const oss = res.data.osCadastro || [];
      for (const os of oss) {
        if (os.InfoCadastro?.cCancelada !== 'S' && os.Cabecalho?.nCodCli) {
          clienteIds.add(os.Cabecalho.nCodCli);
        }
      }
    } catch (error: any) {
      console.error(`Erro ao buscar OS página ${nPagina}:`, error.response?.data || error.message);
      break;
    }
    nPagina++;
  }
  
  console.log(`Encontrados ${clienteIds.size} clientes com faturamento ativo no mês passado.`);
  
  // 3. Buscar dados de TODOS os clientes na API Omie e filtrar pelos ativos
  const clientesAtivosOmie: any[] = [];
  let nPagCli = 1;
  let totPagCli = 1;
  console.log('Buscando dados dos clientes no Omie (ListarClientes)...');
  
  while (nPagCli <= totPagCli) {
    const payloadClientes = {
      call: "ListarClientes",
      app_key: appKey,
      app_secret: appSecret,
      param: [{ pagina: nPagCli, registros_por_pagina: 500 }]
    };
    try {
      const res = await axios.post('https://app.omie.com.br/api/v1/geral/clientes/', payloadClientes);
      totPagCli = res.data.total_de_paginas || 1;
      const cadastros = res.data.clientes_cadastro || [];
      
      for (const cli of cadastros) {
        if (clienteIds.has(cli.codigo_cliente_omie)) {
          clientesAtivosOmie.push({
            nome: cli.nome_fantasia || cli.razao_social,
            cnpj: (cli.cnpj_cpf || '').replace(/\D/g, ''),
            cnpjRaw: cli.cnpj_cpf
          });
        }
      }
    } catch (e: any) {
      console.error(`Erro ao listar clientes página ${nPagCli}:`, e.response?.data || e.message);
      break;
    }
    nPagCli++;
  }
  
  // 4. Buscar clientes no Vision
  const existingCompanies = (await db.query('SELECT cnpj, nome, code FROM client_companies')).rows;
  const visionClientes = existingCompanies.map(c => ({
    nome: c.nome,
    code: c.code,
    cnpj: (c.cnpj || '').replace(/\D/g, ''),
    cnpjRaw: c.cnpj
  })).filter(c => c.cnpj); // Apenas clientes com CNPJ
  
  const visionCnpjs = new Set(visionClientes.map(c => c.cnpj));
  const omieActiveCnpjs = new Set(clientesAtivosOmie.map(c => c.cnpj).filter(c => c));
  
  // 5. Análises
  const ativosNaoNoVision = clientesAtivosOmie.filter(c => c.cnpj && !visionCnpjs.has(c.cnpj));
  const noVisionNaoAtivos = visionClientes.filter(c => c.cnpj && !omieActiveCnpjs.has(c.cnpj));
  
  console.log('\n================ RELATÓRIO DE CONFRONTO (NZD Contabilidade) ================');
  console.log(`Período analisado: ${deStr} a ${ateStr}`);
  console.log(`Total de clientes com faturamento ativo no Omie: ${clientesAtivosOmie.length}`);
  console.log(`Total de clientes cadastrados no Vision: ${visionClientes.length}`);
  
  console.log(`\n1) CLIENTES ATIVOS NO OMIE (Faturado no mês passado), MAS *NÃO* CADASTRADOS NO VISION (${ativosNaoNoVision.length}):`);
  ativosNaoNoVision.forEach(c => {
    console.log(`- ${c.nome} (CNPJ/CPF: ${c.cnpjRaw})`);
  });
  
  console.log(`\n2) CLIENTES CADASTRADOS NO VISION, MAS *SEM* FATURAMENTO ATIVO NO MÊS PASSADO (${noVisionNaoAtivos.length}):`);
  noVisionNaoAtivos.forEach(c => {
    console.log(`- [Código: ${c.code}] ${c.nome} (CNPJ/CPF: ${c.cnpjRaw})`);
  });
  console.log('============================================================================\n');
  
  process.exit(0);
}

run();