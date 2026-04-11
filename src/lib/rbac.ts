import db from '@/lib/db';

export async function hasPermission(role: string, permission: string): Promise<boolean> {
  const result = (await db.query(`SELECT 1 FROM role_permissions WHERE role = $1 AND permission = $2`, [role, permission])).rows[0];
  return !!result;
}
