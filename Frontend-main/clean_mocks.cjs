const fs = require('fs');

function removeMocks(file, regexToRemove) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(regexToRemove, '');
  
  // also replace any occurrences of MOCK_X.length with filtered.length
  c = c.replace(/MOCK_[A-Z]+\.length/g, 'filtered.length');
  
  // and for Profile.tsx
  if (file.includes('Profile.tsx')) {
    c = c.replace(/const dealer = MOCK_DEALERS\[0\];/g, 'const dealer = null;'); // or similar
  }
  
  fs.writeFileSync(file, c);
}

removeMocks('src/pages/admin/Users.tsx', /const MOCK_USERS: User\[\] = \[[\s\S]*?\];\n\n/);
removeMocks('src/pages/dealer/Customers.tsx', /const MOCK_CUSTOMERS: Customer\[\] = \[[\s\S]*?\];\n\n/);
removeMocks('src/pages/dealer/Inventory.tsx', /const MOCK_VEHICLES/); // Just the length part is replaced above
removeMocks('src/pages/dealer/Profile.tsx', /const MOCK_DEALERS/);

// Remove unused mock imports everywhere
const files = [
  'src/pages/admin/Appointments.tsx',
  'src/pages/admin/Dealers.tsx',
  'src/pages/admin/Orders.tsx',
  'src/pages/admin/Vehicles.tsx',
  'src/pages/customer/Appointments.tsx',
  'src/pages/customer/DealerDetail.tsx',
  'src/pages/customer/Dealers.tsx',
  'src/pages/customer/OrderDetail.tsx',
  'src/pages/customer/Orders.tsx',
  'src/pages/customer/VehicleDetail.tsx',
  'src/pages/customer/Vehicles.tsx',
  'src/pages/dealer/Appointments.tsx',
  'src/pages/dealer/Inventory.tsx',
  'src/pages/dealer/Orders.tsx',
  'src/pages/dealer/Profile.tsx',
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/import \{ MOCK_[A-Z]+ \} from '\.\.\/\.\.\/lib\/mock';\n/g, '');
  c = c.replace(/import \{ MOCK_[A-Z]+, [A-Z_]+ \} from '\.\.\/\.\.\/lib\/mock';\n/g, 'import { VEHICLE_IMAGES } from \'../../lib/mock\';\n');
  fs.writeFileSync(f, c);
});

console.log('Cleaned up remaining mocks in pages');
