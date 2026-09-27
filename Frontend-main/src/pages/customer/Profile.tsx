import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadError } from '../../components/ui/LoadError';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { initials } from '../../lib/format';
import api from '../../lib/api';

export default function CustomerProfile() {
  const { user, refreshUser } = useAuth();
  const { success, error } = useToast();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [customerId, setCustomerId] = useState('');
  /**
   * Recorded rather than discarded.
   *
   * The fetch of `/api/v1/customers/me` used to end in `.catch(() => {})`, so a
   * failure left `customerId` empty and the phone number blank while the form
   * looked fully loaded and editable. Saving then took the "no profile yet, so
   * provision one" branch and issued a create against a customer record that
   * already existed. A customer whose phone had not loaded could therefore save
   * a blank number over their own details, and the page gave no hint that the
   * prefill had failed.
   */
  const [loadError, setLoadError] = useState<unknown>(null);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    phone: '',
    email: user?.email ?? '',
  });

  useEffect(() => {
    // Fetch customer details
    api.get<any>('/api/v1/customers/me')
      .then(res => {
        if (res && res.id) {
          setCustomerId(res.id);
          setForm(prev => ({
            ...prev,
            name: res.name || prev.name,
            phone: res.phone || '',
            email: res.email || prev.email,
          }));
        }
        setLoadError(null);
      })
      .catch(setLoadError);
  }, []);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      let activeCustomerId = customerId;
      if (!activeCustomerId) {
        // Customer profile does not exist yet; provision it
        await api.post('/api/v1/customers', {
          name: form.name,
          email: form.email,
          phone: form.phone,
        });
        const res = await api.get<any>('/api/v1/customers/me');
        if (res && res.id) {
          activeCustomerId = res.id;
          setCustomerId(res.id);
        }
      } else {
        await api.put(`/api/v1/customers/${activeCustomerId}`, {
          ...form,
          userId: user?.id
        });
      }
      success('Profile updated.');
      setEditing(false);
    } catch (err: any) {
      error(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="My Profile"
        subtitle="Manage your account information"
        breadcrumbs={[{ label: 'Customer' }, { label: 'Profile' }]}
        actions={!editing ? <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit Profile</Button> : null}
      />
      {loadError !== null && (
        /* Editing stays available, but the customer is told the details below
           were not loaded so a save cannot silently blank a field. */
        <div className="mb-5">
          <LoadError
            resource="your profile"
            error={loadError}
            impact="The details below may be incomplete. Saving now could overwrite them with blanks."
          />
        </div>
      )}
      <div className="max-w-lg">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-8 p-5 bg-zinc-900 border border-zinc-800 rounded">
          <div className="w-14 h-14 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <span className="font-display text-xl font-bold text-amber-400">
              {initials(form.name)}
            </span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-white">{form.name}</p>
            <p className="text-sm text-zinc-500">{form.email}</p>
            <p className="text-xs font-mono text-zinc-600 uppercase tracking-wider mt-0.5">{user?.role}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 rounded p-6 space-y-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            disabled={!editing}
          />
          <Input
            label="Email"
            value={form.email}
            disabled
            hint="Email cannot be changed"
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            disabled={!editing}
            placeholder="+1 (555) 000-0000"
          />
          {editing && (
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading}>Save Changes</Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
