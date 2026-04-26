import * as xlsx from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import db from '../src/lib/db';

async function run() {
  console.log('Iniciando importação de contatos do arquivo Excel...');
  
  // 1. Identificar ou criar a categoria "Todas"
  let categoryId: number;
  const catRes = await db.query("SELECT id FROM contact_categories WHERE name ILIKE 'Todas'");
  if (catRes.rows.length > 0) {
    categoryId = catRes.rows[0].id;
  } else {
    console.log('Categoria "Todas" não encontrada. Criando...');
    const insertRes = await db.query("INSERT INTO contact_categories (name, created_at) VALUES ('Todas', NOW()) RETURNING id");
    categoryId = insertRes.rows[0].id;
  }
  
  console.log(`Usando categoria "Todas" com ID: ${categoryId}`);
  
  // 2. Mapear empresas do Vision
  const companiesRes = await db.query('SELECT id, cnpj, nome FROM client_companies');
  const companiesByCnpj = new Map<string, {id: string, nome: string}>();
  
  for (const c of companiesRes.rows) {
    if (c.cnpj) {
      const cleanCnpj = c.cnpj.replace(/\D/g, '');
      companiesByCnpj.set(cleanCnpj, { id: c.id, nome: c.nome });
    }
  }
  
  // 3. Ler o arquivo Excel
  const filePath = './public/Contatos_Tratados.xlsx';
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data: any[] = xlsx.utils.sheet_to_json(worksheet);
  
  console.log(`Lidos ${data.length} registros do Excel.`);
  
  // 4. Inserir contatos
  const report = {
    inseridos: [] as string[],
    ignorados: [] as string[],
    naoEncontrados: [] as string[]
  };
  
  for (const row of data) {
    // Detect column names from Excel, adjust as needed depending on exactly how they are named in the sheet
    // We will print the first row keys to be sure, but we can try common names
    const keys = Object.keys(row);
    const getVal = (possibleNames: string[]) => {
      for (const k of keys) {
        if (possibleNames.some(pn => k.toLowerCase().includes(pn.toLowerCase()))) {
          return row[k];
        }
      }
      return null;
    };
    
    const rawCnpj = getVal(['cnpj', 'cpf']) || '';
    const rawName = getVal(['nome', 'contato']) || 'Contato Importado';
    const rawPhone = getVal(['telefone', 'celular', 'fone']) || '';
    
    if (!rawCnpj || !rawPhone) {
      continue;
    }
    
    const cleanCnpj = String(rawCnpj).replace(/\D/g, '');
    const cleanPhone = String(rawPhone).replace(/\D/g, '');
    
    if (!cleanCnpj || !cleanPhone) {
      continue;
    }
    
    const company = companiesByCnpj.get(cleanCnpj);
    if (!company) {
      report.naoEncontrados.push(`CNPJ ${rawCnpj} - ${rawName}`);
      continue;
    }
    
    // Verificar duplicidade para esta empresa e este telefone
    const existingPhone = await db.query(
      'SELECT id FROM company_phones WHERE company_id = $1 AND number = $2',
      [company.id, cleanPhone]
    );
    
    if (existingPhone.rows.length > 0) {
      report.ignorados.push(`${company.nome} - Contato: ${rawName} - Telefone: ${cleanPhone}`);
      continue;
    }
    
    // Inserir
    const id = uuidv4();
    await db.query(
      `INSERT INTO company_phones (id, company_id, name, number, category_id, is_whatsapp, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [id, company.id, rawName, cleanPhone, categoryId, true] // Assumindo is_whatsapp true por padrão ou false? Vamos deixar true.
    );
    
    report.inseridos.push(`${company.nome} - Contato: ${rawName} - Telefone: ${cleanPhone}`);
  }
  
  console.log('\n================ RELATÓRIO ================');
  console.log(`\nINSERIDOS COM SUCESSO: ${report.inseridos.length}`);
  // Only print first 10 or so if there are many to avoid terminal flood, or print all if requested
  report.inseridos.slice(0, 10).forEach(i => console.log(`- ${i}`));
  if (report.inseridos.length > 10) console.log(`... e mais ${report.inseridos.length - 10}`);
  
  console.log(`\nIGNORADOS (Já existiam no Vision): ${report.ignorados.length}`);
  report.ignorados.slice(0, 10).forEach(i => console.log(`- ${i}`));
  if (report.ignorados.length > 10) console.log(`... e mais ${report.ignorados.length - 10}`);
  
  console.log(`\nNÃO ENCONTRADOS (Empresa não está no Vision): ${report.naoEncontrados.length}`);
  report.naoEncontrados.slice(0, 10).forEach(i => console.log(`- ${i}`));
  if (report.naoEncontrados.length > 10) console.log(`... e mais ${report.naoEncontrados.length - 10}`);
  console.log('===========================================\n');
  
  process.exit(0);
}

run();