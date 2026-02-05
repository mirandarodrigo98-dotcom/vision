const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

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
    console.log('Migrating permissions from "client" to "client_user"...');
    
    // Get permissions for 'client'
    const res = await client.query("SELECT permission FROM role_permissions WHERE role = 'client'");
    const clientPermissions = res.rows.map(r => r.permission);
    
    if (clientPermissions.length > 0) {
        console.log(`Found ${clientPermissions.length} permissions for 'client'. Copying to 'client_user'...`);
        
        // Insert for 'client_user' ignoring duplicates
        for (const perm of clientPermissions) {
             // Check if exists
             const check = await client.query("SELECT 1 FROM role_permissions WHERE role = 'client_user' AND permission = $1", [perm]);
             if (check.rowCount === 0) {
                 await client.query("INSERT INTO role_permissions (role, permission) VALUES ('client_user', $1)", [perm]);
                 console.log(`+ Copied ${perm}`);
             } else {
                 console.log(`= Skipped ${perm} (already exists)`);
             }
        }
        
        // Optionally delete 'client' permissions? 
        // Better to keep them for now or delete them to avoid confusion? 
        // Let's delete them so we don't have zombie configurations.
        await client.query("DELETE FROM role_permissions WHERE role = 'client'");
        console.log("Deleted permissions for role 'client'.");
        
    } else {
        console.log("No permissions found for role 'client'.");
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
