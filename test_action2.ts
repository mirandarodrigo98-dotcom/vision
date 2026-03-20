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

// Mock getSession to avoid error
jest = require('jest-mock');
jest.mock('./src/lib/auth', () => ({
  getSession: async () => ({
    user_id: 'test-user',
    role: 'admin',
  }),
}));

const { checkEklesiaQuestorSyncStatus } = require('./src/app/actions/integrations/questor.ts');

async function main() {
  try {
    const result = await checkEklesiaQuestorSyncStatus('some-company-id', {});
    console.log('Result:', result);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

main();
