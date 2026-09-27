import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { RoleBadge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import api from '../../lib/api';

export default function AdminProfile() {
  const { user } = useAuth();
  const { success, error } = useToast();
  
  const [name, setName] = useState(user?.name || '');
  const [email] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      await api.put(`/api/users/${user.id}`, {
        name,
        email,
        phone,
      });
      success('Profile updated successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Admin Profile"
        subtitle="Manage administrator credentials and account preferences"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Profile' }]}
      />

      <div className="max-w-2xl space-y-6">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-800">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-amber-500">{user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{user?.name || 'Administrator'}</h3>
                <RoleBadge role={user?.role || 'ADMIN'} />
              </div>
              <p className="text-sm text-zinc-400 font-mono mt-0.5">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Input
              label="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              value={email}
              disabled
              hint="Primary identity email registered with authentication gateway"
            />
            <Input
              label="Phone Number"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
            />

            <div className="pt-4 flex justify-end">
              <Button type="submit" loading={loading}>Save Changes</Button>
            </div>
          </form>
        </Card>

        <Card className="p-6 border-zinc-800">
          <h4 className="text-base font-semibold text-white mb-2">Security & Authorization</h4>
          <p className="text-sm text-zinc-400 mb-4">
            Your account is assigned global system administrator privileges (`ADMIN` role).
          </p>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded font-mono text-xs text-zinc-400 space-y-1">
            <p><span className="text-zinc-600">User ID:</span> {user?.id}</p>
            <p><span className="text-zinc-600">Role Authority:</span> ROLE_ADMIN</p>
            <p><span className="text-zinc-600">Session Status:</span> Authenticated via JWT Gateway</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
