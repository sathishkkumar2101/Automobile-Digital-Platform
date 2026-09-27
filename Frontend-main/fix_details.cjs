const fs = require('fs');
const files = [
  ['src/pages/customer/DealerDetail.tsx', 'Dealer'],
  ['src/pages/customer/OrderDetail.tsx', 'Order'],
  ['src/pages/customer/VehicleDetail.tsx', 'Vehicle']
];
files.forEach(([f, type]) => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace('.catch(() => setNotFound(true))', `.catch(() => set${type}(null))`);
  fs.writeFileSync(f, c);
});
console.log('Fixed setNotFound');
