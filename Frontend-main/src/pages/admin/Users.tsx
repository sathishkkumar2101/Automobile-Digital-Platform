import React, { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { RoleBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchInput, Select, Input } from '../../components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { initials, formatDate } from '../../lib/format';
import { useToast } from '../../components/ui/Toast';
import { LoadError } from '../../components/ui/LoadError';
import { useLoadFailures } from '../../hooks/useLoadFailures';

import api from '../../lib/api';
import type { User, PageResponse, Role, RoleDetail, Customer } from '../../types';

/**
 * The roles offered in the forms come from `/api/roles`, so a role created on
 * the Roles & Permissions screen can actually be assigned to an account
 * instead of existing only as decoration. A fixed list here had the opposite
 * effect: custom roles were creatable but unassignable, and the browser carried
 * a second copy of the backend's rules that could drift out of step with it.
 *
 * ADMIN is still never offered as a new value. The backend refuses to let an
 * administrator change their own role, so presenting it as a choice only
 * produces a guaranteed failure.
 */
function roleLabel(role: string) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function AdminUsers() {
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(0);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [customerPhones, setCustomerPhones] = useState<Record<string, string>>({});

  // Edit user modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userRole, setUserRole] = useState<Role>('CUSTOMER');
  const [saving, setSaving] = useState(false);

  // Create user modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('CUSTOMER');
  const [creating, setCreating] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page]);

  function fetchUsers() {
    setLoading(true);
    setLoadError(null);
    api.get<PageResponse<User> | User[]>('/api/users')
      .then(res => setUsers(Array.isArray(res) ? res : res.content ?? []))
      .catch((error: unknown) => {
        // Reported, not absorbed. A failed request used to leave the table
        // showing "No users found", which reads as an empty directory rather
        // than a broken one.
        setLoadError(error);
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }

  /**
   * `/api/users` only carries a `roleId`, so role names are resolved against
   * `/api/roles`. Phone numbers live in the customer service, so they are
   * joined in by `userId` with a fallback to email.
   */
  useEffect(() => {
    api.get<RoleDetail[]>('/api/roles')
      .then(res => setRoles(Array.isArray(res) ? res : []))
      .catch(() => setRoles([]));

    api.get<Customer[]>('/api/v1/customers')
      .then(res => {
        const list = Array.isArray(res) ? res : [];
        setCustomerPhones(
          Object.fromEntries(
            list
              .filter(c => !!c.phone)
              .map(c => [c.userId ?? c.email, c.phone as string])
          )
        );
      })
      .catch(() => setCustomerPhones({}));
  }, []);

  const roleNameById = useMemo(
    () => new Map(roles.map(r => [r.id, r.name])),
    [roles]
  );

  /** Prefers the role name the API returns, falling back to the `/api/roles` join. */
  function roleNameOf(user: User): string | undefined {
    return user.role ?? (user.roleId ? roleNameById.get(user.roleId) : undefined);
  }

  function phoneOf(user: User): string {
    return user.phone ?? customerPhones[user.id] ?? customerPhones[user.email] ?? '';
  }

  /** Built from `/api/roles` so no role list is hardcoded in the browser. */
  const assignableRoles = useMemo(
    () => roles.map(r => r.name).sort(),
    [roles]
  );

  const roleFilterOptions = useMemo(
    () => [
      { value: '', label: 'All Roles' },
      ...assignableRoles.map(name => ({ value: name, label: roleLabel(name) })),
    ],
    [assignableRoles]
  );

  const filtered = users.filter(u => {
    if (search && !`${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter && roleNameOf(u) !== roleFilter) return false;
    return true;
  });

  function openEditModal(user: User) {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(phoneOf(user));
    setUserRole((roleNameOf(user) ?? 'CUSTOMER') as Role);
    setEditModalOpen(true);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser || saving) return;
    setSaving(true);
    try {
      /*
       * PUT /api/users/{id} takes a partial payload: `phone` is not a user
       * field (it belongs to the customer service) and the password is left
       * out so the account keeps its current credentials.
       */
      await api.put(`/api/users/${editingUser.id}`, {
        name,
        email,
        role: userRole,
      });
      success(`User ${email} updated.`);
      setEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || !newPassword || !newName) return;
    setCreating(true);
    try {
      await api.post('/api/users', {
        username: newUsername || newEmail.split('@')[0],
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });
      success(`User account ${newEmail} created.`);
      setCreateModalOpen(false);
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      fetchUsers();
    } catch (err: any) {
      error(err.message || 'Failed to create user account.');
    } finally {
      setCreating(false);
    }
  }

  /**
   * Deletes an account. The customer profile goes with it.
   *
   * The user and customer records sit in separate databases with no foreign key
   * between them, so the cascade is done server-side: the user service removes
   * the profile before it removes the account, and refuses the whole delete if
   * it cannot reach the customer service. That is why there is no second call
   * here — issuing one from the browser used to swallow its own errors and
   * delete the account regardless, which is precisely how a profile got left
   * behind, still reachable by user id.
   *
   * A 503 here means the customer service is unreachable and the account is
   * still present, so the message is surfaced rather than hidden and the delete
   * can simply be retried.
   */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const target = deleteTarget;
    try {
      await api.delete(`/api/users/${target.id}`);
      setUsers(prev => prev.filter(u => u.id !== target.id));
      success(`User ${target.email} removed.`);
    } catch (err: any) {
      error(err.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      {loadError !== null && (
        <div className="mb-4">
          <LoadError resource="users" error={loadError} onRetry={fetchUsers} />
        </div>
      )}

      <PageHeader
        title="Users"
        subtitle="Manage platform user accounts, security roles, and permissions"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Users' }]}
        actions={<Button onClick={() => setCreateModalOpen(true)}>Create User</Button>}
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-64"><SearchInput placeholder="Search users…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className="w-36"><Select options={roleFilterOptions} value={roleFilter} onChange={e => setRoleFilter(e.target.value)} /></div>
        <span className="text-xs text-zinc-600 self-center ml-auto font-mono">{filtered.length} users</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={filtered.slice(page * 10, (page + 1) * 10)}
          keyExtractor={u => u.id}
          emptyMessage={loadError !== null ? 'Could not load users' : 'No users found'}
          columns={[
            { key: 'user', header: 'User', render: u => (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-zinc-400">{initials(u.name)}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{u.name}</p>
                  <p className="text-xs text-zinc-500">{u.email}</p>
                </div>
              </div>
            )},
            { key: 'role', header: 'Role', render: u => <RoleBadge role={roleNameOf(u)} /> },
            { key: 'joined', header: 'Joined', render: u => <span className="text-zinc-500 text-xs font-mono">{formatDate(u.createdAt)}</span> },
            { key: 'actions', header: '', align: 'right', render: u => (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={e => { e.stopPropagation(); openEditModal(u); }}
                  className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(u); }}
                  className="text-red-400 hover:text-red-300 text-xs font-mono px-2 py-1 rounded bg-red-950/30 hover:bg-red-900/40 transition-colors"
                  aria-label="Delete user"
                >
                  Delete
                </button>
              </div>
            )},
          ]}
        />
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(filtered.length / 10))} totalElements={filtered.length} pageSize={10} onPageChange={setPage} />
      </div>

      {/* Edit User Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit User Account">
        <form onSubmit={handleUpdateUser} className="space-y-4">
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Input
            label="Phone"
            value={phone}
            readOnly
            hint="Customer accounts only — sourced from the customer service."
          />
          <Select
            label="Security Role"
            options={assignableRoles
              .filter(name => name !== 'ADMIN' || (editingUser ? roleNameOf(editingUser) === 'ADMIN' : false))
              .map(name => ({ value: name, label: roleLabel(name) }))}
            value={userRole}
            onChange={e => setUserRole(e.target.value as Role)}
            hint="An administrator role can be kept but is never granted from this screen."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save User</Button>
          </div>
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create User Account">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input label="Username" placeholder="johndoe" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
          <Input label="Full Name" placeholder="John Doe" value={newName} onChange={e => setNewName(e.target.value)} required />
          <Input label="Email Address" type="email" placeholder="john@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
          <Input label="Password" type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <Select
            label="Assigned Role"
            options={assignableRoles
              .filter(name => name !== 'ADMIN')
              .map(name => ({ value: name, label: roleLabel(name) }))}
            value={newRole}
            onChange={e => setNewRole(e.target.value as Role)}
            hint="Every role defined on the Roles &amp; Permissions screen can be assigned here."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Account</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete User"
        message={`Delete ${deleteTarget?.email}? Their customer profile is removed with the account. Past orders and appointments are kept for reporting. This action cannot be undone.`}
        confirmLabel="Delete User"
      />
    </div>
  );
}
