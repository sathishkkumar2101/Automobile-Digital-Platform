import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { VehicleStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { LoadError } from '../../components/ui/LoadError';
import { useLoadFailures } from '../../hooks/useLoadFailures';
import { Select } from '../../components/ui/Input';
import { ChatStartButton } from '../../components/chat/ChatStartButton';
import { formatCurrency, formatMileage } from '../../lib/format';
import { getVehicleImage } from '../../lib/vehicleImages';
import api from '../../lib/api';
import type { Vehicle, Dealer, PageResponse } from '../../types';

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const { failures, guard, has, retry } = useLoadFailures();
  const [activeImg, setActiveImg] = useState(0);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    setLoading(true);
    guard<Vehicle | null>('vehicle')(api.get<Vehicle>(`/api/vehicles/${id}`))
      .then(v => setVehicle(v ?? null))
      .finally(() => setLoading(false));

    guard<Dealer[] | PageResponse<Dealer>>('dealers')(
      api.get<Dealer[] | PageResponse<Dealer>>('/dealers'),
    )
      .then(res => setDealers(Array.isArray(res) ? res : res?.content ?? []));
  }, [id, retry]);

  const images = vehicle?.images?.length
    ? vehicle.images
    : [getVehicleImage(vehicle?.model)];

  async function handleOrder() {
    if (!selectedDealerId) {
      setOrderError('Please select a dealer');
      return;
    }
    setOrderSubmitting(true);
    setOrderError('');
    try {
      await api.post('/api/v1/orders', {
        customerId: user?.id,
        vehicleId: vehicle?.vehicleId,
        dealerId: selectedDealerId,
        status: 'CREATED',
        totalAmount: vehicle?.price
      });
      setOrderModalOpen(false);
      navigate('/customer/orders');
    } catch (err: any) {
      setOrderError(err.message || 'Failed to place order');
    } finally {
      setOrderSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Vehicles' }]}
        title={loading ? '—' : `${vehicle?.model}`}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-[16/10] rounded" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ) : vehicle ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="aspect-[16/10] bg-zinc-800 rounded overflow-hidden mb-2">
              <img
                src={images[activeImg]}
                alt={`${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-12 rounded overflow-hidden border-2 transition-colors ${i === activeImg ? 'border-amber-500' : 'border-transparent'}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-mono text-zinc-500 mb-1">· {vehicle.bodyType ?? 'Vehicle'}</p>
                <h2 className="font-display text-3xl font-bold text-white">{vehicle.model}</h2>
                {vehicle.trim && <p className="text-zinc-400 text-sm mt-0.5">{vehicle.trim}</p>}
              </div>
              <VehicleStatusBadge status={vehicle.status} />
            </div>

            <p className="font-display text-4xl font-bold text-white mb-6">{formatCurrency(vehicle.price)}</p>

            {vehicle.description && (
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">{vehicle.description}</p>
            )}

            {/* Specs grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Engine', value: vehicle.engine },
                { label: 'Transmission', value: vehicle.transmission },
                { label: 'Fuel Type', value: vehicle.fuelType },
                { label: 'Mileage', value: formatMileage(vehicle.mileage) },
                { label: 'Color', value: vehicle.color },
                { label: 'VIN', value: vehicle.vin },
              ].filter(s => s.value).map(spec => (
                <div key={spec.label} className="bg-zinc-900 border border-zinc-800 rounded p-3">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">{spec.label}</p>
                  <p className="text-sm font-medium text-white">{spec.value}</p>
                </div>
              ))}
            </div>

            {vehicle.features && vehicle.features.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Features</p>
                <div className="flex flex-wrap gap-1.5">
                  {vehicle.features.map(f => (
                    <span key={f} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300">{f}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {vehicle.status === 'AVAILABLE' && (
                <Button size="lg" className="flex-1" onClick={() => setOrderModalOpen(true)}>
                  Request Purchase
                </Button>
              )}
              <Button variant="secondary" size="lg" onClick={() => navigate('/customer/dealers')}>
                Contact Dealer
              </Button>
              {vehicle.dealerId && (
                <ChatStartButton
                  label="Ask about this vehicle"
                  redirectTo="/customer/messages"
                  variant="accent"
                  size="lg"
                  request={{
                    contextType: 'VEHICLE',
                    contextId: vehicle.vehicleId,
                    dealerId: vehicle.dealerId,
                    title: vehicle.model,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ) : has('vehicle') ? (
        <LoadError
          resource="this vehicle"
          error={failures.find(f => f.resource === 'vehicle')?.error}
          impact="There is nothing to show yet."
          onRetry={retry}
        />
      ) : (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">This vehicle could not be found.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate('/customer/vehicles')} className="mt-3">
            Back to inventory
          </Button>
        </div>
      )}

      {/* Order Modal */}
      {orderModalOpen && vehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-zinc-950 border border-zinc-800 rounded p-6 w-full max-w-md">
            <h3 className="font-display text-xl font-semibold text-white mb-2">Confirm Purchase Request</h3>
            <p className="text-sm text-zinc-400 mb-6">You are requesting to purchase the {vehicle.model} for {formatCurrency(vehicle.price)}.</p>
            
            <div className="space-y-4 mb-6">
              {has('dealers') ? (
                /* An empty dropdown here looked identical to "no dealers yet" and
                   left Submit Request failing on an empty selection. */
                <LoadError
                  resource="dealers"
                  error={failures.find(f => f.resource === 'dealers')?.error}
                  impact="An order cannot be submitted until this list loads."
                  onRetry={retry}
                />
              ) : (
                <Select
                  label="Select Dealer"
                  options={dealers.map(d => ({ value: String(d.dealerId), label: `${d.name} - ${d.location}` }))}
                  value={selectedDealerId}
                  onChange={e => setSelectedDealerId(e.target.value)}
                  placeholder={dealers.length === 0 ? 'No dealers available' : 'Choose a preferred dealer'}
                  disabled={dealers.length === 0}
                />
              )}
              {orderError && <p className="text-xs text-red-400">{orderError}</p>}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOrderModalOpen(false)}>Cancel</Button>
              <Button onClick={handleOrder} loading={orderSubmitting}>Submit Request</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
