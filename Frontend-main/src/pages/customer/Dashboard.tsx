import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { KpiCard } from '../../components/ui/Card';
import { OrderStatusBadge, AppointmentStatusBadge } from '../../components/ui/Badge';
import { LoadError } from '../../components/ui/LoadError';
import { useLoadFailures } from '../../hooks/useLoadFailures';
import { formatCurrency, formatDate } from '../../lib/format';

import api from '../../lib/api';
import type { Order, Appointment, Vehicle } from '../../types';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { failures, guard, has, retry } = useLoadFailures();
  const [orders, setOrders] = useState<Order[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vehicleCount, setVehicleCount] = useState<number>(0);
  const [dealerCount, setDealerCount] = useState<number>(0);
  const [featured, setFeatured] = useState<Vehicle | null>(null);
  const heroImage = featured?.images?.[0] ?? featured?.image ?? null;

  useEffect(() => {
    guard('orders')(api.get<Order[]>('/api/v1/orders'))
      .then(res => setOrders(Array.isArray(res) ? res : (res as any).content ?? []));
    guard('appointments')(api.get<Appointment[]>('/api/appointments'))
      .then(res => setAppointments(Array.isArray(res) ? res : (res as any).content ?? []));
    guard('vehicles')(api.get<Vehicle[]>('/api/vehicles')).then(res => {
      const arr = Array.isArray(res) ? res : (res as any).content ?? [];
      const available = arr.filter((v: any) => v.status === 'AVAILABLE');
      // Count only what is actually available. The `|| arr.length` this replaces
      // reported the entire catalogue under the label "Vehicles Available" the
      // moment the available set hit zero, so a showroom with nothing in stock
      // advertised all of its sold cars as available.
      setVehicleCount(available.length);
      // Hero content is taken from the same response rather than written into
      // the component, so the promotion cannot advertise a model, price or
      // image that inventory no longer contains. Highest priced available
      // vehicle, which is the deterministic choice for a "featured" slot.
      setFeatured(available.length > 0
        ? [...available].sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0))[0]
        : null);
    });
    guard('dealers')(api.get<any[]>('/dealers')).then(res => {
      const arr = Array.isArray(res) ? res : (res as any).content ?? [];
      setDealerCount(arr.length);
    });
  }, [retry]);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name ?? 'there'}`}
        subtitle="Here's an overview of your automotive journey"
      />

      {/* A KPI reading 0 is a claim about the business, so it is only shown when
          the request behind it actually succeeded. These used to swallow their
          errors and render a confident 0, which during an outage stated that the
          customer had no orders, no appointments, no stock and no dealers — four
          false facts at the top of the page. Each affected tile now reads "—" and
          the banners above say which figures are missing. */}
      {failures.length > 0 && (
        <div className="space-y-2 mb-6">
          {failures.map(failure => (
            <LoadError
              key={failure.resource}
              resource={failure.resource}
              error={failure.error}
              impact="Its figure below is shown as a dash rather than as a zero."
              onRetry={retry}
            />
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active Orders" value={has('orders') ? '—' : orders.filter(o => o.status !== 'CANCELLED' && o.status !== 'DELIVERED').length} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>} />
        <KpiCard label="Appointments" value={has('appointments') ? '—' : appointments.length} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>} />
        <KpiCard label="Vehicles Available" value={has('vehicles') ? '—' : vehicleCount} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>} />
        <KpiCard label="Partner Dealers" value={has('dealers') ? '—' : dealerCount} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A3.993 3.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a3.993 3.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>} />
      </div>


      {/* Hero vehicle promo — rendered only from a vehicle that is actually in
          stock. Previously a fixed "2025 BMW 7 Series 740i xDrive … From
          ₹1.45 Crore" was written into the markup with a matching local image,
          so it kept advertising that model and price no matter what the
          inventory service returned, including when the request failed. */}
      {featured && (
      <div className="relative rounded overflow-hidden mb-8 h-52 bg-zinc-800">
        {/* No stock image is substituted when the record has none. The app's
            other vehicle surfaces fall back to a fixed model photo, which means
            an X5 with no image on file gets a photograph of a 7 Series. Here
            the panel simply stays a neutral surface instead of mislabelling
            the car. */}
        {heroImage && (
          <img
            src={heroImage}
            alt={featured.model}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/50 to-transparent" />
        <div className="absolute inset-0 flex items-center px-8">
          <div>
            <p className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-2">Featured This Week</p>
            <p className="font-display text-3xl font-bold text-white mb-1">{featured.model}</p>
            <p className="text-zinc-400 text-sm mb-4">
              {[featured.trim, featured.bodyType, featured.fuelType, featured.transmission]
                .filter(Boolean)
                .join(' · ') || 'Available now'}
              {typeof featured.price === 'number' ? ` · ${formatCurrency(featured.price)}` : ''}
            </p>
            <Link
              to="/customer/vehicles"
              className="inline-flex items-center gap-2 h-9 px-5 bg-white text-zinc-900 text-sm font-semibold rounded hover:bg-zinc-100 transition-colors"
            >
              Explore Vehicles
            </Link>
          </div>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="bg-zinc-900 border border-zinc-800 rounded">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="font-display text-base font-semibold text-white">Recent Orders</h2>
            <Link to="/customer/orders" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">View all</Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {orders.length === 0 ? (
              <p className="text-zinc-600 text-sm py-4 px-5">
                {has('orders') ? 'Could not be loaded' : 'No recent orders'}
              </p>
            ) : orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-white">{order.vehicle?.model || 'Vehicle Order'}</p>
                  <p className="text-xs text-zinc-600 font-mono">#{order.id} · {formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <OrderStatusBadge status={order.status} />
                  <p className="text-xs text-zinc-600 mt-1">{formatCurrency(order.totalAmount)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming appointments */}
        <div className="bg-zinc-900 border border-zinc-800 rounded">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <h2 className="font-display text-base font-semibold text-white">Service Appointments</h2>
            <Link to="/customer/appointments" className="text-xs text-amber-400 hover:text-amber-300 transition-colors">View all</Link>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {appointments.length === 0 ? (
              <p className="text-zinc-600 text-sm py-4 px-5">
                {has('appointments') ? 'Could not be loaded' : 'No upcoming appointments'}
              </p>
            ) : appointments.slice(0, 5).map(appt => (
              <div key={appt.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-white capitalize">{appt.serviceType.toLowerCase().replace(/_/g, ' ')}</p>
                  <p className="text-xs text-zinc-600 font-mono">{formatDate(appt.appointmentDate || appt.scheduledDate)}</p>
                </div>
                <AppointmentStatusBadge status={appt.status} />
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-zinc-800">
            <Link
              to="/customer/appointments/book"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            >
              + Book new appointment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
