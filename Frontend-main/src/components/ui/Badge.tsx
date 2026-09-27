import React from 'react';
import type { VehicleStatus, OrderStatus, AppointmentStatus } from '../../types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  success: 'bg-green-950/60 text-green-400 border-green-800/50',
  warning: 'bg-amber-950/60 text-amber-400 border-amber-800/50',
  danger: 'bg-red-950/60 text-red-400 border-red-800/50',
  info: 'bg-blue-950/60 text-blue-400 border-blue-800/50',
  accent: 'bg-amber-600/10 text-amber-400 border-amber-600/30',
  muted: 'bg-zinc-900 text-zinc-500 border-zinc-800',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={[
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border font-mono tracking-wider uppercase',
      variantClasses[variant],
      className,
    ].join(' ')}>
      {children}
    </span>
  );
}

export function VehicleStatusBadge({ status }: { status: VehicleStatus }) {
  const map: Record<VehicleStatus, { variant: BadgeVariant; label: string }> = {
    AVAILABLE: { variant: 'success', label: 'Available' },
    SOLD: { variant: 'danger', label: 'Sold' },
    RESERVED: { variant: 'warning', label: 'Reserved' },
  };
  const { variant, label } = map[status] ?? { variant: 'muted', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export function OrderStatusBadge({ status }: { status: OrderStatus | string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    CREATED: { variant: 'default', label: 'Created' },
    CONFIRMED: { variant: 'info', label: 'Confirmed' },
    IN_PRODUCTION: { variant: 'warning', label: 'In Production' },
    SHIPPED: { variant: 'accent', label: 'Shipped' },
    DELIVERED: { variant: 'success', label: 'Delivered' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
    // Backwards compatibility
    PENDING: { variant: 'warning', label: 'Pending' },
    PROCESSING: { variant: 'accent', label: 'Processing' },
  };
  const { variant, label } = map[status] ?? { variant: 'muted', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus | string }) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    REQUESTED: { variant: 'warning', label: 'Requested' },
    CONFIRMED: { variant: 'accent', label: 'Confirmed' },
    IN_PROGRESS: { variant: 'info', label: 'In Progress' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
    // Backwards compatibility
    SCHEDULED: { variant: 'info', label: 'Scheduled' },
  };
  const { variant, label } = map[status] ?? { variant: 'muted', label: status };
  return <Badge variant={variant}>{label}</Badge>;
}

/**
 * Renders a security role. The role may be missing (for example when only a
 * `roleId` is known) or may be a leftover test role, so unknown values degrade
 * to a muted placeholder instead of an empty badge.
 */
export function RoleBadge({ role }: { role?: string }) {
  const map: Record<string, { variant: BadgeVariant }> = {
    ADMIN: { variant: 'danger' },
    DEALER: { variant: 'accent' },
    CUSTOMER: { variant: 'info' },
  };
  const variant = role ? map[role]?.variant ?? 'default' : 'muted';
  return <Badge variant={variant}>{role || '—'}</Badge>;
}
