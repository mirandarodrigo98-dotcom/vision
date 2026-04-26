import * as xlsx from 'xlsx';
import db from '../src/lib/db';

async function run() {
  console.log('Iniciando correção dos nomes dos contatos...');
  
  // 1. Mapear empresas do Vision
  const companiesRes = await db.query('SELECT id, cnpj, nome FROM client_companies');
  const companiesByCnpj = new Map<string, {id: string, nome: string}>();
  
  for (const c of companiesRes.rows) {
    if (c.cnpj) {
      const cleanCnpj = c.cnpj.replace(/\D/g, '');
      companiesByCnpj.set(cleanCnpj, { id: c.id, nome: c.nome });
    }
  }
  
  // 2. Ler o arquivo Excel
  const filePath = './public/Contatos_Tratados.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: any[] = xlsx.utils.sheet_to_json(worksheet);
  
  console.log(`Lidos ${data.length} registros do Excel.`);
  
  let atualizados = 0;
  let ignorados = 0;
  
  for (const row of data) {
    const rawCnpj = row['INSCRIÇÃO CNPJ/CPF'] || '';
    const contatoReal = row['CONTATO'] || ''; // Aqui pegamos o nome correto do contato
    const rawPhone = row['TELEFONE'] || '';
    
    if (!rawCnpj || !rawPhone || !contatoReal) {
      continue;
    }
    
    const cleanCnpj = String(rawCnpj).replace(/\D/g, '');
    const cleanPhone = String(rawPhone).replace(/\D/g, '');
    
    if (!cleanCnpj || !cleanPhone) {
      continue;
    }
    
    const company = companiesByCnpj.get(cleanCnpj);
    if (!company) {
      continue; // Empresa não existe no banco (já reportado no script anterior)
    }
    
    // Atualizar o registro com base no company_id e no número de telefone
    const res = await db.query(
      `UPDATE company_phones 
       SET name = $1, updated_at = NOW() 
       WHERE company_id = $2 AND number = $3
       RETURNING id`,
      [contatoReal, company.id, cleanPhone]
    );
    
    if (res.rowCount && res.rowCount > 0) {
      atualizados += res.rowCount;
      console.log(`Atualizado: Empresa [${company.nome}] -> Contato: ${contatoReal} | Tel: ${cleanPhone}`);
    } else {
      ignorados++;
    }
  }
  
  console.log('\\n================ RELATÓRIO DE CORREÇÃO ================');
  console.log(`Total de contatos corrigidos: ${atualizados}`);
  console.log(`Total de contatos não encontrados para atualizar (ou já corretos): ${ignorados}`);
  console.log('=======================================================\\n');
  
  process.exit(0);
}

run();