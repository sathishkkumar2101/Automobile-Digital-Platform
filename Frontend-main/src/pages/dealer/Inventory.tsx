import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { VehicleStatusBadge } from '../../components/ui/Badge';
import { SearchInput, Select } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { formatCurrency, formatMileage } from '../../lib/format';
import { getVehicleImage } from '../../lib/vehicleImages';
import api from '../../lib/api';
import type { Vehicle } from '../../types';
import { useDealer } from '../../contexts/DealerContext';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'SOLD', label: 'Sold' },
];

export default function DealerInventory() {
  const { dealerId, dealerName, location, isLoading: isDealerLoading } = useDealer();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!dealerId) return;

    setLoading(true);
    setError(null);

    api.get<Vehicle[]>(`/dealers/${dealerId}/vehicles`)
      .then(res => {
        setVehicles(Array.isArray(res) ? res : (res as any).content ?? []);
      })
      .catch(err => {
        console.error('Failed to load dealer inventory:', err);
        setError('Failed to load dealership inventory. Please try again.');
        setVehicles([]);
      })
      .finally(() => setLoading(false));
  }, [dealerId]);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    if (q && !`${v.model} ${v.vin ?? ''} ${v.color ?? ''}`.toLowerCase().includes(q)) return false;
    if (status && v.status !== status) return false;
    return true;
  });

  if (isDealerLoading) {
    return (
      <div>
        <PageHeader
          title="Inventory"
          subtitle="Loading dealership stock..."
          breadcrumbs={[{ label: 'Dealer' }, { label: 'Inventory' }]}
        />
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={dealerName ? `${dealerName} — Inventory` : 'Inventory'}
        subtitle={location ? `Managing vehicle stock for ${location}` : "Manage your dealership's vehicle stock"}
        breadcrumbs={[{ label: 'Dealer' }, { label: 'Inventory' }]}
      />

      {error && (
        <div className="mb-4 p-4 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => {
              if (dealerId) {
                setLoading(true);
                api.get<Vehicle[]>(`/dealers/${dealerId}/vehicles`)
                  .then(res => setVehicles(Array.isArray(res) ? res : (res as any).content ?? []))
                  .catch(() => setError('Retry failed.'))
                  .finally(() => setLoading(false));
              }
            }}
            className="text-amber-400 hover:text-amber-300 text-xs font-medium underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-64">
          <SearchInput placeholder="Search by model, VIN, color…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-36">
          <Select options={STATUS_OPTIONS} value={status} onChange={e => setStatus(e.target.value)} />
        </div>
        <span className="text-xs text-zinc-500 ml-auto font-mono">
          {filtered.length} {filtered.length === 1 ? 'vehicle' : 'vehicles'} in stock
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
          keyExtractor={v => v.vehicleId}
          emptyMessage="No vehicles found in your dealership's inventory"
          columns={[
            {
              key: 'vehicle',
              header: 'Vehicle',
              render: v => (
                <div className="flex items-center gap-3">
                  <div className="w-14 h-10 rounded bg-zinc-800 overflow-hidden shrink-0">
                    <img
                      src={getVehicleImage(v.model)}
                      alt={v.model}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{v.model}</p>
                    {v.trim && <p className="text-xs text-zinc-500">{v.trim}</p>}
                  </div>
                </div>
              ),
            },
            { key: 'vin', header: 'VIN', render: v => <span className="font-mono text-xs text-zinc-400">{v.vin ?? '—'}</span> },
            { key: 'color', header: 'Color', render: v => <span className="text-zinc-400 text-sm">{v.color ?? '—'}</span> },
            { key: 'mileage', header: 'Mileage', align: 'right', render: v => <span className="font-mono text-xs text-zinc-300">{formatMileage(v.mileage)}</span> },
            { key: 'price', header: 'Price', align: 'right', render: v => <span className="font-mono font-medium text-white">{formatCurrency(v.price)}</span> },
            { key: 'status', header: 'Status', render: v => <VehicleStatusBadge status={v.status} /> },
          ]}
        />
        <Pagination page={page} totalPages={Math.ceil(filtered.length / PAGE_SIZE)} totalElements={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>
    </div>
  );
}
