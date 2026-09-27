import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { formatCurrency, formatDate } from '../../lib/format';
import api from '../../lib/api';
import type { Order, PageResponse } from '../../types';

export default function CustomerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    api.get<PageResponse<Order> | Order[]>('/api/v1/orders')
      .then(res => setOrders(Array.isArray(res) ? res : res.content ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [page]);

  const filtered = orders.filter(o =>
    !search || String(o.id).includes(search) || o.vehicle?.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="My Orders"
        subtitle="Track your vehicle purchase orders"
        breadcrumbs={[{ label: 'Customer' }, { label: 'Orders' }]}
      />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-64">
          <SearchInput placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
          keyExtractor={o => o.id}
          emptyMessage="No orders found"
          onRowClick={o => navigate(`/customer/orders/${o.id}`)}
          columns={[
            { key: 'id', header: 'Order #', width: '100px', render: o => <span className="font-mono text-zinc-400">#{o.id}</span> },
            { key: 'vehicle', header: 'Vehicle', render: o => (
              <div>
                <p className="text-white font-medium">{o.vehicle?.model}</p>
              </div>
            )},
            { key: 'status', header: 'Status', render: o => <OrderStatusBadge status={o.status} /> },
            { key: 'amount', header: 'Total', align: 'right', render: o => <span className="font-mono">{formatCurrency(o.totalAmount)}</span> },
            { key: 'date', header: 'Placed', render: o => <span className="text-zinc-500 font-mono text-xs">{formatDate(o.createdAt)}</span> },
          ]}
        />
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} totalElements={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}
