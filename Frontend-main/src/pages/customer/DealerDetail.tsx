import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { LoadError } from '../../components/ui/LoadError';
import { useLoadFailures } from '../../hooks/useLoadFailures';
import { ChatStartButton } from '../../components/chat/ChatStartButton';
import api from '../../lib/api';
import type { Dealer, PageResponse, Vehicle } from '../../types';

export default function DealerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { failures, guard, has, retry } = useLoadFailures();

  // Both requests used to `.catch(() => null)` / `.catch(() => [])`. The dealer
  // branch of the render below ends in `null`, so a failed dealer fetch produced
  // a blank page under a heading reading "Dealer" — indistinguishable from a
  // dealer that does not exist, with nothing to click and no message. A failed
  // vehicle fetch reported "0 vehicles" on a live dealer page. Both are now
  // reported, and the page can be retried.
  useEffect(() => {
    setLoading(true);
    Promise.all([
      guard('dealer')(api.get<Dealer>(`/dealers/${id}`)),
      guard('inventory')(api.get<PageResponse<Vehicle> | Vehicle[]>(`/api/vehicles/dealer/${id}`)),
    ])
      .then(([d, v]) => {
        setDealer(Array.isArray(d) ? null : (d as unknown as Dealer | null));
        const list = Array.isArray(v) ? v : (v as PageResponse<Vehicle>)?.content ?? [];
        setVehicleCount(list.length);
      })
      .finally(() => setLoading(false));
  }, [id, retry]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Dealers' }]}
        title={loading ? '—' : dealer?.name ?? 'Dealer'}
        actions={<Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>}
      />

      {loading ? (
        <div className="max-w-lg space-y-4">
          <Skeleton className="h-48 rounded" />
        </div>
      ) : dealer ? (
        <div className="max-w-lg space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded flex items-center justify-center text-amber-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                </svg>
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-white">{dealer.name}</p>
                <p className="text-sm text-zinc-500">{dealer.location || 'Authorized Dealer'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: 'Location', value: dealer.location || 'Not specified' },
                { label: 'Inventory', value: has('inventory') ? '—' : vehicleCount > 0 ? `${vehicleCount} vehicles available` : 'No vehicles listed' },
                { label: 'Dealer ID', value: dealer.dealerId },
              ].filter(i => i.value).map(item => (
                <div key={item.label} className="flex items-start gap-3 text-sm">
                  <span className="text-zinc-600 w-20 shrink-0">{item.label}</span>
                  <span className="text-zinc-300">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <Button className="w-full" size="lg" onClick={() => navigate('/customer/appointments/book')}>Schedule Visit</Button>
          <ChatStartButton
            label="Chat with this dealership"
            redirectTo="/customer/messages"
            full
            request={{
              contextType: 'GENERAL',
              dealerId: dealer.dealerId,
              // The dealer service id is not the auth user id that a
              // conversation's participant list is built from, so the client
              // cannot recognise an existing thread from `dealerId` alone and
              // opened a new one on every visit. Passing the dealer's user id
              // gives the de-duplication something it can actually match.
              recipientUserId: dealer.userId,
              title: dealer.name,
            }}
          />
        </div>
      ) : has('dealer') ? (
        /* Reached when the dealer request failed rather than returned nothing,
           which is why this is separated from the "no such dealer" case. */
        <LoadError
          resource="this dealer"
          error={failures.find(f => f.resource === 'dealer')?.error}
          impact="There is nothing to show yet."
          onRetry={retry}
        />
      ) : (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">This dealer could not be found.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/customer/dealers')} className="mt-3">
            Back to dealers
          </Button>
        </div>
      )}
    </div>
  );
}
