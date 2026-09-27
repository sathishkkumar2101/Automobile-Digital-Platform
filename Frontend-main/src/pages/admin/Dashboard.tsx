import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import type { User, Customer, Dealer, Vehicle, Order, Appointment } from '../../types';

import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/ui/Card';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { LoadError } from '../../components/ui/LoadError';
import { DashboardSkeleton } from '../../components/ui/Skeleton';
import { formatCurrency, formatDate } from '../../lib/format';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailures, setLoadFailures] = useState<{ resource: string; error: unknown }[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    setLoading(true);
    setLoadFailures([]);

    // Each request reports its own failure instead of resolving to an empty
    // array. The page still renders whatever did load, but the operator is
    // told which section is missing data rather than being shown a dashboard
    // full of zeroes that reads as a healthy, empty system.
    const guard = <T,>(resource: string) => (promise: Promise<T>) =>
      promise.catch((error: unknown) => {
        setLoadFailures(prev => [...prev, { resource, error }]);
        return [] as unknown as T;
      });

    Promise.all([
      guard<User[]>('users')(api.get<User[]>('/api/users')),
      guard<Customer[]>('customers')(api.get<Customer[]>('/api/v1/customers')),
      guard<Dealer[]>('dealers')(api.get<Dealer[]>('/dealers')),
      guard<Vehicle[]>('vehicles')(api.get<Vehicle[]>('/api/vehicles')),
      guard<Order[]>('orders')(api.get<Order[]>('/api/v1/orders')),
      guard<Appointment[]>('appointments')(api.get<Appointment[]>('/api/appointments')),
    ]).then(([u, c, d, v, o, a]) => {
      setUsers(Array.isArray(u) ? u : (u as any).content ?? []);
      setCustomers(Array.isArray(c) ? c : (c as any).content ?? []);
      setDealers(Array.isArray(d) ? d : (d as any).content ?? []);
      setVehicles(Array.isArray(v) ? v : (v as any).content ?? []);
      setOrders(Array.isArray(o) ? o : (o as any).content ?? []);
      setAppointments(Array.isArray(a) ? a : (a as any).content ?? []);
    }).finally(() => setLoading(false));
  }, [reloadToken]);

  const totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const pendingOrdersCount = orders.filter(o => 
    o.status === 'CREATED' || (o.status as string) === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'IN_PRODUCTION'
  ).length;

  const availableVehiclesCount = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const reservedVehiclesCount = vehicles.filter(v => v.status === 'RESERVED').length;
  const soldVehiclesCount = vehicles.filter(v => v.status === 'SOLD').length;

  const pieData = [
    { name: 'Available', value: availableVehiclesCount, color: '#22C55E' },
    { name: 'Reserved', value: reservedVehiclesCount, color: '#F59E0B' },
    { name: 'Sold', value: soldVehiclesCount, color: '#71717A' },
  ];

  return (
    <div>
      <PageHeader title="Platform Control Center" subtitle="Enterprise-wide performance and management overview" />

      {loadFailures.length > 0 && (
        <div className="mb-6 space-y-3">
          {loadFailures.map((failure, i) => (
            <LoadError
              key={`${failure.resource}-${i}`}
              resource={failure.resource}
              error={failure.error}
              onRetry={() => setReloadToken(t => t + 1)}
            />
          ))}
        </div>
      )}

      {/* `loading` was tracked but never consulted, so the KPI cards painted
          zeros and the inventory panel painted "No vehicle data available" from
          the first frame until the requests resolved. Those are the same
          strings a genuinely empty system produces, so the dashboard briefly
          asserted a fact it had not established yet. */}
      {loading ? (
        <DashboardSkeleton />
      ) : (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Users" value={users.length} />
        <KpiCard label="Active Vehicles" value={vehicles.length} />
        <KpiCard label="Total Orders" value={orders.length} />
        <KpiCard label="Total Revenue" value={formatCurrency(totalRevenue, true)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Vehicle status donut */}
        <div className="bg-zinc-900 border border-zinc-800 rounded p-5">
          <p className="font-display text-base font-semibold text-white mb-4">Vehicle Inventory Breakdown</p>
          {vehicles.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500 font-mono">No vehicle data available</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-zinc-400">{item.name}</span>
                    </div>
                    <span className="font-mono text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Platform Overview */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded p-5">
          <p className="font-display text-base font-semibold text-white mb-4">System Operational Status</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Authorized Dealers</p>
              <p className="text-2xl font-bold text-white font-mono mt-1">{dealers.length}</p>
              <p className="text-xs text-zinc-400 mt-2">Regional locations active</p>
            </div>
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Registered Customers</p>
              <p className="text-2xl font-bold text-white font-mono mt-1">{customers.length}</p>
              <p className="text-xs text-zinc-400 mt-2">Verified platform profiles</p>
            </div>
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Active / Pending Orders</p>
              <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{pendingOrdersCount}</p>
              <p className="text-xs text-zinc-400 mt-2">Requires processing / delivery</p>
            </div>
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-mono">Service Appointments</p>
              <p className="text-2xl font-bold text-white font-mono mt-1">{appointments.length}</p>
              <p className="text-xs text-zinc-400 mt-2">Booked across all dealerships</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <p className="font-display text-base font-semibold text-white">Recent Orders</p>
          <span className="text-xs text-zinc-600 font-mono">Real-time Platform Data</span>
        </div>
        {orders.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500 font-mono">No recent orders recorded</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="grid grid-cols-4 items-center px-5 py-3.5 text-sm">
                <div>
                  <p className="text-white font-medium">{order.vehicle?.model || 'Vehicle'}</p>
                  <p className="text-xs text-zinc-600 font-mono">#{order.id.slice(0, 8)}</p>
                </div>
                <div className="text-zinc-400 text-xs truncate">
                  {order.customer?.name ? order.customer.name : `Customer ${order.customerId?.slice(0, 8)}`}
                </div>
                <div><OrderStatusBadge status={order.status} /></div>
                <div className="text-right font-mono text-zinc-300">{formatCurrency(order.totalAmount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
