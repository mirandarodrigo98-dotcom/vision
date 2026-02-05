import db from '@/lib/db';

export async function hasPermission(role: string, permission: string): Promise<boolean> {
  const result = await db.prepare(
    'SELECT 1 FROM role_permissions WHERE role = ? AND permission = ?'
  ).get(role, permission);
  return !!result;
}
