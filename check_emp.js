const db = require('better-sqlite3')('vision.db');
const employees = db.prepare('SELECT e.name, c.nome as company_name, e.cpf, e.is_active FROM employees e JOIN client_companies c ON e.company_id = c.id').all();
console.log(JSON.stringify(employees, null, 2));