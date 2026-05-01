import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // get all client_users
    const users = await pool.query("SELECT id FROM users WHERE role = 'client_user'");
    
    let added = 0;
    for (const u of users.rows) {
      // check if vt.view exists
      const vt = await pool.query("SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission_code = 'vt.view'", [u.id]);
      if (vt.rows.length === 0) {
        await pool.query("INSERT INTO user_permissions (user_id, permission_code) VALUES ($1, 'vt.view')", [u.id]);
        added++;
      }
      
      // check if payroll_variables.view exists
      const pv = await pool.query("SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission_code = 'payroll_variables.view'", [u.id]);
      if (pv.rows.length === 0) {
        await pool.query("INSERT INTO user_permissions (user_id, permission_code) VALUES ($1, 'payroll_variables.view')", [u.id]);
        added++;
      }
    }
    console.log(`Added ${added} permissions.`);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();