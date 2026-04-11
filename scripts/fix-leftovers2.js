const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
        walkDir(dirPath, callback);
    } else {
        if (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js')) {
            callback(path.join(dir, f));
        }
    }
  });
}

walkDir('d:/PILOTO/VISION/src', (file) => {
  let content = fs.readFileSync(file, 'utf-8');
  if (!content.includes('db.prepare')) return;

  let changed = false;

  const prepareRegex = /const\s+(\w+)\s*=\s*db\.prepare\(([\s\S]*?)\);/g;
  let match;
  while ((match = prepareRegex.exec(content)) !== null) {
    const stmtName = match[1];
    const sql = match[2];
    
    const runRegex = new RegExp(`await\\s+${stmtName}\\.run\\((.*?)\\)`, 'g');
    if (runRegex.test(content)) {
        content = content.replace(runRegex, (rmatch, args) => {
            changed = true;
            const a = args.trim() ? `, [${args}]` : '';
            return `await db.query(${sql}${a})`;
        });
    }

    const getRegex = new RegExp(`await\\s+${stmtName}\\.get\\((.*?)\\)`, 'g');
    if (getRegex.test(content)) {
        content = content.replace(getRegex, (rmatch, args) => {
            changed = true;
            const a = args.trim() ? `, [${args}]` : '';
            return `(await db.query(${sql}${a})).rows[0]`;
        });
    }

    const allRegex = new RegExp(`await\\s+${stmtName}\\.all\\((.*?)\\)`, 'g');
    if (allRegex.test(content)) {
        content = content.replace(allRegex, (rmatch, args) => {
            changed = true;
            const a = args.trim() ? `, [${args}]` : '';
            return `(await db.query(${sql}${a})).rows`;
        });
    }

    if (changed) {
        content = content.replace(match[0], '');
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log('Fixed stmt:', file);
  }
});
