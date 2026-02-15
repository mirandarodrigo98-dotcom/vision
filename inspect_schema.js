const db = require('better-sqlite3')('admissao.db');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

const usersColumns = db.prepare("PRAGMA table_info(users)").all();
console.log('Users Columns:', usersColumns.map(c => c.name));

const companiesColumns = db.prepare("PRAGMA table_info(client_companies)").all();
console.log('Companies Columns:', companiesColumns.map(c => c.name));

try {
  const procColumns = db.prepare("PRAGMA table_info(societario_processes)").all();
  console.log('Societario Processes Columns:', procColumns.map(c => c.name));
  const lastProcesses = db.prepare("SELECT id, type, status, company_id, razao_social, nome_fantasia, capital_social_centavos, socio_administrador, telefone, email, observacao, natureza_juridica, porte, tributacao, inscricao_imobiliaria, compl_cep, compl_logradouro, compl_municipio, compl_uf, created_at FROM societario_processes ORDER BY created_at DESC LIMIT 5").all();
  console.log('Last societario_processes rows:', lastProcesses);
} catch (e) {
  console.error('Error inspecting societario_processes:', e.message);
}
