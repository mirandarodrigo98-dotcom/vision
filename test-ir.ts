import db from './src/lib/db';

async function test() {
  const sql = `
    SELECT 
      ir.id,
      ir.name,
      ir.is_received as original_is_received,
      ir.service_value,
      ir.receipt_value as original_receipt_value,
      (SELECT COUNT(*) FROM ir_receipts r WHERE r.declaration_id = ir.id) as receipt_count,
      CASE 
        WHEN ir.is_received = true AND (SELECT COUNT(*) FROM ir_receipts r WHERE r.declaration_id = ir.id) = 0 THEN true
        WHEN COALESCE(ir.service_value, 0) > 0 
          THEN COALESCE((
            SELECT SUM(r.receipt_value)
            FROM ir_receipts r
            WHERE r.declaration_id = ir.id
          ), 0) >= ir.service_value
        ELSE ir.is_received
      END AS calculated_is_received
    FROM ir_declarations ir
  `;
  const res = await db.query(sql);
  const rows = res.rows.filter(r => r.original_is_received === true && r.calculated_is_received === false);
  console.log('Failed:', rows);
  process.exit(0);
}
test().catch(console.error);