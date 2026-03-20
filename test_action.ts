import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

const { checkEklesiaQuestorSyncStatus } = require('./src/app/actions/integrations/questor.ts');

async function main() {
  try {
    // We can't really run it because it requires getSession() which needs cookies, etc.
    console.log('Needs next headers/cookies to test server action');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

main();
