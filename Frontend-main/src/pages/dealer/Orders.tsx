import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { SearchInput, Select } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { formatCurrency, formatDate } from '../../lib/format';
import api from '../../lib/api';
import type { Order, OrderStatus } from '../../types';
import { useDealer } from '../../contexts/DealerContext';
import { useToast } from '../../components/ui/Toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'CREATED', label: 'Created' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PRODUCTION', label: 'In Production' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const MUTABLE_STATUSES = [
  { value: 'CREATED', label: 'Created' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PRODUCTION', label: 'In Production' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function DealerOrders() {
  const { dealerId, dealerName, location, isLoading: isDealerLoading } = useDealer();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const fetchOrders = () => {
    if (!dealerId) return;
    setLoading(true);
    setError(null);

    api.get<Order[]>(`/dealers/orders/${dealerId}`)
      .then(res => {
        setOrders(Array.isArray(res) ? res : (res as any).content ?? []);
      })
      .catch(err => {
        console.error('Failed to load dealer orders:', err);
        setError('Failed to load orders for your dealership.');
        setOrders([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [dealerId]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await api.put(`/dealers/orders/${orderId}`, { status: newStatus as OrderStatus });
      success(`Order status updated to ${newStatus}`);
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as OrderStatus } : o));
    } catch (err: any) {
      console.error('Failed to update order status:', err);
      toastError('Unable to update order status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter(o => {
    if (search && !String(o.id).toLowerCase().includes(search.toLowerCase()) && !o.vehicle?.model?.toLowerCase().includes(search.toLowerCase())) return false;
    if (status && o.status !== status) return false;
    return true;
  });

  if (isDealerLoading) {
    return (
      <div>
        <PageHeader
          title="Orders"
          subtitle="Loading dealership orders..."
          breadcrumbs={[{ label: 'Dealer' }, { label: 'Orders' }]}
        />
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={dealerName ? `${dealerName} — Orders` : 'Orders'}
        subtitle={location ? `Customer purchase orders for ${location}` : 'Manage customer vehicle purchase orders'}
        breadcrumbs={[{ label: 'Dealer' }, { label: 'Orders' }]}
      />

      {error && (
        <div className="mb-4 p-4 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={fetchOrders}
            className="text-amber-400 hover:text-amber-300 text-xs font-medium underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-64">
          <SearchInput placeholder="Search by order ID or vehicle…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-44">
          <Select options={STATUS_OPTIONS} value={status} onChange={e => setStatus(e.target.value)} />
        </div>
        <span className="text-xs text-zinc-500 ml-auto self-center font-mono">
          {filtered.length} {filtered.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * 10, (page + 1) * 10)}
          keyExtractor={o => o.id}
          emptyMessage="No orders found for your dealership"
          columns={[
            {
              key: 'id',
              header: 'Order #',
              width: '120px',
              render: o => <span className="font-mono text-zinc-400 text-xs">#{o.id.slice(0, 8)}</span>,
            },
            {
              key: 'vehicle',
              header: 'Vehicle',
              render: o => (
                <div>
                  <p className="text-white font-medium">{o.vehicle?.model || `Vehicle #${o.vehicleId?.slice(0, 8)}`}</p>
                </div>
              ),
            },
            {
              key: 'customer',
              header: 'Customer',
              render: o => (
                <span className="text-zinc-300">{o.customer ? o.customer.name : `Customer #${o.customerId?.slice(0, 8)}`}</span>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              render: o => <span className="font-mono text-white font-medium">{formatCurrency(o.totalAmount)}</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: o => <OrderStatusBadge status={o.status} />,
            },
            {
              key: 'updateStatus',
              header: 'Update Status',
              width: '160px',
              render: o => (
                <div className="w-36">
                  <Select
                    options={MUTABLE_STATUSES}
                    value={o.status}
                    disabled={updatingId === o.id}
                    onChange={e => handleStatusChange(o.id, e.target.value)}
                  />
                </div>
              ),
            },
            {
              key: 'date',
              header: 'Date',
              render: o => <span className="text-zinc-500 text-xs font-mono">{formatDate(o.createdAt)}</span>,
            },
          ]}
        />
        <Pagination page={page} totalPages={Math.ceil(filtered.length / 10)} totalElements={filtered.length} pageSize={10} onPageChange={setPage} />
      </div>
    </div>
  );
}
