const { Pool } = require('pg');
const fs = require('fs');

async function updateDb() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const records = JSON.parse(fs.readFileSync('scripts/parsed_records.json', 'utf8'));
    
    // Let's first delete ALL RJ rules to ensure a clean slate
    console.log("Deleting existing RJ rules...");
    await pool.query("DELETE FROM fiscal_regras_st WHERE uf = 'RJ'");
    console.log("Deleted");

    console.log(`Inserting ${records.length} records...`);
    let count = 0;
    for (const r of records) {
        if (!r.ncm_sh || !r.cest) continue;
        
        let ncm = (r.ncm_sh || '').substring(0, 10);
        let cest = (r.cest || '').substring(0, 9);
        
        const cleanNum = (val) => {
            if (!val) return null;
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };

        await pool.query(`
            INSERT INTO fiscal_regras_st 
            (uf, ncm_sh, cest, mva_original, mva_ajustada_int4, mva_ajustada_int12, item, subitem, nome_item, descricao)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            'RJ',
            ncm,
            cest,
            cleanNum(r.mva_original),
            cleanNum(r.mva_ajustada_int4),
            cleanNum(r.mva_ajustada_int12),
            '0',
            (r.subitem || '').substring(0, 10),
            '',
            (r.descricao || '').substring(0, 150)
        ]);
        count++;
    }
    console.log(`Successfully inserted ${count} records for RJ.`);
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

updateDb();