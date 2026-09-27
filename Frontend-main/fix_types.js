import fs from 'fs';
import path from 'path';

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

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace user.firstName + user.lastName
  if (content.includes('firstName') || content.includes('lastName')) {
    content = content.replace(/user\?\.firstName/g, 'user?.name');
    content = content.replace(/user\.firstName/g, 'user.name');
    content = content.replace(/c\.firstName/g, 'c.name');
    content = content.replace(/u\.firstName/g, 'u.name');
    content = content.replace(/o\.customer\.firstName/g, 'o.customer.name');
    content = content.replace(/a\.customer\.firstName/g, 'a.customer.name');
    content = content.replace(/customer\.firstName/g, 'customer.name');
    
    // Just remove lastName usage if next to firstName, or replace with ''
    content = content.replace(/\s*\$?\{?user\?\.lastName\}?/g, '');
    content = content.replace(/\s*\$?\{?user\.lastName\}?/g, '');
    content = content.replace(/\s*\$?\{?c\.lastName\}?/g, '');
    content = content.replace(/\s*\$?\{?u\.lastName\}?/g, '');
    content = content.replace(/\s*\$?\{?o\.customer\.lastName\}?/g, '');
    content = content.replace(/\s*\$?\{?a\.customer\.lastName\}?/g, '');
    content = content.replace(/\s*\$?\{?customer\.lastName\}?/g, '');
    content = content.replace(/firstName, lastName/g, 'name');
    changed = true;
  }

  if (content.includes('vehicle.make') || content.includes('vehicle?.make') || content.includes('v.make') || content.includes('vehicle.year') || content.includes('v.year')) {
    content = content.replace(/\$?\{?vehicle\?\.make\}?\s?/g, '');
    content = content.replace(/\$?\{?vehicle\.make\}?\s?/g, '');
    content = content.replace(/\$?\{?v\.make\}?\s?/g, '');
    
    content = content.replace(/\$?\{?vehicle\?\.year\}?\s?/g, '');
    content = content.replace(/\$?\{?vehicle\.year\}?\s?/g, '');
    content = content.replace(/\$?\{?v\.year\}?\s?/g, '');
    
    // Some strings like `${v.make} ${v.model} ${v.year}` became ` ${v.model} `
    changed = true;
  }
  
  if (content.includes('vehicle.id')) {
    content = content.replace(/vehicle\.id/g, 'vehicle.vehicleId');
    content = content.replace(/v\.id/g, 'v.vehicleId');
    changed = true;
  }
  
  if (content.includes('dealer.id')) {
    content = content.replace(/dealer\.id/g, 'dealer.dealerId');
    content = content.replace(/d\.id/g, 'd.dealerId');
    changed = true;
  }

  // Profile forms
  if (file.includes('Profile.tsx') && content.includes('form.firstName')) {
    content = content.replace(/firstName:\s*user\?\.name\s*\?\?\s*'',/g, "name: user?.name ?? '',");
    content = content.replace(/lastName:\s*'',/g, ''); // we removed lastName usage
    content = content.replace(/value=\{form\.firstName\}/g, "value={form.name}");
    content = content.replace(/set\('firstName',/g, "set('name',");
    content = content.replace(/value=\{form\.lastName\}[\s\S]*?set\('lastName',.*?\}/g, "");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
  }
});
console.log('Done');
