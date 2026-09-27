import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { AppointmentStatusBadge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { formatDateTime } from '../../lib/format';
import api from '../../lib/api';
import type { Appointment, AppointmentStatus } from '../../types';
import { useDealer } from '../../contexts/DealerContext';
import { useToast } from '../../components/ui/Toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const MUTABLE_STATUSES = [
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function DealerAppointments() {
  const { dealerName, location, isLoading: isDealerLoading } = useDealer();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const fetchAppointments = () => {
    setLoading(true);
    setError(null);

    // Backend filters by authenticated dealer (via X-Dealer-Id injected by Gateway)
    api.get<Appointment[]>('/api/appointments')
      .then(res => {
        setAppointments(Array.isArray(res) ? res : (res as any).content ?? []);
      })
      .catch(err => {
        console.error('Failed to load dealer appointments:', err);
        setError('Failed to load service appointments.');
        setAppointments([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    setUpdatingId(appointmentId);
    try {
      await api.patch(`/api/appointments/${appointmentId}/status?status=${newStatus}`);
      success(`Appointment status updated to ${newStatus}`);
      setAppointments(prev =>
        prev.map(a => a.id === appointmentId ? { ...a, status: newStatus as AppointmentStatus } : a)
      );
    } catch (err: any) {
      console.error('Failed to update appointment status:', err);
      toastError(err?.message || 'Could not update appointment status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = appointments.filter(a => !status || a.status === status);

  if (isDealerLoading) {
    return (
      <div>
        <PageHeader
          title="Service Appointments"
          subtitle="Loading appointments..."
          breadcrumbs={[{ label: 'Dealer' }, { label: 'Appointments' }]}
        />
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={dealerName ? `${dealerName} — Service Appointments` : 'Service Appointments'}
        subtitle={location ? `Incoming service requests for ${location}` : 'Manage incoming service requests'}
        breadcrumbs={[{ label: 'Dealer' }, { label: 'Appointments' }]}
      />

      {error && (
        <div className="mb-4 p-4 rounded bg-red-950/40 border border-red-800/50 text-red-300 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={fetchAppointments}
            className="text-amber-400 hover:text-amber-300 text-xs font-medium underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="w-44">
          <Select options={STATUS_OPTIONS} value={status} onChange={e => setStatus(e.target.value)} />
        </div>
        <span className="text-xs text-zinc-500 ml-auto font-mono">
          {filtered.length} {filtered.length === 1 ? 'appointment' : 'appointments'}
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * 10, (page + 1) * 10)}
          keyExtractor={a => a.id}
          emptyMessage="No service appointments found for your dealership"
          columns={[
            {
              key: 'id',
              header: '#',
              width: '100px',
              render: a => <span className="font-mono text-zinc-500 text-xs">#{a.id.slice(0, 8)}</span>,
            },
            {
              key: 'customer',
              header: 'Customer',
              render: a => (
                <span className="text-zinc-300">{a.customer ? a.customer.name : `Customer #${a.customerId?.slice(0, 8)}`}</span>
              ),
            },
            {
              key: 'service',
              header: 'Service Type',
              render: a => (
                <span className="capitalize text-white font-medium">
                  {a.serviceType?.toLowerCase().replace(/_/g, ' ') || 'Service'}
                </span>
              ),
            },
            {
              key: 'date',
              header: 'Date & Time',
              render: a => (
                <span className="text-zinc-400 text-xs font-mono">{formatDateTime(a.appointmentDate)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: a => <AppointmentStatusBadge status={a.status} />,
            },
            {
              key: 'updateStatus',
              header: 'Update Status',
              width: '160px',
              render: a => (
                <div className="w-36">
                  <Select
                    options={MUTABLE_STATUSES}
                    value={a.status}
                    disabled={updatingId === a.id}
                    onChange={e => handleStatusChange(a.id, e.target.value)}
                  />
                </div>
              ),
            },
          ]}
        />
        <Pagination page={page} totalPages={Math.ceil(filtered.length / 10)} totalElements={filtered.length} pageSize={10} onPageChange={setPage} />
      </div>
    </div>
  );
}
