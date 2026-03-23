import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const dbUrl = dbUrlMatch ? dbUrlMatch[1].trim() : process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: dbUrl,
});

async function main() {
  const user = await pool.query("SELECT id, role FROM users LIMIT 1");
  if (user.rows.length === 0) {
    console.log("No users found");
    process.exit(1);
  }
  
  const userId = user.rows[0].id;
  const role = user.rows[0].role;
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  
  await pool.query(
    "INSERT INTO sessions (id, user_id, role, expires_at) VALUES ($1, $2, $3, $4)",
    [sessionId, userId, role, expiresAt]
  );
  
  console.log(sessionId);
  process.exit(0);
}

main().catch(console.error);