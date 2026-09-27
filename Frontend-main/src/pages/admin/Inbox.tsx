import React, { useEffect } from 'react';
import { ChatPanel } from '../../components/chat/ChatPanel';
import { useChat } from '../../contexts/ChatContext';

const FILTERS: { label: string; value: string | null }[] = [
  { label: 'All', value: null },
  { label: 'Orders', value: 'ORDER' },
  { label: 'Vehicles', value: 'VEHICLE' },
  { label: 'Service', value: 'APPOINTMENT' },
  { label: 'General', value: 'GENERAL' },
];

export default function AdminInbox() {
  const { filterContextType, setFilterContextType, clearSelection } = useChat();

  useEffect(() => {
    return () => clearSelection();
  }, [clearSelection]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-white">Support Inbox</h1>
          <p className="text-sm text-zinc-500">
            Every customer and dealer conversation, in one place.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => {
                setFilterContextType(f.value);
              }}
              className={[
                'px-3 py-1.5 text-xs rounded-md whitespace-nowrap transition-colors',
                filterContextType === f.value
                  ? 'bg-amber-500 text-zinc-950 font-medium'
                  : 'text-zinc-400 hover:text-white',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ChatPanel emptyTitle="Support Inbox" />
      </div>
    </div>
  );
}