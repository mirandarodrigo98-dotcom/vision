const { execSync } = require('child_process');
try {
  execSync('git add src/app/actions/integrations/enuves.ts src/components/integrations/enuves/transactions-manager.tsx');
  execSync('git commit -m "fix: formatacao da data no enuves corrigida igual ao eklesia"');
  execSync('git push');
  console.log('Git push successful');
} catch (e) {
  console.error(e.stdout ? e.stdout.toString() : e.message);
  console.error(e.stderr ? e.stderr.toString() : '');
}
