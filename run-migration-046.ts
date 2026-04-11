
import db from './src/lib/db';
import fs from 'fs';
import path from 'path';

async function run() {
  const sqlPath = path.join(process.cwd(), 'src', 'db', 'migrations', '046_create_user_restricted_companies.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running migration:', sql);
  try {
    await db.query(sql, []);
    console.log('Migration successful');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

run();
