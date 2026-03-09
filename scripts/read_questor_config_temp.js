
const Database = require('better-sqlite3');
const db = new Database('vision.db', { readonly: true });

try {
    const tableInfo = db.prepare("PRAGMA table_info(questor_syn_config)").all();
    console.log('Columns:', tableInfo.map(c => c.name));

    const config = db.prepare('SELECT * FROM questor_syn_config').get();
    console.log('Config:', JSON.stringify(config, null, 2));
} catch (e) {
    console.error(e.message);
}
