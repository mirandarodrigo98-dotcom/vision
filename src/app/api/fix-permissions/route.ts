import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const users = await db.query(`SELECT id FROM users WHERE role = 'client_user'`);
    let added = 0;
    
    for (const u of users.rows) {
      // Check vt.view
      const vt = await db.query(`SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission_code = 'vt.view'`, [u.id]);
      if (vt.rows.length === 0) {
        await db.query(`INSERT INTO user_permissions (user_id, permission_code) VALUES ($1, 'vt.view')`, [u.id]);
        added++;
      }
      
      // Check payroll_variables.view
      const pv = await db.query(`SELECT 1 FROM user_permissions WHERE user_id = $1 AND permission_code = 'payroll_variables.view'`, [u.id]);
      if (pv.rows.length === 0) {
        await db.query(`INSERT INTO user_permissions (user_id, permission_code) VALUES ($1, 'payroll_variables.view')`, [u.id]);
        added++;
      }
    }
    
    return NextResponse.json({ success: true, added_permissions: added });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
