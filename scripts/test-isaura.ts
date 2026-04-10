import path from 'path';
import fs from 'fs';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      let value = match[2];
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.replace(/\r/g, '');
    }
  });
}

async function test() {
    const { default: db } = await import('../src/lib/db');
    const users = await db.prepare("SELECT * FROM users WHERE name ILIKE '%ISAURA%'").all();
    console.log("Users:", users);
    
    for (const user of users) {
        const dept = await db.prepare("SELECT * FROM departments WHERE id = ?").get(user.department_id);
        console.log(`Department for ${user.name}:`, dept);
        
        const perms = await db.prepare("SELECT * FROM department_permissions WHERE department_id = ?").all(user.department_id);
        console.log(`Perms for ${user.name}:`, perms);
    }
}
test();