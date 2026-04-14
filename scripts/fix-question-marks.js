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
let changedFiles = [];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  let lines = content.split('\n');
  for (let i=0; i<lines.length; i++) {
     let line = lines[i];
     if (line.includes('query +=') || line.includes('sql +=')) {
         while (line.match(/(`[^`]*)\?([^`]*`)/)) {
             line = line.replace(/(`[^`]*)\?([^`]*`)/, '$1$$${params.length + 1}$2');
         }
         lines[i] = line;
     }
  }
  
  content = lines.join('\n');

  if (content !== original) {
    fs.writeFileSync(file, content);
    changedFiles.push(file);
    console.log("Fixed:", file);
  }
});

console.log("Total fixed:", changedFiles.length);