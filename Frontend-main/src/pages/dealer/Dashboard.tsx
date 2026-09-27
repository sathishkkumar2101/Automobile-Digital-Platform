import React, { useEffect, useState, useMemo } from 'react';
import api from '../../lib/api';
import type { Vehicle, Order, Appointment } from '../../types';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/ui/Card';
import { OrderStatusBadge, AppointmentStatusBadge } from '../../components/ui/Badge';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/format';
import { useDealer } from '../../contexts/DealerContext';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="text-white font-medium">{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

export default function DealerDashboard() {
  const { dealerId, dealerName, location, isLoading: isDealerLoading } = useDealer();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dealerId) return;

    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.get<Vehicle[]>(`/dealers/${dealerId}/vehicles`),
      api.get<Order[]>(`/dealers/orders/${dealerId}`),
      api.get<Appointment[]>('/api/appointments'),
    ])
      .then(([vehiclesRes, ordersRes, appointmentsRes]) => {
        if (vehiclesRes.status === 'fulfilled') {
          const v = vehiclesRes.value;
          setVehicles(Array.isArray(v) ? v : (v as any).content ?? []);
        } else {
          setVehicles([]);
        }

        if (ordersRes.status === 'fulfilled') {
          const o = ordersRes.value;
          setOrders(Array.isArray(o) ? o : (o as any).content ?? []);
        } else {
          setOrders([]);
        }

        if (appointmentsRes.status === 'fulfilled') {
          const a = appointmentsRes.value;
          setAppointments(Array.isArray(a) ? a : (a as any).content ?? []);
        } else {
          setAppointments([]);
        }
      })
      .catch(err => {
        console.error('Failed to load dashboard data:', err);
        setError('Failed to load some dashboard metrics.');
      })
      .finally(() => setLoading(false));
  }, [dealerId]);

  const available = vehicles.filter(v => v.status === 'AVAILABLE').length;
  const reserved = vehicles.filter(v => v.status === 'RESERVED').length;
  const sold = vehicles.filter(v => v.status === 'SOLD').length;

  const pending = orders.filter(o =>
    o.status === 'CREATED' || o.status === 'CONFIRMED' || o.status === 'IN_PRODUCTION' || o.status === 'SHIPPED'
  ).length;

  const now = new Date();
  const nonCancelledOrders = orders.filter(o => o.status !== 'CANCELLED');
  const revenueMTD = nonCancelledOrders
    .filter(o => {
      if (!o.createdAt) return true;
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc, o) => acc + (o.totalAmount || 0), 0);

  const monthlyRevenueData = useMemo(() => {
    if (!nonCancelledOrders.length) return [];
    const monthsMap: Record<string, { month: string; revenue: number; units: number }> = {};
    nonCancelledOrders.forEach(order => {
      const date = order.createdAt ? new Date(order.createdAt) : new Date();
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = { month: monthKey, revenue: 0, units: 0 };
      }
      monthsMap[monthKey].revenue += order.totalAmount || 0;
      monthsMap[monthKey].units += 1;
    });
    return Object.values(monthsMap);
  }, [nonCancelledOrders]);

  if (isDealerLoading || (loading && !dealerId)) {
    return (
      <div>
        <PageHeader
          title="Operations Dashboard"
          subtitle="Loading dealership metrics..."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={dealerName ? `${dealerName} — Operations Dashboard` : 'Operations Dashboard'}
        subtitle={location ? `Real-time overview for ${location} dealership` : 'Real-time overview of your dealership performance'}
      />

      {error && (
        <div className="mb-6 p-4 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards — No fake percentage changes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Total Inventory" value={vehicles.length} />
        <KpiCard label="Available" value={available} />
        <KpiCard label="Active Orders" value={pending} />
        <KpiCard label="Revenue (MTD)" value={formatCurrency(revenueMTD, true)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Real Monthly Revenue Chart */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded p-5">
          <div className="flex items-center justify-between mb-5">
            <p className="font-display text-base font-semibold text-white">Monthly Revenue</p>
            <p className="text-xs text-zinc-500 font-mono">Actual order volume</p>
          </div>
          {monthlyRevenueData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
              No revenue recorded yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyRevenueData} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: '#71717A', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: any) => formatCurrency(v, true)}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="revenue" fill="#C4A84F" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Real Inventory Status */}
        <div className="bg-zinc-900 border border-zinc-800 rounded p-5">
          <p className="font-display text-base font-semibold text-white mb-4">Inventory Status</p>
          <div className="space-y-3">
            {[
              { label: 'Available', count: available, color: 'bg-green-500' },
              { label: 'Reserved', count: reserved, color: 'bg-amber-500' },
              { label: 'Sold', count: sold, color: 'bg-zinc-600' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm text-zinc-400">{item.label}</span>
                  <span className="text-sm font-mono text-white">{item.count}</span>
                </div>
                <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-300`}
                    style={{ width: `${vehicles.length > 0 ? (item.count / vehicles.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-zinc-900 border border-zinc-800 rounded">
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="font-display text-base font-semibold text-white">Recent Orders</p>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {orders.length === 0 ? (
              <p className="text-zinc-600 text-sm py-6 px-5 text-center">No orders found for this dealership</p>
            ) : (
              orders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-white">{order.vehicle?.model || `Order #${order.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-zinc-600 font-mono">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <OrderStatusBadge status={order.status} />
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{formatCurrency(order.totalAmount)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="bg-zinc-900 border border-zinc-800 rounded">
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="font-display text-base font-semibold text-white">Upcoming Service</p>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {appointments.length === 0 ? (
              <p className="text-zinc-600 text-sm py-6 px-5 text-center">No service appointments scheduled</p>
            ) : (
              appointments.slice(0, 5).map(appt => (
                <div key={appt.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-white capitalize">{appt.serviceType?.toLowerCase().replace(/_/g, ' ') || 'Service'}</p>
                    <p className="text-xs text-zinc-600 font-mono">{formatDateTime(appt.appointmentDate)}</p>
                  </div>
                  <AppointmentStatusBadge status={appt.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
