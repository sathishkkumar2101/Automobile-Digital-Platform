const fs = require('fs');

const files = [
  'src/pages/admin/Appointments.tsx',
  'src/pages/admin/Customers.tsx',
  'src/pages/admin/Dealers.tsx',
  'src/pages/admin/Orders.tsx',
  'src/pages/admin/Users.tsx',
  'src/pages/admin/Vehicles.tsx',
  'src/pages/customer/Appointments.tsx',
  'src/pages/customer/Dealers.tsx',
  'src/pages/customer/Orders.tsx',
  'src/pages/customer/Vehicles.tsx',
  'src/pages/dealer/Appointments.tsx',
  'src/pages/dealer/Customers.tsx',
  'src/pages/dealer/Inventory.tsx',
  'src/pages/dealer/Orders.tsx'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  c = c.replace(/\.catch\(\(\) => set([A-Za-z]+)\(.*?\)\)/g, (match, p1) => {
    return `.catch(() => set${p1}([]))`;
  });
  
  fs.writeFileSync(f, c);
});

// Also remove mock objects from Dashboard pages
const dashboards = [
  'src/pages/admin/Dashboard.tsx',
  'src/pages/customer/Dashboard.tsx',
  'src/pages/dealer/Dashboard.tsx'
];

dashboards.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/MOCK_[A-Z_]+/g, '[]');
  fs.writeFileSync(f, c);
});

console.log('Removed mock catch blocks');
