const fs = require('fs');
let seed = fs.readFileSync('../Vehicle-Platform-Development-Backend/user-role-service/src/main/resources/seed.sql', 'utf8');

// Replace hashes for admin, dealer1, customer1 with known working hashes (generated as $2b$ and used in PG, I'll use $2a$ format which is universally supported by BCryptPasswordEncoder)
// Wait! I actually verified that Node's $2b$ hashes WORKED perfectly in the DB. I should use exactly the $2b$ strings that worked!
seed = seed.replace(
  /'admin@bmwtechworks\.com',\s*'\$2y\$10\$xhGCk0i\/2Lg5VjZSI25HbuAs9F3bjJJN1MWtTsLKa1W5Ekv5eH7Uu'/,
  `'admin@bmwtechworks.com',\n          '$2b$10$2m1nrNuT/DJBhiYYcTebC.7Vn7WM0cWDxchSEGCa7MaJZdXkJCyEG'`
);

seed = seed.replace(
  /'dealer1@bmwtechworks\.com',\s*'\$2y\$10\$xhGCk0i\/2Lg5VjZSI25HbuAs9F3bjJJN1MWtTsLKa1W5Ekv5eH7Uu'/,
  `'dealer1@bmwtechworks.com',\n          '$2a$10$TVQXxi00lwNfHYE97V.2meOK5W3OGodUaKPh9r1fzqMSUMAv2JCFu'`
);

seed = seed.replace(
  /'customer1@bmwtechworks\.com',\s*'\$2y\$10\$xhGCk0i\/2Lg5VjZSI25HbuAs9F3bjJJN1MWtTsLKa1W5Ekv5eH7Uu'/,
  `'customer1@bmwtechworks.com',\n          '$2a$10$4GsNO91pHexPO9.fJsajJ.KsnTrFxwMjvKgfVLvAc8q2GdSeOKPdO'`
);

fs.writeFileSync('../Vehicle-Platform-Development-Backend/user-role-service/src/main/resources/seed.sql', seed);
console.log('seed.sql updated successfully.');
