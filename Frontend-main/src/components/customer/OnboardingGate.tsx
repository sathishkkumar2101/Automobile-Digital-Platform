import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

/**
 * A self-registered account has a row in the user service but none in the
 * customer service, because the two live in separate databases. Several parts
 * of the customer area resolve the caller through `/api/v1/customers/me`, so an
 * account without a profile gets confusing empty screens and "No customer
 * profile exists for this account" errors rather than a clear prompt.
 *
 * This closes that gap on the first load of the customer area: it probes for a
 * profile and, when there is none, requires one before anything else is
 * reachable. Once the profile exists the gate renders nothing, so there is no
 * cost on subsequent visits.
 *
 * The probe deliberately fails open. A 403 or a network error is treated as
 * "profile present", because locking every customer out of the portal because
 * the customer service is unreachable would be far worse than the missing
 * profile this gate exists to catch.
 */
type GateState = 'checking' | 'missing' | 'complete';

export function CustomerOnboardingGate() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [state, setState] = useState<GateState>('checking');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

  useEffect(() => {
    let active = true;

    api
      .get<{ id?: string }>('/api/v1/customers/me')
      .then(res => {
        if (!active) return;
        setState(res && res.id ? 'complete' : 'missing');
      })
      .catch(() => {
        if (!active) return;
        setState('complete');
      });

    return () => {
      active = false;
    };
  }, []);

  if (state !== 'missing') return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setFormError('Full name is required.');
      return;
    }
    if (trimmedPhone && !/^[+()\d][\d\s()+-]{4,}$/.test(trimmedPhone)) {
      setFormError('Enter a valid phone number, or leave it blank.');
      return;
    }

    setFormError('');
    setSubmitting(true);

    try {
      await api.post('/api/v1/customers', {
        name: trimmedName,
        email: user?.email,
        phone: trimmedPhone || null,
        address: [addressLine1.trim(), addressLine2.trim()].filter(Boolean),
      });
      setState('complete');
    } catch (err: any) {
      const message = err?.message || 'Could not save your details. Please try again.';
      setFormError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={() => {}} title="Complete your profile" size="lg" dismissible={false}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-zinc-400">
          Your account is ready. We need a few contact details before you can browse vehicles,
          place an order or book a service.
        </p>

        <Input
          label="Full Name"
          value={name}
          onChange={e => setName(e.target.value)}
          autoComplete="name"
          placeholder="John Doe"
          autoFocus
        />

        <Input
          label="Phone"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          autoComplete="tel"
          placeholder="+91 98765 43210"
          hint="Optional, but dealers use it to reach you about deliveries and servicing."
        />

        <Input
          label="Address Line 1"
          value={addressLine1}
          onChange={e => setAddressLine1(e.target.value)}
          autoComplete="address-line1"
          placeholder="Flat, street, area"
        />

        <Input
          label="Address Line 2"
          value={addressLine2}
          onChange={e => setAddressLine2(e.target.value)}
          autoComplete="address-line2"
          placeholder="City, state, country"
        />

        {formError && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-red-950/40 border border-red-800/50 rounded">
            <span className="text-red-400 text-xs mt-0.5">✕</span>
            <p className="text-xs text-red-300">{formError}</p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={submitting}>
            Save and continue
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CustomerOnboardingGate;
