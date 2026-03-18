import db from './src/lib/db';
const rows = db.prepare('SELECT id, code, razao_social FROM client_companies LIMIT 5').all();
console.log(rows);
