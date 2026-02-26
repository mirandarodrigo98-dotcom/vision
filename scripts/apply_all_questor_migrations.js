const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const db = new Database('vision.db');

function runMigration(migrationFile, description) {
    const migrationPath = path.join(__dirname, '..', 'src', 'db', 'migrations', migrationFile);
    if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found: ${migrationPath}`);
        return;
    }
    const migration = fs.readFileSync(migrationPath, 'utf8');
    console.log(`Applying migration: ${description} (${migrationFile})...`);
    try {
        db.exec(migration);
        console.log(`Migration ${migrationFile} applied successfully.`);
    } catch (error) {
        console.error(`Error applying migration ${migrationFile}:`, error.message);
    }
}

function tableExists(tableName) {
    const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(tableName);
    return !!result;
}

function columnExists(tableName, columnName) {
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
    return columns.some(col => col.name === columnName);
}

// 1. Check/Run 031_create_questor_syn_tables.sql
if (!tableExists('questor_syn_config')) {
    runMigration('031_create_questor_syn_tables.sql', 'Create Questor SYN tables');
} else {
    console.log('Table questor_syn_config already exists. Skipping 031.');
}

// 2. Check/Run 032_add_layout_content_to_routines.sql
if (tableExists('questor_syn_routines')) {
    if (!columnExists('questor_syn_routines', 'layout_content')) {
        runMigration('032_add_layout_content_to_routines.sql', 'Add layout_content to routines');
    } else {
        console.log('Column layout_content already exists in questor_syn_routines. Skipping 032.');
    }
} else {
    console.error('Table questor_syn_routines does not exist! Cannot apply 032.');
}

// 3. Check/Run 033_add_system_code_to_routines.sql
if (tableExists('questor_syn_routines')) {
    if (!columnExists('questor_syn_routines', 'system_code')) {
        runMigration('033_add_system_code_to_routines.sql', 'Add system_code to routines');
    } else {
        console.log('Column system_code already exists in questor_syn_routines. Skipping 033.');
    }
} else {
    console.error('Table questor_syn_routines does not exist! Cannot apply 033.');
}

// 4. Check/Run 034_create_questor_syn_module_tokens.sql
if (!tableExists('questor_syn_module_tokens')) {
    runMigration('034_create_questor_syn_module_tokens.sql', 'Create Questor SYN module tokens table');
} else {
    console.log('Table questor_syn_module_tokens already exists. Skipping 034.');
}

console.log('All Questor migrations checked/applied.');
