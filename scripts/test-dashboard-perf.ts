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

async function main() {
    const { getDashboardFinanceiroData } = await import('../src/app/actions/integrations/omie-dashboard');
    console.log('Testing early return performance...');
    const start = Date.now();
    const res = await getDashboardFinanceiroData(false, false);
    const end = Date.now();
    console.log(`Took ${end - start}ms`);
    console.log('Result cached?', res.cached);
    process.exit(0);
}
main();