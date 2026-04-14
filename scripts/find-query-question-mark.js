const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fileLoc = path.join(dir, file);
    const stat = fs.statSync(fileLoc);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fileLoc));
    } else if (fileLoc.endsWith('.ts') || fileLoc.endsWith('.tsx')) {
      results.push(fileLoc);
    }
  });
  return results;
}

const files = walk('src/app/actions');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.match(/query\s*\+=\s*`[^`]*\?/) || content.match(/sql\s*\+=\s*`[^`]*\?/)) {
    console.log("MATCH IN: " + file);
  }
});