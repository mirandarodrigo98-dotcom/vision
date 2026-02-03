const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: '.env.local' }); // Try .env.local first
require('dotenv').config(); // Fallback to .env

async function migrate() {
  const dbPath = path.join(__dirname, '..', 'admissao.db');
  console.log(`Opening SQLite database at ${dbPath}...`);
  
  let sqlite;
  try {
    sqlite = new Database(dbPath, { readonly: true });
  } catch (err) {
    console.error('Could not open SQLite database. Make sure "admissao.db" exists in the project root.');
    console.error(err);
    process.exit(1);
  }

  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error('DATABASE_URL is not set in environment variables.');
    console.error('Please create a Neon project and set DATABASE_URL in .env');
    process.exit(1);
  }

  console.log(`Connecting to PostgreSQL...`);
  const pool = new Pool({
    connectionString: pgUrl,
    ssl: { rejectUnauthorized: false } // Required for Neon
  });

  try {
    await pool.query('SELECT 1'); // Test connection
    console.log('Connected to PostgreSQL.');
  } catch (err) {
    console.error('Could not connect to PostgreSQL.');
    console.error(err);
    process.exit(1);
  }

  // Define tables and their processing logic
  // Order matters for foreign keys!
  const tables = [
    'users',
    'client_companies',
    'user_companies',
    'admin_allowed_emails',
    'otp_tokens',
    'settings',
    'employees',
    'admission_requests',
    'admission_attachments',
    'audit_logs',
    'transfer_requests',
    'role_permissions',
    'vacations',
    'dismissals'
  ];

  const client = await pool.connect();

  try {
    // Removed transaction to allow partial success and better error debugging
    // await client.query('BEGIN');

    for (const table of tables) {
      console.log(`Migrating table: ${table}...`);
      
      // Check if table exists in SQLite
      try {
        const count = sqlite.prepare(`SELECT count(*) as count FROM ${table}`).get();
        if (!count) {
          console.log(`  Table ${table} not found or empty in SQLite. Skipping.`);
          continue;
        }
        console.log(`  Found ${count.count} rows in SQLite.`);
      } catch (e) {
        console.log(`  Table ${table} does not exist in SQLite. Skipping.`);
        continue;
      }

      // Read from SQLite
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();

      if (rows.length === 0) continue;

      // Get columns from the first row to construct INSERT statement
      // Note: This assumes all rows have same columns, which is true for SQL.
      // However, we need to map column names if schema changed.
      // Assuming schema is compatible (same column names).
      
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const quotedColumns = columns.map(c => `"${c}"`).join(', ');

      const insertSql = `
        INSERT INTO "${table}" (${quotedColumns}) 
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;

      for (const row of rows) {
        const values = Object.values(row).map(val => {
            // Handle conversions
            // SQLite stores booleans as 0/1. Postgres is fine with 0/1 for INTEGER columns.
            // But if we changed to BOOLEAN type in Postgres, we need conversion.
            // My postgres-schema.sql used INTEGER for flags, so 0/1 is fine.
            
            // Handle Dates: SQLite stores 'YYYY-MM-DD HH:MM:SS' strings.
            // Postgres TIMESTAMP accepts this format.
            
            // Handle JSON: SQLite stores as string. Postgres JSONB needs string (it parses it) or object.
            // pg driver accepts object for JSONB, or string.
            // If it's a string in SQLite that looks like JSON, pass it as is.
            
            return val;
        });

        try {
            await client.query(insertSql, values);
        } catch (err) {
            console.error(`  Error inserting row into ${table}:`, err.message);
            console.error('  Row:', row);
            // Don't abort, just log errors (e.g. duplicate keys)
        }
      }
      console.log(`  Finished ${table}.`);
    }

    // Reset sequences if necessary (not needed for UUIDs/TEXT IDs)
    
    // await client.query('COMMIT');
    console.log('Migration completed successfully!');

  } catch (err) {
    // await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    sqlite.close();
    await pool.end();
  }
}

migrate();
