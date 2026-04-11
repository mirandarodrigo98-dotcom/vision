import db from '@/lib/db';

async function test() {
  const result = await db.prepare('SELECT * FROM users WHERE id = ? AND name = ?').get(1, 'John');
  console.log(result);

  const all = await db.prepare("SELECT * FROM posts WHERE status = ?").all('active');

  await db.prepare(`UPDATE users SET status = ? WHERE id = ?`).run('inactive', 2);
}
