import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { LoadError } from '../../components/ui/LoadError';
import api from '../../lib/api';
import type { Dealer, Order } from '../../types';

interface ServiceType {
  code: string;
  label: string;
  description: string | null;
}

function toItems<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const paged = res as { content?: T[]; items?: T[] } | null;
  return paged?.content ?? paged?.items ?? [];
}

export default function BookService() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Failures are recorded rather than discarded.
   *
   * These three requests previously ended in `.catch(() => {})`, which made an
   * outage indistinguishable from "no data": the page rendered a service-type
   * dropdown with its five hardcoded options and an empty dealer list, and a
   * customer was invited to fill in a form that could not be submitted. The
   * Service Type dropdown in particular was the whole problem — every one of
   * those five values is rejected by the API, so the form could not succeed at
   * all.
   */
  const [dealersError, setDealersError] = useState<unknown>(null);
  const [serviceTypesError, setServiceTypesError] = useState<unknown>(null);

  const [form, setForm] = useState({
    dealerId: '',
    vehicleId: '',
    serviceType: '',
  });

  useEffect(() => {
    api
      .get<ServiceType[]>('/api/appointments/service-types')
      .then(res => {
        setServiceTypes(toItems<ServiceType>(res));
        setServiceTypesError(null);
      })
      .catch(setServiceTypesError);

    api
      .get<Dealer[]>('/dealers')
      .then(res => {
        setDealers(toItems<Dealer>(res));
        setDealersError(null);
      })
      .catch(setDealersError);

    // The vehicle list is genuinely optional: the booking works without one, so
    // its absence is not worth an error banner.
    api
      .get<Order[]>('/api/v1/orders')
      .then(res => setMyOrders(toItems<Order>(res)))
      .catch(() => setMyOrders([]));
  }, []);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.serviceType || !form.dealerId) {
      error('Service type and dealer are required.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/appointments', {
        customerId: user?.id,
        dealerId: form.dealerId,
        vehicleId: form.vehicleId || null,
        serviceType: form.serviceType,
      });
      success('Appointment booked successfully!');
      navigate('/customer/appointments');
    } catch (err) {
      error(
        err instanceof Error
          ? err.message
          : 'Failed to book appointment. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  const serviceTypeOptions = serviceTypes.map(s => ({
    value: s.code,
    label: s.label,
  }));

  return (
    <div>
      <PageHeader
        title="Book Service Appointment"
        subtitle="Schedule a service visit at an authorized dealer"
        breadcrumbs={[{ label: 'Service' }, { label: 'Book Appointment' }]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← Back
          </Button>
        }
      />
      <div className="max-w-lg space-y-4">
        {serviceTypesError !== null && (
          <LoadError resource="service types" error={serviceTypesError} />
        )}
        {dealersError !== null && (
          <LoadError resource="dealers" error={dealersError} />
        )}
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-5"
        >
          <Select
            label="Service Type"
            options={serviceTypeOptions}
            placeholder={
              serviceTypes.length === 0 && serviceTypesError === null
                ? 'Loading service types…'
                : 'Select service type'
            }
            value={form.serviceType}
            onChange={e => set('serviceType', e.target.value)}
            required
            // Left enabled while the list is loading so the field keeps its
            // label and position; with no options it cannot be chosen from, and
            // `required` turns that into a message instead of a silent no-op.
            disabled={serviceTypes.length === 0}
          />
          <Select
            label="Select Dealer"
            options={dealers.map(d => ({
              value: String(d.dealerId),
              label: `${d.name} - ${d.location}`,
            }))}
            placeholder={
              dealers.length === 0 && dealersError === null
                ? 'Loading dealers…'
                : 'Choose a preferred dealer'
            }
            value={form.dealerId}
            onChange={e => set('dealerId', e.target.value)}
            required
            disabled={dealers.length === 0}
          />
          {myOrders.length > 0 && (
            <Select
              label="Select Vehicle (Optional)"
              options={myOrders
                .filter(o => o.vehicle)
                .map(o => ({
                  value: String(o.vehicleId),
                  label: o.vehicle?.model || 'Unknown Vehicle',
                }))}
              placeholder="Choose a vehicle"
              value={form.vehicleId}
              onChange={e => set('vehicleId', e.target.value)}
            />
          )}
          {/*
            The preferred date, preferred time and notes fields that used to sit
            here were removed rather than kept. The appointment entity has no
            column for any of them — `appointmentDate` is a @CreationTimestamp
            and there is no notes field — so the values were collected, held in
            component state and then dropped on submit. A customer who typed
            "alternator noise, can drop off any morning" was told the appointment
            was booked and none of it reached the dealer.

            Storing them needs columns on the appointment and changes on the
            dealer's scheduling side, which is a larger change than removing a
            form that lied about what it recorded. Until that exists the form
            asks only for what is actually saved.
          */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} className="flex-1">
              Book Appointment
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
