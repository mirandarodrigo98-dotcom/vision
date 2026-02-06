
import db from '../src/lib/db';

async function debugUsers() {
  console.log('--- Users Table Debug ---');
  try {
    const users = await db.prepare('SELECT id, name, email, role, is_active FROM users').all();
    console.log(JSON.stringify(users, null, 2));
    
    console.log('\n--- Count Check ---');
    const count = await db.prepare("SELECT COUNT(*) FROM users WHERE role = 'client' AND is_active = 1").pluck().get();
    console.log('Count with role="client" and is_active=1:', count);

    const countBoolean = await db.prepare("SELECT COUNT(*) FROM users WHERE role = 'client' AND is_active = true").pluck().get();
    console.log('Count with role="client" and is_active=true:', countBoolean);

    const countAllClients = await db.prepare("SELECT COUNT(*) FROM users WHERE role = 'client'").pluck().get();
    console.log('Count all with role="client":', countAllClients);

  } catch (error) {
    console.error('Error querying users:', error);
  }
}

debugUsers();
