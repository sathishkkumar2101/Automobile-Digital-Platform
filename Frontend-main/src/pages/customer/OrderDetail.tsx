import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { OrderStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ChatStartButton } from '../../components/chat/ChatStartButton';
import { formatCurrency, formatDate, formatMileage } from '../../lib/format';
import api from '../../lib/api';
import type { Order } from '../../types';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<Order>(`/api/v1/orders/${id}`)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Orders' }]}
        title={loading ? '—' : `Order #${order?.id}`}
        actions={
          <div className="flex items-center gap-2">
            {order && (
              <ChatStartButton
                label="Chat about this order"
                redirectTo="/customer/messages"
                variant="accent"
                request={{
                  contextType: 'ORDER',
                  contextId: order.id,
                  dealerId: order.dealerId,
                  title: `Order #${order.id}`,
                }}
              />
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-4 max-w-2xl">
          <Skeleton className="h-32 rounded" />
          <Skeleton className="h-48 rounded" />
        </div>
      ) : order ? (
        <div className="max-w-2xl space-y-5">
          {/* Status banner */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Order Status</p>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Placed On</p>
              <p className="text-sm text-white font-mono">{formatDate(order.createdAt)}</p>
            </div>
          </div>

          {/* Vehicle */}
          {order.vehicle && (
            <div className="bg-zinc-900 border border-zinc-800 rounded p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Vehicle</p>
              <div className="flex items-center gap-4">
                {order.vehicle.images?.[0] && (
                  <img src={order.vehicle.images[0]} alt="" className="w-24 h-16 object-cover rounded bg-zinc-800" />
                )}
                <div>
                  <p className="font-display text-lg font-semibold text-white">
                    {order.vehicle.model}
                  </p>
                  {order.vehicle.trim && <p className="text-sm text-zinc-400">{order.vehicle.trim}</p>}
                  {order.vehicle.color && <p className="text-xs text-zinc-500">{order.vehicle.color}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Financials */}
          <div className="bg-zinc-900 border border-zinc-800 rounded p-5">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Payment Summary</p>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Vehicle Price</span>
                <span className="text-white font-mono">{formatCurrency(order.totalAmount)}</span>
              </div>
              {order.downPayment && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Down Payment</span>
                  <span className="text-white font-mono">{formatCurrency(order.downPayment)}</span>
                </div>
              )}
              <div className="border-t border-zinc-800 pt-3 flex justify-between text-sm">
                <span className="text-zinc-300 font-medium">Remaining Balance</span>
                <span className="text-white font-mono font-semibold">
                  {formatCurrency(order.totalAmount - (order.downPayment ?? 0))}
                </span>
              </div>
            </div>
          </div>

          {order.notes && (
            <div className="bg-zinc-900 border border-zinc-800 rounded p-5">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
              <p className="text-sm text-zinc-300">{order.notes}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
