import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
      const val = match[2].replace(/"/g, '').trim();
      process.env[match[1]] = val;
  }
});

async function test() {
  const { getDashboardFinanceiroData } = await import('../src/app/actions/integrations/omie-dashboard');
  const res = await getDashboardFinanceiroData(false, false);
  console.log('res keys:', Object.keys(res));
  console.log('updated_at:', res.updated_at);
  console.log('updated_at type:', typeof res.updated_at);
  console.log('data keys:', res.data ? Object.keys(res.data) : null);
  process.exit(0);
}

test();