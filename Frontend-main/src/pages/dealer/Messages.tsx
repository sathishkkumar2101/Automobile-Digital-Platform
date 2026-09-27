import React, { useEffect } from 'react';
import { ChatPanel } from '../../components/chat/ChatPanel';
import { useChat } from '../../contexts/ChatContext';

export default function DealerMessages() {
  const { clearSelection } = useChat();

  useEffect(() => {
    return () => clearSelection();
  }, [clearSelection]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-7rem)]">
      <div>
        <h1 className="font-display text-xl font-semibold text-white">Messages</h1>
        <p className="text-sm text-zinc-500">
          Answer customer questions about orders, vehicles and service appointments.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <ChatPanel />
      </div>
    </div>
  );
}