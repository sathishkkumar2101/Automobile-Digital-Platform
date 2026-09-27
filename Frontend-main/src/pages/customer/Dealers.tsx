import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { SearchInput } from '../../components/ui/Input';
import api from '../../lib/api';
import type { Dealer, PageResponse, Vehicle } from '../../types';

export default function CustomerDealers() {
  const navigate = useNavigate();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<PageResponse<Dealer> | Dealer[]>('/dealers').catch(() => [] as Dealer[]),
      api.get<PageResponse<Vehicle> | Vehicle[]>('/api/vehicles').catch(() => [] as Vehicle[]),
    ])
      .then(([d, v]) => {
        setDealers(Array.isArray(d) ? d : d.content ?? []);
        setVehicles(Array.isArray(v) ? v : v.content ?? []);
      })
      .catch(() => setDealers([]))
      .finally(() => setLoading(false));
  }, []);

  const vehicleCount = (dealerId: string) => vehicles.filter(v => v.dealerId === dealerId).length;

  const filtered = dealers.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) || (d.location ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Authorized Dealers"
        subtitle="Find a certified AutoPrime dealer near you"
        breadcrumbs={[{ label: 'Customer' }, { label: 'Dealers' }]}
      />
      <div className="w-64 mb-6">
        <SearchInput placeholder="Search dealers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded p-5 space-y-2">
                <div className="h-5 bg-zinc-800 rounded animate-pulse w-3/4" />
                <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
              </div>
            ))
          : filtered.map(dealer => (
              <div
                key={dealer.dealerId}
                onClick={() => navigate(`/customer/dealers/${dealer.dealerId}`)}
                className="bg-zinc-900 border border-zinc-800 rounded p-5 cursor-pointer hover:border-zinc-600 transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                  </div>
                </div>
                <p className="font-display text-base font-semibold text-white mb-1">{dealer.name}</p>
                {dealer.location && <p className="text-xs text-zinc-500">{dealer.location}</p>}
                {vehicleCount(dealer.dealerId) > 0 && (
                  <p className="text-xs text-zinc-600 mt-2">{vehicleCount(dealer.dealerId)} vehicles in inventory</p>
                )}
                <p className="text-xs text-amber-400 mt-3 group-hover:text-amber-300 transition-colors">View dealer →</p>
              </div>
            ))}
      </div>
    </div>
  );
}
