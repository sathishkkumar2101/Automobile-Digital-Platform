import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { SearchInput } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { initials } from '../../lib/format';
import api from '../../lib/api';
import type { Customer } from '../../types';
import { useDealer } from '../../contexts/DealerContext';

export default function DealerCustomers() {
  const { dealerName, location, isLoading: isDealerLoading } = useDealer();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const fetchCustomers = () => {
    setLoading(true);
    setError(null);

    // Call dealer-scoped customer endpoint: only customers with orders/appointments with this dealer
    api.get<Customer[]>('/dealers/me/customers')
      .then(res => {
        setCustomers(Array.isArray(res) ? res : (res as any).content ?? []);
      })
      .catch(err => {
        console.error('Failed to load dealer customers:', err);
        setError('Failed to load customers for your dealership.');
        setCustomers([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c =>
    !search || `${c.name} ${c.email} ${c.phone ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isDealerLoading) {
    return (
      <div>
        <PageHeader
          title="Customers"
          subtitle="Loading dealership customers..."
          breadcrumbs={[{ label: 'Dealer' }, { label: 'Customers' }]}
        />
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={dealerName ? `${dealerName} — Customers` : 'Customers'}
        subtitle={location ? `Customer relationships for ${location}` : 'View and manage your customer relationships'}
        breadcrumbs={[{ label: 'Dealer' }, { label: 'Customers' }]}
      />

      {error && (
        <div className="mb-4 p-4 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={fetchCustomers}
            className="text-amber-400 hover:text-amber-300 text-xs font-medium underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      <div className="w-64 mb-4">
        <SearchInput placeholder="Search customers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * 10, (page + 1) * 10)}
          keyExtractor={c => c.id}
          emptyMessage="No customers associated with your dealership orders or appointments"
          columns={[
            {
              key: 'name',
              header: 'Customer',
              render: c => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-amber-400">{initials(c.name)}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'phone',
              header: 'Phone',
              render: c => <span className="font-mono text-xs text-zinc-400">{c.phone ?? '—'}</span>,
            },
            {
              key: 'address',
              header: 'Address',
              render: c => (
                <span className="text-zinc-400 text-xs">
                  {Array.isArray(c.address) && c.address.length > 0 ? c.address.join(', ') : '—'}
                </span>
              ),
            },
          ]}
        />
        <Pagination page={page} totalPages={Math.ceil(filtered.length / 10)} totalElements={filtered.length} pageSize={10} onPageChange={setPage} />
      </div>
    </div>
  );
}
