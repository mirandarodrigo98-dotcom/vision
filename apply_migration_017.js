
const db = require('better-sqlite3')('vision.db');
try {
  db.exec("ALTER TABLE employees ADD COLUMN dismissal_date TEXT;");
  console.log('Added dismissal_date');
} catch (e) { console.log('dismissal_date might exist', e.message); }

try {
  db.exec("ALTER TABLE employees ADD COLUMN transfer_date TEXT;");
  console.log('Added transfer_date');
} catch (e) { console.log('transfer_date might exist', e.message); }

try {
  db.exec("UPDATE employees SET status = 'Admitido' WHERE status = 'ACTIVE' OR status IS NULL;");
  console.log('Updated status');
} catch (e) { console.log('Status update failed', e.message); }
