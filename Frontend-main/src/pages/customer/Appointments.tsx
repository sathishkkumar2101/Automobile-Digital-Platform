import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/layout/PageHeader';
import { Table } from '../../components/ui/Table';
import { AppointmentStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ChatStartButton } from '../../components/chat/ChatStartButton';
import { formatDate, formatCurrency } from '../../lib/format';
import api from '../../lib/api';
import type { Appointment, PageResponse } from '../../types';

export default function CustomerAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PageResponse<Appointment> | Appointment[]>('/api/appointments')
      .then(res => setAppointments(Array.isArray(res) ? res : res.content ?? []))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Service Appointments"
        subtitle="Manage your vehicle service history and upcoming bookings"
        breadcrumbs={[{ label: 'Customer' }, { label: 'Service' }]}
        actions={
          <Link to="/customer/appointments/book">
            <Button size="sm">Book Appointment</Button>
          </Link>
        }
      />
      <div className="bg-zinc-900 border border-zinc-800 rounded overflow-hidden">
        <Table
          loading={loading}
          data={appointments}
          keyExtractor={a => a.id}
          emptyMessage="No appointments scheduled"
          columns={[
            { key: 'id', header: '#', width: '80px', render: a => <span className="font-mono text-zinc-500">#{a.id}</span> },
            { key: 'service', header: 'Service Type', render: a => (
              <span className="capitalize">{a.serviceType ? a.serviceType.toLowerCase().replace(/_/g, ' ') : 'General Service'}</span>
            )},
            { key: 'date', header: 'Requested On', render: a => (
              <div>
                <p>{formatDate(a.appointmentDate)}</p>
              </div>
            )},
            { key: 'status', header: 'Status', render: a => <AppointmentStatusBadge status={a.status} /> },
            { key: 'chat', header: '', width: '120px', render: a => (
              a.dealerId ? (
                <ChatStartButton
                  label="Discuss"
                  variant="ghost"
                  size="sm"
                  redirectTo="/customer/messages"
                  request={{
                    contextType: 'APPOINTMENT',
                    contextId: a.id,
                    dealerId: a.dealerId,
                    title: `Appointment #${a.id}`,
                  }}
                />
              ) : null
            )},
          ]}
        />
      </div>
    </div>
  );
}
