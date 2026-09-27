const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src/pages');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.match(/\?page=\$\{page\}&size=(10|\$\{PAGE_SIZE\})/)) {
    content = content.replace(/\(\`(.*?)\?page=\$\{page\}&size=(10|\$\{PAGE_SIZE\})\`\)/g, "('$1')");
    changed = true;
  }
  
  if (content.includes('data={filtered}')) {
    content = content.replace(/data=\{filtered\}/g, "data={filtered.slice(page * 10, (page + 1) * 10)}");
    changed = true;
  }
  
  // also need to replace PAGE_SIZE in pages that used it for slicing if they exist
  if (content.includes('PAGE_SIZE')) {
    content = content.replace(/page \* 10/g, "page * PAGE_SIZE");
    content = content.replace(/\(page \+ 1\) \* 10/g, "(page + 1) * PAGE_SIZE");
    changed = true;
  }

  // Also replace totalPages={2} or {3} with Math.ceil...
  if (content.includes('totalPages={2}') || content.includes('totalPages={3}')) {
    content = content.replace(/totalPages=\{[0-9]+\}/g, "totalPages={Math.ceil(filtered.length / 10)}");
    if (content.includes('PAGE_SIZE')) {
      content = content.replace(/totalPages=\{Math\.ceil\(filtered\.length \/ 10\)\}/g, "totalPages={Math.ceil(filtered.length / PAGE_SIZE)}");
    }
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed pagination');
