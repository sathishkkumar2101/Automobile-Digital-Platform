import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { VehicleStatusBadge } from '../../components/ui/Badge';
import { SearchInput, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { VehicleCardSkeleton } from '../../components/ui/Skeleton';
import { LoadError } from '../../components/ui/LoadError';
import { formatCurrency } from '../../lib/format';
import { getVehicleImage } from '../../lib/vehicleImages';
import api from '../../lib/api';
import type { Vehicle, PageResponse } from '../../types';

/**
 * No "make" filter.
 *
 * There was one, offering BMW, Mercedes-Benz, Porsche, Audi, Lamborghini and
 * Ferrari. The `vehicle` table has no make or brand column at all, so the filter
 * was a substring match of the brand name against `model` — and every seeded
 * model is a BMW. Four of the five brands therefore matched nothing, and
 * choosing one produced an empty grid with no explanation, indistinguishable
 * from having no stock. The Model filter beside it already covers the same
 * ground honestly.
 */
const STATUSES = [
  { value: '', label: 'All Status' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'SOLD', label: 'Sold' },
];

const PRICE_RANGES = [
  { value: '', label: 'All Prices' },
  { value: 'under-50l', label: 'Under ₹50 Lakh' },
  { value: '50l-1cr', label: '₹50 Lakh – ₹1 Crore' },
  { value: '1cr-1.5cr', label: '₹1 Crore – ₹1.5 Crore' },
  { value: 'over-1.5cr', label: 'Over ₹1.5 Crore' },
];

export default function CustomerVehicles() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [status, setStatus] = useState('AVAILABLE');

  useEffect(() => {
    setLoading(true);
    api.get<PageResponse<Vehicle> | Vehicle[]>('/api/vehicles')
      .then(res => {
        const data = Array.isArray(res) ? res : res.content ?? [];
        setVehicles(data);
        setLoadError(null);
      })
      // Recorded, not swallowed. This used to `setVehicles([])`, so a failed
      // request and a genuinely empty inventory produced the same screen: a
      // "no vehicles match" message on a page whose filter bar was still live,
      // which reads as "the showroom is empty" rather than "we could not ask".
      .catch(setLoadError)
      .finally(() => setLoading(false));
  }, []);

  const models = useMemo(() => {
    const list = Array.from(new Set(vehicles.map(v => v.model).filter(Boolean)));
    return ['', ...list];
  }, [vehicles]);

  const variants = useMemo(() => {
    const list = Array.from(new Set(vehicles.map(v => v.trim).filter(Boolean))) as string[];
    return ['', ...list];
  }, [vehicles]);

  const colors = useMemo(() => {
    const list = Array.from(new Set(vehicles.map(v => v.color).filter(Boolean))) as string[];
    return ['', ...list];
  }, [vehicles]);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    if (q) {
      const matchSearch =
        v.model?.toLowerCase().includes(q) ||
        v.trim?.toLowerCase().includes(q) ||
        v.color?.toLowerCase().includes(q) ||
        v.bodyType?.toLowerCase().includes(q) ||
        v.vin?.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
    if (status && v.status !== status) return false;
    if (selectedModel && v.model !== selectedModel) return false;
    if (selectedVariant && v.trim !== selectedVariant) return false;
    if (selectedColor && v.color !== selectedColor) return false;
    if (priceRange === 'under-50l' && v.price >= 5000000) return false;
    if (priceRange === '50l-1cr' && (v.price < 5000000 || v.price > 10000000)) return false;
    if (priceRange === '1cr-1.5cr' && (v.price < 10000000 || v.price > 15000000)) return false;
    if (priceRange === 'over-1.5cr' && v.price <= 15000000) return false;
    return true;
  });

  const hasActiveFilters = Boolean(
    search || selectedModel || selectedVariant || selectedColor || priceRange || status !== 'AVAILABLE'
  );

  function handleReset() {
    setSearch('');
    setSelectedModel('');
    setSelectedVariant('');
    setSelectedColor('');
    setPriceRange('');
    setStatus('AVAILABLE');
  }

  return (
    <div>
      <PageHeader
        title="Vehicle Inventory"
        subtitle="Browse our curated selection of premium vehicles"
        breadcrumbs={[{ label: 'Customer' }, { label: 'Vehicles' }]}
        actions={
          hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Clear Filters
            </Button>
          ) : null
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6 bg-zinc-900/60 p-4 border border-zinc-800 rounded">
        <div className="w-64 min-w-[200px]">
          <SearchInput
            placeholder="Search keyword, VIN…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Select
            options={models.map(m => ({ value: m, label: m || 'All Models' }))}
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
          />
        </div>
        <div className="w-36">
          <Select
            options={variants.map(v => ({ value: v, label: v || 'All Variants' }))}
            value={selectedVariant}
            onChange={e => setSelectedVariant(e.target.value)}
          />
        </div>
        <div className="w-32">
          <Select
            options={colors.map(c => ({ value: c, label: c || 'All Colors' }))}
            value={selectedColor}
            onChange={e => setSelectedColor(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={PRICE_RANGES}
            value={priceRange}
            onChange={e => setPriceRange(e.target.value)}
          />
        </div>
        <div className="w-32">
          <Select
            options={STATUSES}
            value={status}
            onChange={e => setStatus(e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Reset
          </Button>
        )}
        <p className="text-xs text-zinc-500 self-center ml-auto font-mono">{filtered.length} vehicles</p>
      </div>

      {loadError !== null && (
        <div className="mb-5">
          <LoadError
            resource="vehicles"
            error={loadError}
            impact="The inventory below is empty because it could not be loaded, not because there is none."
            onRetry={() => {
              setLoadError(null);
              setLoading(true);
              api.get<PageResponse<Vehicle> | Vehicle[]>('/api/vehicles')
                .then(res => {
                  const data = Array.isArray(res) ? res : res.content ?? [];
                  setVehicles(data);
                  setLoadError(null);
                })
                .catch(setLoadError)
                .finally(() => setLoading(false));
            }}
          />
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <VehicleCardSkeleton key={i} />)
          : filtered.length === 0
          ? (
            <div className="col-span-full py-20 text-center">
              {loadError !== null ? (
                <p className="text-zinc-600 text-sm">Inventory unavailable.</p>
              ) : (
                <>
                  <p className="text-zinc-600 text-sm">No vehicles match your search.</p>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={handleReset} className="mt-3">
                      Clear Filters
                    </Button>
                  )}
                </>
              )}
            </div>
          )
          : filtered.map((vehicle, i) => (
            <div
              key={vehicle.vehicleId}
              onClick={() => navigate(`/customer/vehicles/${vehicle.vehicleId}`)}
              className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden cursor-pointer group hover:border-zinc-600 transition-colors duration-150"
            >
              <div className="relative aspect-[16/10] bg-zinc-800 overflow-hidden">
                <img
                  src={getVehicleImage(vehicle.model)}
                  alt={`${vehicle.model}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3">
                  <VehicleStatusBadge status={vehicle.status} />
                </div>
              </div>
              <div className="p-4">
                <p className="text-xs text-zinc-500 font-mono mb-1">· {vehicle.bodyType ?? 'Sedan'}</p>
                <p className="font-display text-lg font-semibold text-white mb-0.5">{vehicle.model}</p>
                {vehicle.trim && <p className="text-xs text-zinc-500 mb-3">{vehicle.trim}</p>}
                <div className="flex items-end justify-between">
                  <p className="font-display text-xl font-semibold text-white">{formatCurrency(vehicle.price)}</p>
                  <span className="text-xs text-amber-400 group-hover:text-amber-300 transition-colors">View →</span>
                </div>
                {vehicle.color && (
                  <p className="text-xs text-zinc-600 mt-1">{vehicle.color}</p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
