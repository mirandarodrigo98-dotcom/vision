const { execSync } = require('child_process');
const fs = require('fs');
try {
  const stdout = execSync('git log -n 3 -p -- src/components/integrations/eklesia/transactions-manager.tsx');
  fs.writeFileSync('git_log.txt', stdout);
  console.log('done');
} catch (e) {
  console.error(e);
}
