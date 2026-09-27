import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { SearchInput, Input, Select } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { LoadError } from '../../components/ui/LoadError';
import { useLoadFailures } from '../../hooks/useLoadFailures';
import api from '../../lib/api';
import type { Dealer, PageResponse, User, Vehicle } from '../../types';

export default function AdminDealers() {
  const { success, error } = useToast();
  const { failures, clear, retry, guard, has, reloadToken } = useLoadFailures();
  const [loadFailures, setLoadFailures] = useState<{ resource: string; error: unknown }[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  
  // Create / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    location: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Dealer | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDealers();
  }, [page, reloadToken]);

  function fetchDealers() {
    setLoading(true);
    Promise.all([
      guard<PageResponse<Dealer> | Dealer[]>('dealers')(
        api.get<PageResponse<Dealer> | Dealer[]>('/dealers')),
      guard<PageResponse<User> | User[]>('users')(
        api.get<PageResponse<User> | User[]>('/api/users')),
      guard<PageResponse<Vehicle> | Vehicle[]>('vehicles')(
        api.get<PageResponse<Vehicle> | Vehicle[]>('/api/vehicles')),
    ])
      .then(([d, u, v]) => {
        setDealers(Array.isArray(d) ? d : d.content ?? []);
        setUsers(Array.isArray(u) ? u : u.content ?? []);
        setVehicles(Array.isArray(v) ? v : v.content ?? []);
      })
      .catch((error: unknown) => {
        // Each request above is already guarded, so reaching here means the
        // mapping itself failed. Swallowing it would blank the table back to
        // "no dealers" after a banner had been shown for a different section,
        // so it is reported too.
        setLoadFailures((previous) => [...previous, { resource: 'dealers', error }]);
        setDealers([]);
      })
      .finally(() => setLoading(false));
  }

  const filtered = dealers.filter(d => !search || `${d.name} ${d.location ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  const vehicleCountByDealer = (dealerId: string) => vehicles.filter(v => v.dealerId === dealerId).length;
  const userById = (userId?: string) => users.find(u => u.id === userId);
  const unlinkedUserOptions = [
    { value: '', label: 'Select a dealer account…' },
    ...users
      .filter(u => u.role === 'DEALER' && !dealers.some(d => d.userId === u.id))
      .map(u => ({ value: u.username ?? '', label: `${u.name} — ${u.username}` })),
  ];

  function openModal(dealer?: Dealer) {
    if (dealer) {
      setEditingDealer(dealer);
      setFormData({
        username: userById(dealer.userId)?.username ?? '',
        name: dealer.name || '',
        location: dealer.location || '',
      });
    } else {
      setEditingDealer(null);
      setFormData({
        username: '',
        name: '',
        location: '',
      });
    }
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (!editingDealer && !formData.username.trim()) {
      error('Username is required to link a dealer to a user account.');
      return;
    }
    setSaving(true);
    try {
      if (editingDealer) {
        await api.put(`/dealers/${editingDealer.dealerId}`, { name: formData.name, location: formData.location });
        success('Dealer details updated successfully.');
      } else {
        await api.post('/dealers', { username: formData.username, name: formData.name, location: formData.location });
        success('Dealer registered successfully.');
      }
      setModalOpen(false);
      fetchDealers();
    } catch (err: any) {
      error(err.message || 'Failed to save dealer.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/dealers/${deleteTarget.dealerId}`);
      setDealers(prev => prev.filter(d => d.dealerId !== deleteTarget.dealerId));
      success('Dealer removed successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to remove dealer.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div>

      {failures.length > 0 && (
        <div className="mb-4 space-y-3">
          {[...failures, ...loadFailures].map((failure, i) => (
            <LoadError key={i} resource={failure.resource} error={failure.error} onRetry={retry} />
          ))}
        </div>
      )}

      <PageHeader
        title="Dealers"
        subtitle="Manage authorized dealership partners across regions"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Dealers' }]}
        actions={<Button onClick={() => openModal()}>Add Dealer</Button>}
      />
      <div className="w-64 mb-4">
        <SearchInput placeholder="Search dealers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * 10, (page + 1) * 10)}
          keyExtractor={d => d.dealerId}
          emptyMessage={has('dealers') ? 'Could not load dealers' : 'No dealers found'}
          columns={[
            {
              key: 'name',
              header: 'Dealer',
              render: d => (
                <div>
                  <p className="text-white font-medium">{d.name}</p>
                  <p className="text-xs text-zinc-500">{d.location || '—'}</p>
                </div>
              ),
            },
            {
              key: 'account',
              header: 'Linked Account',
              render: d => {
                const user = userById(d.userId);
                return (
                  <div>
                    <p className="text-sm text-zinc-300">{user?.username ?? '—'}</p>
                    <p className="text-xs text-zinc-500 font-mono">{d.userId ?? 'unlinked'}</p>
                  </div>
                );
              },
            },
            {
              key: 'inventory',
              header: 'Inventory',
              align: 'right',
              render: d => <span className="font-mono text-zinc-300">{vehicleCountByDealer(d.dealerId)}</span>,
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: d => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); openModal(d); }}
                    className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget(d); }}
                    className="text-red-400 hover:text-red-300 text-xs font-mono px-2 py-1 rounded bg-red-950/30 hover:bg-red-900/40 transition-colors"
                    aria-label="Remove Dealer"
                  >
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / 10))} totalElements={filtered.length} pageSize={10} onPageChange={setPage} />
      </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingDealer ? 'Edit Dealer' : 'Add New Dealer'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Dealership Name" placeholder="e.g. BMW Chennai" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          {editingDealer ? (
            <Input label="Location" placeholder="Chennai" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
          ) : (
            <>
              <Select
                label="Linked User Account"
                options={unlinkedUserOptions}
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                disabled={unlinkedUserOptions.length === 1}
                hint={unlinkedUserOptions.length === 1
                  ? 'No DEALER account is available. Create a user with the DEALER role first, then return here.'
                  : 'The dealership is run by this account. Only DEALER accounts without an existing dealership are listed.'}
              />
              <Input label="Location" placeholder="Chennai" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editingDealer ? 'Save Changes' : 'Register Dealer'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Dealer"
        message={`Remove ${deleteTarget?.name} from the platform? All associated data will be affected.`}
        confirmLabel="Remove Dealer"
      />
    </div>
  );
}
