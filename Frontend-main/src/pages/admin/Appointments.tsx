import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { AppointmentStatusBadge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { LoadError } from '../../components/ui/LoadError';
import { useToast } from '../../components/ui/Toast';
import { useLoadFailures } from '../../hooks/useLoadFailures';
import { formatDate, formatCurrency } from '../../lib/format';
import api from '../../lib/api';
import type { Appointment, AppointmentStatus, Dealer, PageResponse } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function AdminAppointments() {
  const { success, error } = useToast();
  const { failures, clear, retry, guard, has, reloadToken } = useLoadFailures();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [dealerFilter, setDealerFilter] = useState('');
  const [page, setPage] = useState(0);

  // Status update modal
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [newStatus, setNewStatus] = useState<AppointmentStatus>('REQUESTED');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [page, reloadToken]);

  function fetchAppointments() {
    setLoading(true);
    clear();
    Promise.all([
      guard<PageResponse<Appointment> | Appointment[]>('appointments')(
        api.get<PageResponse<Appointment> | Appointment[]>('/api/appointments')),
      guard<Dealer[]>('dealers')(api.get<Dealer[]>('/dealers')),
    ]).then(([a, d]) => {
      setAppointments(Array.isArray(a) ? a : (a as any).content ?? []);
      setDealers(Array.isArray(d) ? d : (d as any).content ?? []);
    }).finally(() => setLoading(false));
  }

  const dealerOptions = [
    { value: '', label: 'All Dealers' },
    ...dealers.map(d => ({ value: d.dealerId, label: d.name }))
  ];

  const filtered = appointments.filter(a => {
    if (status && a.status !== status) return false;
    if (dealerFilter && a.dealerId !== dealerFilter) return false;
    return true;
  });

  function openApptModal(appt: Appointment) {
    setSelectedAppt(appt);
    setNewStatus(appt.status);
  }

  async function handleUpdateStatus() {
    if (!selectedAppt) return;
    setUpdating(true);
    try {
      // Status arrives as a query parameter; a JSON body left Spring looking
      // for a missing @RequestParam and the update failed with 400.
      await api.patch(
        `/api/appointments/${selectedAppt.id}/status?status=${encodeURIComponent(newStatus)}`
      );
      setAppointments(prev => prev.map(a => a.id === selectedAppt.id ? { ...a, status: newStatus } : a));
      success(`Appointment status updated to ${newStatus}`);
      setSelectedAppt(null);
    } catch (err: any) {
      error(err.message || 'Failed to update appointment status.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div>
      {failures.length > 0 && (
        <div className="mb-4 space-y-3">
          {failures.map((failure, i) => (
            <LoadError key={i} resource={failure.resource} error={failure.error} onRetry={retry} />
          ))}
        </div>
      )}

      <PageHeader title="Appointments" subtitle="Platform-wide service appointment scheduling and tracking" breadcrumbs={[{ label: 'Admin' }, { label: 'Appointments' }]} />
      
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-40"><Select options={STATUS_OPTIONS} value={status} onChange={e => setStatus(e.target.value)} /></div>
        <div className="w-44"><Select options={dealerOptions} value={dealerFilter} onChange={e => setDealerFilter(e.target.value)} /></div>
        <span className="text-xs text-zinc-600 self-center ml-auto font-mono">{filtered.length} appointments</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * 10, (page + 1) * 10)}
          keyExtractor={a => a.id}
          emptyMessage={has('appointments') ? 'Could not load appointments' : 'No appointments found'}
          columns={[
            { key: 'id', header: '#', width: '90px', render: a => <span className="font-mono text-xs text-zinc-500">#{a.id.slice(0, 8)}</span> },
            { key: 'customer', header: 'Customer', render: a => (
              // customerId is nullable and there is no error boundary above this
              // table, so a bare .slice() on a row that somehow has no customer
              // would throw and blank the whole admin page. Matches the
              // null-safe form the dealer appointments table already uses.
              <span>{a.customer ? a.customer.name : a.customerId ? `Customer #${a.customerId.slice(0, 8)}` : 'Unknown customer'}</span>
            )},
            { key: 'service', header: 'Service', render: a => (
              <span className="capitalize font-medium text-white">{a.serviceType.toLowerCase().replace(/_/g, ' ')}</span>
            )},
            { key: 'date', header: 'Scheduled', render: a => (
              <div>
                <p>{formatDate(a.scheduledDate || a.appointmentDate)}</p>
                {a.scheduledTime && <p className="text-xs text-zinc-600 font-mono">{a.scheduledTime}</p>}
              </div>
            )},
            { key: 'status', header: 'Status', render: a => <AppointmentStatusBadge status={a.status} /> },
            { key: 'cost', header: 'Est. Cost', align: 'right', render: a => (
              <span className="font-mono text-xs">{a.estimatedCost ? formatCurrency(a.estimatedCost) : '—'}</span>
            )},
            { key: 'actions', header: '', align: 'right', render: a => (
              <button
                onClick={() => openApptModal(a)}
                className="text-amber-400 hover:text-amber-300 text-xs font-mono px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                Update Status
              </button>
            )},
          ]}
        />
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / 10))} totalElements={filtered.length} pageSize={10} onPageChange={setPage} />
      </div>

      {/* Appointment Status Modal */}
      <Modal open={!!selectedAppt} onClose={() => setSelectedAppt(null)} title="Update Appointment Status">
        {selectedAppt && (
          <div className="space-y-4">
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-1 text-xs text-zinc-400 font-mono">
              <p><span className="text-zinc-600">ID:</span> {selectedAppt.id}</p>
              <p><span className="text-zinc-600">Service:</span> {selectedAppt.serviceType}</p>
              <p><span className="text-zinc-600">Current Status:</span> {selectedAppt.status}</p>
            </div>

            <Select
              label="Transition Status To:"
              options={[
                { value: 'REQUESTED', label: 'REQUESTED — Initial request' },
                { value: 'CONFIRMED', label: 'CONFIRMED — Confirmed by dealer' },
                { value: 'IN_PROGRESS', label: 'IN_PROGRESS — Vehicle in service bay' },
                { value: 'COMPLETED', label: 'COMPLETED — Service completed' },
                { value: 'CANCELLED', label: 'CANCELLED — Appointment cancelled' },
              ]}
              value={newStatus}
              onChange={e => setNewStatus(e.target.value as AppointmentStatus)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Button type="button" variant="secondary" onClick={() => setSelectedAppt(null)}>Cancel</Button>
              <Button type="button" onClick={handleUpdateStatus} loading={updating}>Save Status</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
