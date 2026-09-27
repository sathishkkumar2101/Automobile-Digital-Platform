const fs = require('fs');

function fixAdminDashboard() {
  let c = fs.readFileSync('src/pages/admin/Dashboard.tsx', 'utf8');
  
  const imports = `import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import type { User, Customer, Dealer, Vehicle, Order, Appointment } from '../../types';\n`;
  
  c = c.replace(/import React from 'react';/, imports);
  
  const stateHooks = `  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    api.get<User[]>('/api/users').then(res => setUsers(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
    api.get<Customer[]>('/api/v1/customers').then(res => setCustomers(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
    api.get<Dealer[]>('/dealers').then(res => setDealers(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
    api.get<Vehicle[]>('/api/vehicles').then(res => setVehicles(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
    api.get<Order[]>('/api/v1/orders').then(res => setOrders(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
    api.get<Appointment[]>('/api/appointments').then(res => setAppointments(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
  }, []);
`;
  
  c = c.replace(/export default function AdminDashboard\(\) {\n/, `export default function AdminDashboard() {\n${stateHooks}`);
  
  c = c.replace(/value="1,284"/, `value={users.length}`);
  c = c.replace(/value="240"/, `value={vehicles.length}`);
  c = c.replace(/value="3,891"/, `value={orders.length}`);
  c = c.replace(/value=\{formatCurrency\(18500000, true\)\}/, `value={formatCurrency(orders.reduce((acc, o) => acc + o.totalAmount, 0), true)}`);
  
  c = c.replace(/value="18"/, `value={dealers.length}`);
  c = c.replace(/value="847"/, `value={customers.length}`);
  c = c.replace(/value="389"/, `value={appointments.length}`);
  
  c = c.replace(/\[\]\.map\(order =>/, `orders.slice(0, 5).map(order =>`);
  
  fs.writeFileSync('src/pages/admin/Dashboard.tsx', c);
}

function fixDealerDashboard() {
  let c = fs.readFileSync('src/pages/dealer/Dashboard.tsx', 'utf8');
  
  const imports = `import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import type { Customer, Vehicle, Order, Appointment } from '../../types';\n`;
  
  c = c.replace(/import React from 'react';/, imports);
  
  const stateHooks = `  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!user) return;
    api.get<Customer[]>('/api/v1/customers').then(res => setCustomers(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
    api.get<Vehicle[]>('/api/vehicles').then(res => setVehicles(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
    api.get<Order[]>(\`/dealers/orders/\${user.id}\`).then(res => setOrders(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
    api.get<Appointment[]>('/api/appointments').then(res => setAppointments(Array.isArray(res) ? res : (res as any).content ?? [])).catch(()=>{});
  }, [user]);
`;
  
  c = c.replace(/export default function DealerDashboard\(\) {\n  const \{ user \} = useAuth\(\);\n/, `export default function DealerDashboard() {\n  const { user } = useAuth();\n${stateHooks}`);
  
  c = c.replace(/const available = \[\]\.filter/g, `const available = vehicles.filter`);
  c = c.replace(/const pending = \[\]\.filter/g, `const pending = orders.filter`);
  
  c = c.replace(/value=\{\[\]\.length\}/, `value={vehicles.length}`);
  c = c.replace(/value=\{formatCurrency\(890000, true\)\}/, `value={formatCurrency(orders.reduce((acc, o) => acc + o.totalAmount, 0), true)}`);
  
  c = c.replace(/\[\]\.map\(order =>/, `orders.slice(0, 5).map(order =>`);
  c = c.replace(/\[\]\.map\(appt =>/, `appointments.slice(0, 5).map(appt =>`);
  
  fs.writeFileSync('src/pages/dealer/Dashboard.tsx', c);
}

fixAdminDashboard();
fixDealerDashboard();
console.log('Fixed dashboards');
