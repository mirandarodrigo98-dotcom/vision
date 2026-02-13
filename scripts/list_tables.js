
const db = require('better-sqlite3')('d:\\VISION\\admissao-nzd\\vision.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name));
