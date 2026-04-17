import db from './src/lib/db';

async function run() {
  try {
    const q = `
      SELECT a.id, a.employee_full_name, a.created_at, a.status 
      FROM admission_requests a 
      JOIN users u ON a.created_by_user_id = u.id 
      WHERE u.name ILIKE '%LEONARDO%' AND a.employee_full_name ILIKE '%ROBERTA%'
      ORDER BY a.created_at ASC
    `;
    const res = await db.query(q, []);
    console.log('Duplicates:', res.rows);

    if (res.rows.length > 1) {
        // Keep the first one, delete the rest
        const toDelete = res.rows.slice(1).map(r => r.id);
        console.log('Deleting:', toDelete);
        for (const id of toDelete) {
            await db.query('DELETE FROM admission_requests WHERE id = $1', [id]);
            console.log('Deleted', id);
        }
    }
  } catch(e) { console.error(e); }
  process.exit(0);
}
run();