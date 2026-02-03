const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'admissao.db');
const db = new Database(dbPath);

try {
  const companiesInfo = db.prepare("PRAGMA table_info(client_companies)").all();
  const employeesInfo = db.prepare("PRAGMA table_info(employees)").all();

  console.log('Client Companies Code Type:', companiesInfo.find(c => c.name === 'code')?.type);
  console.log('Employees Code Type:', employeesInfo.find(c => c.name === 'code')?.type);

} catch (error) {
  console.error('Error:', error);
}
