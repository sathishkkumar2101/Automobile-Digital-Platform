const fs = require('fs');
function fix(f, r) {
  let c = fs.readFileSync(f, 'utf8');
  r.forEach(x => c = c.replace(x[0], x[1]));
  fs.writeFileSync(f, c);
}

fix('src/components/ui/Badge.tsx', [
  [/const APPOINTMENT_STATUS: Record<AppointmentStatus, \{ variant: BadgeVariant; label: string \}> = \{/, 'const APPOINTMENT_STATUS: Record<AppointmentStatus, { variant: BadgeVariant; label: string }> = {\n  REQUESTED: { variant: \'warning\', label: \'Requested\' },']
]);

fix('src/pages/admin/Customers.tsx', [
  [/id: \d+,/g, 'id: "uuid-c-x",']
]);
fix('src/pages/dealer/Customers.tsx', [
  [/id: \d+,/g, 'id: "uuid-c-x",']
]);

fix('src/pages/admin/Users.tsx', [
  [/id: \d+,/g, 'id: "uuid-u-x",']
]);

fix('src/pages/admin/Dashboard.tsx', [
  [/tickFormatter=\{v =>/g, 'tickFormatter={(v: any) =>']
]);
fix('src/pages/dealer/Dashboard.tsx', [
  [/tickFormatter=\{v =>/g, 'tickFormatter={(v: any) =>']
]);
console.log('Fixed remaining errors!');
