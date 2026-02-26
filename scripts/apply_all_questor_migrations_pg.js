const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('neon.tech') 
    ? { rejectUnauthorized: false } 
    : undefined,
});

async function runMigration(migrationFile, description) {
    const migrationPath = path.join(__dirname, '..', 'src', 'db', 'migrations', migrationFile);
    if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found: ${migrationPath}`);
        return;
    }
    let sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Transform SQL for Postgres compatibility
    
    // 1. INSERT OR IGNORE -> INSERT ... ON CONFLICT DO NOTHING
    if (sql.includes('INSERT OR IGNORE')) {
        sql = sql.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
        // Replace the end of the statement with ON CONFLICT DO NOTHING
        // Assuming single statement ending with ;
        sql = sql.replace(/;\s*$/g, ' ON CONFLICT DO NOTHING;');
    }

    // 2. ADD COLUMN -> ADD COLUMN IF NOT EXISTS
    // But verify it's not already there
    sql = sql.replace(/ADD COLUMN (?!IF NOT EXISTS)/gi, 'ADD COLUMN IF NOT EXISTS ');

    // 3. CREATE TABLE -> CREATE TABLE IF NOT EXISTS
    sql = sql.replace(/CREATE TABLE (?!IF NOT EXISTS)/gi, 'CREATE TABLE IF NOT EXISTS ');

    // 4. DATETIME -> TIMESTAMP
    // SQLite uses DATETIME, Postgres uses TIMESTAMP
    sql = sql.replace(/DATETIME/gi, 'TIMESTAMP');

    // 5. Fix SQLite CHECK constraint syntax if needed (Postgres usually supports standard CHECK)
    // 031: CHECK (id = 1) -> Valid in Postgres

    console.log(`Applying migration: ${description} (${migrationFile})...`);
    console.log('SQL to execute:', sql.substring(0, 100) + '...'); 
    
    try {
        await pool.query(sql);
        console.log(`Migration ${migrationFile} applied successfully.`);
    } catch (error) {
        console.error(`Error applying migration ${migrationFile}:`, error.message);
        // If error is "relation already exists", we can ignore it for CREATE TABLE
        // Postgres error codes: 42P07 (duplicate_table), 42701 (duplicate_column)
        if (error.code === '42P07') {
            console.log(`Table already exists. Ignoring.`);
        } else if (error.code === '42701') {
             console.log(`Column already exists. Ignoring.`);
        }
    }
}

async function run() {
    try {
        console.log('Connecting to PostgreSQL...');
        await pool.query('SELECT 1'); // Test connection
        console.log('Connected.');

        // Sequential execution
        await runMigration('031_create_questor_syn_tables.sql', 'Create Questor SYN tables');
        await runMigration('032_add_layout_content_to_routines.sql', 'Add layout_content to routines');
        await runMigration('033_add_system_code_to_routines.sql', 'Add system_code to routines');
        await runMigration('034_create_questor_syn_module_tokens.sql', 'Create Questor SYN module tokens table');

        console.log('All Questor migrations applied.');
    } catch (err) {
        console.error('Migration process failed:', err);
    } finally {
        await pool.end();
    }
}

run();
