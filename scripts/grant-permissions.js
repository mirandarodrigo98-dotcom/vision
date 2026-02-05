const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Checking permissions for client_user...');
    
    const role = 'client_user';
    const permissions = [
      'admissions.create',
      'dismissals.create',
      'vacations.create',
      'transfers.create'
    ];

    for (const perm of permissions) {
      const res = await client.query(
        'SELECT 1 FROM role_permissions WHERE role = $1 AND permission = $2',
        [role, perm]
      );
      
      if (res.rowCount === 0) {
        await client.query(
          'INSERT INTO role_permissions (role, permission) VALUES ($1, $2)',
          [role, perm]
        );
        console.log(`✅ Added permission: ${perm}`);
      } else {
        console.log(`ℹ️ Permission already exists: ${perm}`);
      }
    }
    
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
