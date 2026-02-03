const db = require('./src/lib/db').default;
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables);
  
  const companiesInfo = db.prepare("PRAGMA table_info(client_companies)").all();
  console.log('Companies structure:', companiesInfo);
} catch (error) {
  console.error('Error:', error.message);
}
