
const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

// Handle SSL fix same as db.ts
let cs = connectionString;
if (cs.includes('sslmode=require')) {
  cs = cs.replace('?sslmode=require', '').replace('&sslmode=require', '');
}
const isNeon = cs.includes('neon.tech');

const pool = new Pool({
  connectionString: cs,
  ssl: (isNeon || process.env.NODE_ENV === 'production') ? { rejectUnauthorized: false } : undefined
});

async function run() {
  try {
    console.log('Checking employees table columns...');
    const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'employees'
    `);
    const cols = res.rows.map(r => r.column_name);
    console.log('Columns:', cols);
    
    if (!cols.includes('dismissal_date')) {
        console.log('Adding dismissal_date...');
        await pool.query('ALTER TABLE employees ADD COLUMN dismissal_date TEXT');
    }
    
    console.log('Done.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
