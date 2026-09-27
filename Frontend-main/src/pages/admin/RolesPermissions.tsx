import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal, ConfirmDialog } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { LoadError } from '../../components/ui/LoadError';
import { useLoadFailures } from '../../hooks/useLoadFailures';

import api from '../../lib/api';
import type { RoleDetail, Permission } from '../../types';

export default function AdminRolesPermissions() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');
  
  // Roles state
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [roleSaving, setRoleSaving] = useState(false);
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<RoleDetail | null>(null);

  // Permissions state
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permsLoading, setPermsLoading] = useState(true);
  const [permModalOpen, setPermModalOpen] = useState(false);
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null);
  const [permName, setPermName] = useState('');
  const [permDesc, setPermDesc] = useState('');
  const [permSaving, setPermSaving] = useState(false);
  const [deletePermTarget, setDeletePermTarget] = useState<Permission | null>(null);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  function fetchRoles() {
    setRolesLoading(true);
    setLoadError(null);
    api.get<RoleDetail[]>('/api/roles')
      .then(res => setRoles(Array.isArray(res) ? res : (res as any).content ?? []))
      .catch((error: unknown) => {
        setLoadError(error);
        setRoles([]);
      })
      .finally(() => setRolesLoading(false));
  }

  function fetchPermissions() {
    setPermsLoading(true);
    setLoadError(null);
    api.get<Permission[]>('/api/permissions')
      .then(res => setPermissions(Array.isArray(res) ? res : (res as any).content ?? []))
      .catch((error: unknown) => {
        setLoadError(error);
        setPermissions([]);
      })
      .finally(() => setPermsLoading(false));
  }

  // Role CRUD
  function openRoleModal(role?: RoleDetail) {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleDesc(role.description ?? '');
    } else {
      setEditingRole(null);
      setRoleName('');
      setRoleDesc('');
    }
    setRoleModalOpen(true);
  }

  async function handleSaveRole(e: React.FormEvent) {
    e.preventDefault();
    if (!roleName.trim()) return;
    setRoleSaving(true);
    try {
      if (editingRole) {
        await api.put(`/api/roles/${editingRole.id}`, { name: roleName, description: roleDesc });
        success('Role updated successfully.');
      } else {
        await api.post('/api/roles', { name: roleName, description: roleDesc });
        success('Role created successfully.');
      }
      setRoleModalOpen(false);
      fetchRoles();
    } catch (err: any) {
      error(err.message || 'Failed to save role.');
    } finally {
      setRoleSaving(false);
    }
  }

  async function handleDeleteRole() {
    if (!deleteRoleTarget) return;
    try {
      await api.delete(`/api/roles/${deleteRoleTarget.id}`);
      success('Role deleted successfully.');
      fetchRoles();
    } catch (err: any) {
      error(err.message || 'Failed to delete role.');
    } finally {
      setDeleteRoleTarget(null);
    }
  }

  // Permission CRUD
  function openPermModal(perm?: Permission) {
    if (perm) {
      setEditingPerm(perm);
      setPermName(perm.name);
      setPermDesc(perm.description ?? '');
    } else {
      setEditingPerm(null);
      setPermName('');
      setPermDesc('');
    }
    setPermModalOpen(true);
  }

  async function handleSavePerm(e: React.FormEvent) {
    e.preventDefault();
    if (!permName.trim()) return;
    setPermSaving(true);
    try {
      if (editingPerm) {
        await api.put(`/api/permissions/${editingPerm.id}`, { name: permName, description: permDesc });
        success('Permission updated successfully.');
      } else {
        await api.post('/api/permissions', { name: permName, description: permDesc });
        success('Permission created successfully.');
      }
      setPermModalOpen(false);
      fetchPermissions();
    } catch (err: any) {
      error(err.message || 'Failed to save permission.');
    } finally {
      setPermSaving(false);
    }
  }

  async function handleDeletePerm() {
    if (!deletePermTarget) return;
    try {
      await api.delete(`/api/permissions/${deletePermTarget.id}`);
      success('Permission deleted successfully.');
      fetchPermissions();
    } catch (err: any) {
      error(err.message || 'Failed to delete permission.');
    } finally {
      setDeletePermTarget(null);
    }
  }

  return (
    <div>
      {loadError !== null && (
        <div className="mb-4">
          <LoadError resource="roles and permissions" error={loadError} />
        </div>
      )}

      <PageHeader
        title="Roles & Permissions"
        subtitle="Configure system access control policies and RBAC security rules"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Roles & Permissions' }]}
        actions={
          activeTab === 'roles' ? (
            <Button onClick={() => openRoleModal()}>Add Role</Button>
          ) : (
            <Button onClick={() => openPermModal()}>Add Permission</Button>
          )
        }
      />

      <div className="flex border-b border-zinc-800 mb-6">
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'roles'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          System Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'permissions'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Permissions ({permissions.length})
        </button>
      </div>

      {activeTab === 'roles' ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
          <Table
            loading={rolesLoading}
            data={roles}
            keyExtractor={r => r.id}
            emptyMessage="No system roles found"
            columns={[
              {
                key: 'name',
                header: 'Role Name',
                render: r => (
                  <div>
                    <span className="font-semibold text-white tracking-wide uppercase font-mono text-xs px-2 py-1 bg-zinc-800 rounded border border-zinc-700">
                      {r.name}
                    </span>
                  </div>
                ),
              },
              {
                key: 'desc',
                header: 'Description',
                render: r => <span className="text-zinc-400 text-sm">{r.description || '—'}</span>,
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: r => (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openRoleModal(r)}
                      className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteRoleTarget(r)}
                      className="text-red-400 hover:text-red-300 text-xs font-mono px-2 py-1 rounded bg-red-950/30 hover:bg-red-900/40 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
          <Table
            loading={permsLoading}
            data={permissions}
            keyExtractor={p => p.id}
            emptyMessage="No permissions found"
            columns={[
              {
                key: 'name',
                header: 'Permission Key',
                render: p => (
                  <span className="font-mono text-xs text-amber-400 font-semibold">{p.name}</span>
                ),
              },
              {
                key: 'desc',
                header: 'Description',
                render: p => <span className="text-zinc-400 text-sm">{p.description || '—'}</span>,
              },
              {
                key: 'actions',
                header: '',
                align: 'right',
                render: p => (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openPermModal(p)}
                      className="text-zinc-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletePermTarget(p)}
                      className="text-red-400 hover:text-red-300 text-xs font-mono px-2 py-1 rounded bg-red-950/30 hover:bg-red-900/40 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* Role Modal */}
      <Modal open={roleModalOpen} onClose={() => setRoleModalOpen(false)} title={editingRole ? 'Edit Role' : 'Create Role'}>
        <form onSubmit={handleSaveRole} className="space-y-4">
          <Input label="Role Name" placeholder="e.g. AUDITOR" value={roleName} onChange={e => setRoleName(e.target.value)} required />
          <Input label="Description" placeholder="Role duties and scope" value={roleDesc} onChange={e => setRoleDesc(e.target.value)} />
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setRoleModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={roleSaving}>{editingRole ? 'Update Role' : 'Create Role'}</Button>
          </div>
        </form>
      </Modal>

      {/* Permission Modal */}
      <Modal open={permModalOpen} onClose={() => setPermModalOpen(false)} title={editingPerm ? 'Edit Permission' : 'Create Permission'}>
        <form onSubmit={handleSavePerm} className="space-y-4">
          <Input label="Permission Key" placeholder="e.g. READ_ANALYTICS" value={permName} onChange={e => setPermName(e.target.value)} required />
          <Input label="Description" placeholder="Scope details" value={permDesc} onChange={e => setPermDesc(e.target.value)} />
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="secondary" onClick={() => setPermModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={permSaving}>{editingPerm ? 'Update Permission' : 'Create Permission'}</Button>
          </div>
        </form>
      </Modal>

      {/* Role Delete Dialog */}
      <ConfirmDialog
        open={!!deleteRoleTarget}
        onClose={() => setDeleteRoleTarget(null)}
        onConfirm={handleDeleteRole}
        title="Delete Role"
        message={`Are you sure you want to delete role '${deleteRoleTarget?.name}'?`}
        confirmLabel="Delete Role"
      />

      {/* Permission Delete Dialog */}
      <ConfirmDialog
        open={!!deletePermTarget}
        onClose={() => setDeletePermTarget(null)}
        onConfirm={handleDeletePerm}
        title="Delete Permission"
        message={`Are you sure you want to delete permission '${deletePermTarget?.name}'?`}
        confirmLabel="Delete Permission"
      />
    </div>
  );
}
