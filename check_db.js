const { Client } = require('pg');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const dbUrlMatch = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (!dbUrlMatch) {
  console.log("No DATABASE_URL found");
  process.exit(1);
}

const client = new Client({ connectionString: dbUrlMatch[1] });
client.connect().then(() => {
  return client.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'ir_attachments'");
}).then(res => {
  console.log("ir_attachments:");
  console.table(res.rows);
  return client.query("SELECT column_name, column_default FROM information_schema.columns WHERE table_name = 'ir_declarations' AND column_name = 'type'");
}).then(res => {
  console.log("ir_declarations type:");
  console.table(res.rows);
  return client.query("SELECT check_clause FROM information_schema.check_constraints cc JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name WHERE tc.table_name = 'ir_declarations';");
}).then(res => {
  console.log("ir_declarations constraints:");
  console.table(res.rows);
}).catch(console.error).finally(() => client.end());