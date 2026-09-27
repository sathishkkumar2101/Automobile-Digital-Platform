import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { SearchInput, Select } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import { LoadError } from '../../components/ui/LoadError';
import { useLoadFailures } from '../../hooks/useLoadFailures';
import { formatCurrency, formatDate } from '../../lib/format';
import api from '../../lib/api';
import type { Order, OrderStatus, Dealer, PageResponse } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'CREATED', label: 'Created' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PRODUCTION', label: 'In Production' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminOrders() {
  const { success, error } = useToast();
  const { failures, clear, retry, guard, has, reloadToken } = useLoadFailures();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dealerFilter, setDealerFilter] = useState('');
  const [page, setPage] = useState(0);

  // Status update modal / drawer
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('CREATED');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [page, reloadToken]);

  function fetchOrders() {
    setLoading(true);
    clear();
    Promise.all([
      guard<PageResponse<Order> | Order[]>('orders')(
        api.get<PageResponse<Order> | Order[]>('/api/v1/orders')),
      guard<Dealer[]>('dealers')(api.get<Dealer[]>('/dealers')),
    ]).then(([o, d]) => {
      setOrders(Array.isArray(o) ? o : (o as any).content ?? []);
      setDealers(Array.isArray(d) ? d : (d as any).content ?? []);
    }).finally(() => setLoading(false));
  }

  const dealerOptions = [
    { value: '', label: 'All Dealers' },
    ...dealers.map(d => ({ value: d.dealerId, label: d.name }))
  ];

  const filtered = orders.filter(o => {
    if (search && !String(o.id).toLowerCase().includes(search.toLowerCase())) return false;
    if (status && o.status !== status) return false;
    if (dealerFilter && o.dealerId !== dealerFilter) return false;
    return true;
  });

  function openOrderModal(order: Order) {
    setSelectedOrder(order);
    setNewStatus(order.status);
  }

  async function handleUpdateStatus() {
    if (!selectedOrder) return;
    setUpdating(true);
    try {
      await api.put(`/api/v1/orders/${selectedOrder.id}`, {
        ...selectedOrder,
        status: newStatus,
      });
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: newStatus } : o));
      success(`Order status updated to ${newStatus}`);
      setSelectedOrder(null);
    } catch (err: any) {
      error(err.message || 'Failed to update order status.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>

{failures.length > 0 && (
  <div className="mb-4 space-y-3">
    {failures.map((failure, i) => (
      <LoadError key={i} resource={failure.resource} error={failure.error} onRetry={retry} />
    ))}
  </div>
)}

<PageHeader title="Orders" subtitle="All platform vehicle purchase orders and delivery lifecycles" breadcrumbs={[{ label: 'Admin' }, { label: 'Orders' }]} />
      
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-52"><SearchInput placeholder="Search by order ID…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="w-40"><Select options={STATUS_OPTIONS} value={status} onChange={e => setStatus(e.target.value)} /></div>
        <div className="w-44"><Select options={dealerOptions} value={dealerFilter} onChange={e => setDealerFilter(e.target.value)} /></div>
        <span className="text-xs text-zinc-600 self-center ml-auto font-mono">{filtered.length} orders</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * 10, (page + 1) * 10)}
          keyExtractor={o => o.id}
          emptyMessage={has('orders') ? 'Could not load orders' : 'No orders found'}
          columns={[
            { key: 'id', header: 'Order #', width: '120px', render: o => <span className="font-mono text-xs text-zinc-400">#{o.id.slice(0, 8)}</span> },
            { key: 'vehicle', header: 'Vehicle', render: o => (
              <div>
                <p className="text-white font-medium">{o.vehicle?.model || 'Vehicle'}</p>
              </div>
            )},
            { key: 'customer', header: 'Customer', render: o => (
              <span className="text-zinc-300 text-sm">{o.customer ? o.customer.name : `Customer #${o.customerId.slice(0, 8)}`}</span>
            )},
            { key: 'amount', header: 'Amount', align: 'right', render: o => <span className="font-mono">{formatCurrency(o.totalAmount)}</span> },
            { key: 'status', header: 'Status', render: o => <OrderStatusBadge status={o.status} /> },
            { key: 'date', header: 'Date', render: o => <span className="text-zinc-500 text-xs font-mono">{formatDate(o.createdAt)}</span> },
            { key: 'actions', header: '', align: 'right', render: o => (
              <button
                onClick={() => openOrderModal(o)}
                className="text-amber-400 hover:text-amber-300 text-xs font-mono px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                Manage Status
              </button>
            )},
          ]}
        />
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / 10))} totalElements={filtered.length} pageSize={10} onPageChange={setPage} />
      </div>

      {/* Order Status Update Modal */}
      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title="Order Lifecycle Management">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-1 text-xs text-zinc-400 font-mono">
              <p><span className="text-zinc-600">Order ID:</span> {selectedOrder.id}</p>
              <p><span className="text-zinc-600">Total Amount:</span> {formatCurrency(selectedOrder.totalAmount)}</p>
              <p><span className="text-zinc-600">Current Status:</span> {selectedOrder.status}</p>
            </div>

            <Select
              label="Transition Status To:"
              options={[
                { value: 'CREATED', label: 'CREATED — Order initialized' },
                { value: 'CONFIRMED', label: 'CONFIRMED — Order approved' },
                { value: 'IN_PRODUCTION', label: 'IN_PRODUCTION — Vehicle build in progress' },
                { value: 'SHIPPED', label: 'SHIPPED — In transit to dealer' },
                { value: 'DELIVERED', label: 'DELIVERED — Handed over to customer' },
                { value: 'CANCELLED', label: 'CANCELLED — Order terminated' },
              ]}
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as OrderStatus)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button type="button" variant="secondary" onClick={() => setSelectedOrder(null)}>Cancel</Button>
              <Button type="button" onClick={handleUpdateStatus} loading={updating}>Update Order</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
