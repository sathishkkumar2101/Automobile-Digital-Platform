import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { useDealer } from '../../contexts/DealerContext';
import { initials } from '../../lib/format';
import api from '../../lib/api';
import type { Vehicle } from '../../types';

export default function DealerProfile() {
  const { user } = useAuth();
  const { dealer, dealerId, isLoading: isDealerLoading } = useDealer();
  const [vehicleCount, setVehicleCount] = useState<number | null>(null);

  useEffect(() => {
    if (dealerId) {
      api.get<Vehicle[]>(`/dealers/${dealerId}/vehicles`)
        .then(res => {
          const list = Array.isArray(res) ? res : (res as any).content ?? [];
          setVehicleCount(list.length);
        })
        .catch(() => setVehicleCount(null));
    }
  }, [dealerId]);

  if (isDealerLoading) {
    return (
      <div>
        <PageHeader title="Dealer Profile" subtitle="Loading dealership information..." breadcrumbs={[{ label: 'Dealer' }, { label: 'Profile' }]} />
        <div className="max-w-2xl h-64 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  const dealerInitials = dealer?.name ? initials(dealer.name) : 'BMW';

  return (
    <div>
      <PageHeader title="Dealer Profile" subtitle="Your dealership information" breadcrumbs={[{ label: 'Dealer' }, { label: 'Profile' }]} />
      <div className="max-w-2xl space-y-5">
        {/* Dealer information card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded flex items-center justify-center shrink-0">
              <span className="font-display text-xl font-bold text-amber-400">{dealerInitials}</span>
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-white">{dealer?.name || 'Authorized Dealership'}</p>
              <p className="text-sm text-zinc-400 font-medium">{dealer?.location || 'India'}</p>
              <p className="text-xs text-zinc-500 font-mono mt-1">Official BMW Certified Partner</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-950/50 border border-zinc-800 rounded p-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Dealer Name</p>
              <p className="text-sm font-medium text-white">{dealer?.name || '—'}</p>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 rounded p-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Location / City</p>
              <p className="text-sm font-medium text-white">{dealer?.location || '—'}</p>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 rounded p-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Dealer ID</p>
              <p className="text-xs font-mono text-zinc-300 break-all">{dealer?.dealerId || '—'}</p>
            </div>
            <div className="bg-zinc-950/50 border border-zinc-800 rounded p-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Total Inventory</p>
              <p className="text-sm font-medium text-white">
                {/* This used to fall back to a literal "5 vehicles assigned",
                    so the card showed a fabricated count while the request was
                    still in flight and stayed wrong if it failed. An unknown
                    count reads as unknown, which is what an em dash already
                    means on the three cards above. */}
                {vehicleCount !== null ? `${vehicleCount} vehicles assigned` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
          <p className="font-display text-sm font-semibold text-white mb-4 uppercase tracking-wider">Account Credentials</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center shrink-0">
              <span className="text-sm font-medium text-zinc-400">{initials(user?.name)}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-zinc-400 font-mono">{user?.email}</p>
              <p className="text-xs text-zinc-600 font-mono mt-0.5">Role: {user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
