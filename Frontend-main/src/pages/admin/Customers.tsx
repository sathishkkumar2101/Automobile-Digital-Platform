import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { OrderStatusBadge, AppointmentStatusBadge } from '../../components/ui/Badge';
import { LoadError } from '../../components/ui/LoadError';
import { initials, formatDate, formatCurrency } from '../../lib/format';
import api from '../../lib/api';
import type { Customer, Order, Appointment, PageResponse } from '../../types';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  // Selected customer for detail view
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [customerAppts, setCustomerAppts] = useState<Appointment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<{ resource: string; error: unknown }[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  function fetchCustomers() {
    setLoading(true);
    setLoadError(null);
    api.get<PageResponse<Customer> | Customer[]>('/api/v1/customers')
      .then(res => setCustomers(Array.isArray(res) ? res : res.content ?? []))
      .catch((error: unknown) => {
        setLoadError(error);
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  }

  const filtered = customers.filter(c =>
    !search || `${c.name} ${c.email} ${c.phone || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  function openCustomerDetails(customer: Customer) {
    setSelectedCustomer(customer);
    setDetailsLoading(true);
    setDetailsError([]);

    // Reported rather than swallowed. These two calls used to fall back to [],
    // so a customer's history panel could show "no orders, no appointments"
    // purely because the request had failed — indistinguishable from a customer
    // who has genuinely never bought anything or booked anything.
    const guard = <T,>(resource: string) => (promise: Promise<T>) =>
      promise.catch((error: unknown) => {
        setDetailsError(prev => [...prev, { resource, error }]);
        return [] as unknown as T;
      });

    Promise.all([
      guard<Order[]>(`${customer.name}'s orders`)(api.get<Order[]>(`/api/v1/orders/customers/${customer.id}`)),
      guard<Appointment[]>(`${customer.name}'s appointments`)(api.get<Appointment[]>(`/api/appointments/customers/${customer.id}`)),
    ]).then(([orders, appts]) => {
      setCustomerOrders(Array.isArray(orders) ? orders : (orders as any).content ?? []);
      setCustomerAppts(Array.isArray(appts) ? appts : (appts as any).content ?? []);
    }).finally(() => setDetailsLoading(false));
  }

  // A section whose request failed must not also claim it found nothing, so the
  // "no records" copy is suppressed for whichever sections are in error.
  const ordersFailed = detailsError.some(f => f.resource.endsWith("'s orders"));
  const apptsFailed = detailsError.some(f => f.resource.endsWith("'s appointments"));

  return (
    <div>
      <PageHeader title="Customers" subtitle="Platform-wide customer registry and customer activity history" breadcrumbs={[{ label: 'Admin' }, { label: 'Customers' }]} />
      <div className="w-64 mb-4">
        <SearchInput placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loadError !== null && (
        <div className="mb-4">
          <LoadError resource="customers" error={loadError} onRetry={fetchCustomers} />
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * 10, (page + 1) * 10)}
          keyExtractor={c => c.id}
          emptyMessage={loadError !== null ? 'Could not load customers' : 'No customers found'}
          columns={[
            { key: 'name', header: 'Customer', render: c => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-zinc-400">{initials(c.name)}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{c.name}</p>
                  <p className="text-xs text-zinc-500">{c.email}</p>
                </div>
              </div>
            )},
            { key: 'phone', header: 'Phone', render: c => <span className="font-mono text-xs text-zinc-400">{c.phone ?? '—'}</span> },
            { key: 'joined', header: 'Joined', render: c => <span className="text-zinc-500 text-xs font-mono">{formatDate(c.createdAt)}</span> },
            { key: 'actions', header: '', align: 'right', render: c => (
              <button
                onClick={() => openCustomerDetails(c)}
                className="text-amber-400 hover:text-amber-300 text-xs font-mono px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                View History
              </button>
            )},
          ]}
        />
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / 10))} totalElements={filtered.length} pageSize={10} onPageChange={setPage} />
      </div>

      {/* Customer Detail Drawer / Modal */}
      <Modal open={!!selectedCustomer} onClose={() => setSelectedCustomer(null)} title={selectedCustomer?.name || 'Customer Details'}>
        {selectedCustomer && (
          <div className="space-y-6">
            {detailsError.map((failure, i) => (
              <LoadError
                key={`${failure.resource}-${i}`}
                resource={failure.resource}
                error={failure.error}
                onRetry={() => openCustomerDetails(selectedCustomer)}
              />
            ))}

            <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-1 text-xs text-zinc-400 font-mono">
              <p><span className="text-zinc-600">ID:</span> {selectedCustomer.id}</p>
              <p><span className="text-zinc-600">Email:</span> {selectedCustomer.email}</p>
              <p><span className="text-zinc-600">Phone:</span> {selectedCustomer.phone || '—'}</p>
            </div>

            {/* Linked Orders */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Purchase Orders ({customerOrders.length})</h4>
              {detailsLoading ? (
                <p className="text-xs text-zinc-500 font-mono">Loading orders...</p>
              ) : customerOrders.length === 0 && !ordersFailed ? (
                <p className="text-xs text-zinc-500 font-mono">No purchase orders found for this customer.</p>
              ) : customerOrders.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {customerOrders.map(o => (
                    <div key={o.id} className="bg-zinc-950 p-3 rounded border border-zinc-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-white font-medium">{o.vehicle?.model || 'Vehicle Order'}</p>
                        <p className="text-zinc-500 font-mono">{formatDate(o.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <OrderStatusBadge status={o.status} />
                        <span className="font-mono text-zinc-300">{formatCurrency(o.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Linked Appointments */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-2">Service Appointments ({customerAppts.length})</h4>
              {detailsLoading ? (
                <p className="text-xs text-zinc-500 font-mono">Loading appointments...</p>
              ) : customerAppts.length === 0 && !apptsFailed ? (
                <p className="text-xs text-zinc-500 font-mono">No appointments found for this customer.</p>
              ) : customerAppts.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {customerAppts.map(a => (
                    <div key={a.id} className="bg-zinc-950 p-3 rounded border border-zinc-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-white font-medium capitalize">{a.serviceType.toLowerCase().replace(/_/g, ' ')}</p>
                        <p className="text-zinc-500 font-mono">{formatDate(a.scheduledDate || a.appointmentDate)}</p>
                      </div>
                      <AppointmentStatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
