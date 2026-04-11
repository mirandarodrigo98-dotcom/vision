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

  // Fix pluck
  content = content.replace(/await db\.prepare\((.*?)\)\.pluck\(\)\.get\((.*?)\)/g, (match, sql, args) => {
    changed = true;
    const a = args.trim() ? `, [${args}]` : '';
    return `Object.values((await db.query(${sql}${a})).rows[0] || {})[0]`;
  });

  content = content.replace(/await db\.prepare\((.*?)\)\.pluck\(\)\.get\(\)/g, (match, sql) => {
    changed = true;
    return `Object.values((await db.query(${sql})).rows[0] || {})[0]`;
  });

  // Basic replacements
  content = content.replace(/await db\.prepare\(([\s\S]*?)\)\.run\((.*?)\)/g, (match, sql, args) => {
      changed = true;
      const a = args.trim() ? `, [${args}]` : '';
      return `await db.query(${sql}${a})`;
  });

  content = content.replace(/await db\.prepare\(([\s\S]*?)\)\.get\((.*?)\)/g, (match, sql, args) => {
      changed = true;
      const a = args.trim() ? `, [${args}]` : '';
      return `(await db.query(${sql}${a})).rows[0]`;
  });

  content = content.replace(/await db\.prepare\(([\s\S]*?)\)\.all\((.*?)\)/g, (match, sql, args) => {
      changed = true;
      const a = args.trim() ? `, [${args}]` : '';
      return `(await db.query(${sql}${a})).rows`;
  });

  if (changed) {
    fs.writeFileSync(file, content, 'utf-8');
    console.log('Fixed:', file);
  }
});
