const { execSync } = require('child_process');
const fs = require('fs');
try {
  const stdout = execSync('git show 7abe2f5 -- src/app/actions/integrations/enuves.ts src/components/integrations/enuves/transactions-manager.tsx');
  fs.writeFileSync('git_show_7abe.txt', stdout);
  console.log('done');
} catch (e) {
  console.error(e);
}
