const { execSync } = require('child_process');
try {
  const out = execSync('git --no-pager log -p -n 5 -- src/components/integrations/eklesia/transactions-manager.tsx src/app/actions/integrations/eklesia.ts', { env: { ...process.env, GIT_PAGER: 'cat' } }).toString();
  require('fs').writeFileSync('diff.txt', out);
  console.log('done');
} catch(e) {
  console.error(e);
}