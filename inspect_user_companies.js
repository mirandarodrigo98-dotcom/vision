const db = require('better-sqlite3')('admissao.db');

const userCompaniesColumns = db.prepare("PRAGMA table_info(user_companies)").all();
console.log('User Companies Columns:', userCompaniesColumns.map(c => c.name));
