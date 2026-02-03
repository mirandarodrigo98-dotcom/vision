const db = require('better-sqlite3')('d:\\OneDrive\\BUILDER\\PILOTO\\VISION\\admissao-nzd\\admissao.db');

try {
  const companiesInfo = db.prepare("PRAGMA table_info(client_companies)").all();
  const employeesInfo = db.prepare("PRAGMA table_info(employees)").all();

  console.log('Client Companies Schema:', companiesInfo.find(c => c.name === 'code'));
  console.log('Employees Schema:', employeesInfo.find(c => c.name === 'code'));

} catch (error) {
  console.error('Error:', error);
}
