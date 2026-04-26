import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from '../src/lib/db';

async function run() {
  console.log('Iniciando importação de clientes da NZD Consultoria...');
  
  // 1. Obter credenciais Omie da NZD Consultoria (company_id = 2)
  const config = (await db.query('SELECT app_key, app_secret FROM omie_config WHERE id = 2')).rows[0];
  if (!config) {
    console.error('Configuração Omie não encontrada para NZD Consultoria (id = 2).');
    process.exit(1);
  }
  
  const appKey = config.app_key;
  const appSecret = config.app_secret;
  
  // 2. Identificar OS geradas neste mês
  const now = new Date();
  // We need current month start and end dates in DD/MM/YYYY
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
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
  
  console.log(`Encontrados ${clienteIds.size} clientes com faturamento ativo.`);
  
  // 3. Buscar dados de TODOS os clientes na API Omie e filtrar pelos ativos
  const clientesData: any[] = [];
  let nPagCli = 1;
  let totPagCli = 1;
  console.log('Buscando clientes no Omie (ListarClientes)...');
  
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
          clientesData.push(cli);
        }
      }
    } catch (e: any) {
      console.error(`Erro ao listar clientes página ${nPagCli}:`, e.response?.data || e.message);
      break;
    }
    nPagCli++;
  }
  
  console.log(`Dados de ${clientesData.length} clientes obtidos do Omie.`);
  
  // 4. Verificar clientes já existentes no Vision (CNPJ/CPF) e gerar códigos sequenciais (9000+)
  // Get all CNPJs from Vision
  const existingCompanies = (await db.query('SELECT cnpj, nome, code FROM client_companies')).rows;
  const existingCnpjs = new Set(existingCompanies.map(c => c.cnpj?.replace(/\D/g, '')));
  const existingCodes = existingCompanies.map(c => parseInt(c.code || '0', 10)).filter(c => !isNaN(c));
  
  let nextCode = 9000;
  while (existingCodes.includes(nextCode)) {
    nextCode++;
  }
  
  const report = {
    ignorados: [] as any[],
    cadastrados: [] as any[]
  };
  
  for (const cli of clientesData) {
    const rawCnpj = cli.cnpj_cpf || '';
    const cleanCnpj = rawCnpj.replace(/\D/g, '');
    
    if (!cleanCnpj) {
      console.log(`Cliente sem CNPJ/CPF ignorado: ${cli.razao_social}`);
      continue;
    }
    
    if (existingCnpjs.has(cleanCnpj)) {
      report.ignorados.push({
        nome: cli.nome_fantasia || cli.razao_social,
        cnpj: rawCnpj,
        motivo: 'CNPJ/CPF já existe no Vision'
      });
      continue;
    }
    
    // Preparar dados para inserção
    const id = uuidv4();
    const code = nextCode.toString();
    nextCode++;
    while (existingCodes.includes(nextCode)) {
      nextCode++;
    }
    
    const razao_social = cli.razao_social || '';
    const nome = cli.nome_fantasia || razao_social;
    const filial = '1'; // Fixado conforme requisito
    const telefone = cli.telefone1_numero ? `(${cli.telefone1_ddd}) ${cli.telefone1_numero}` : '';
    const email_contato = cli.email || '';
    
    const address_street = cli.endereco || '';
    const address_number = cli.endereco_numero || '';
    const address_complement = cli.complemento || '';
    const address_neighborhood = cli.bairro || '';
    const address_zip_code = cli.cep || '';
    const municipio = cli.cidade || '';
    const uf = cli.estado || '';
    const data_abertura = ''; // Omie doesn't directly return data_abertura easily here, leave blank
    const capital_social_centavos = 0;
    const address_type = ''; // Leave blank
    const is_active = cli.inativo === 'N' ? 1 : 0;
    
    await db.query(`
      INSERT INTO client_companies (
        id, code, nome, razao_social, cnpj, 
        filial, telefone, email_contato, 
        address_street, address_number, address_complement, address_neighborhood, address_zip_code, 
        municipio, uf, data_abertura, capital_social_centavos, address_type,
        is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
    `, [
      id, code, nome, razao_social, rawCnpj, 
      filial, telefone, email_contato, 
      address_street, address_number, address_complement, address_neighborhood, address_zip_code, 
      municipio, uf, data_abertura, capital_social_centavos, address_type,
      is_active
    ]);
    
    // Update local set to avoid duplicates within the Omie list itself
    existingCnpjs.add(cleanCnpj);
    
    report.cadastrados.push({
      code,
      nome,
      cnpj: rawCnpj
    });
  }
  
  console.log('\n================ RELATÓRIO ================');
  console.log(`\nIGNORADOS (Já existiam no Vision): ${report.ignorados.length}`);
  report.ignorados.forEach(i => {
    console.log(`- ${i.nome} (CNPJ/CPF: ${i.cnpj})`);
  });
  
  console.log(`\nCADASTRADOS COM SUCESSO: ${report.cadastrados.length}`);
  report.cadastrados.forEach(c => {
    console.log(`- Código: ${c.code} | ${c.nome} (CNPJ/CPF: ${c.cnpj})`);
  });
  console.log('===========================================\n');
  
  process.exit(0);
}

run();