import React from 'react';
import { useChat, contextLabel } from '../../contexts/ChatContext';
import type { ChatMessage } from '../../types/messaging';
import { currentUserId, peerLabel, peersOf } from './peers';

interface ConversationListProps {
  onSelect?: (conversationId: string) => void;
}

function time(stamp: string): string {
  const d = new Date(stamp);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function preview(message: ChatMessage | null, meId: string): string {
  if (!message) return 'No messages yet';
  const prefix = message.senderId === meId ? 'You: ' : '';
  return prefix + message.content;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const { conversations, selectedId, selectConversation, isLoadingList } = useChat();
  const meId = currentUserId();

  async function handleSelect(id: string) {
    await selectConversation(id);
    onSelect?.(id);
  }

  if (isLoadingList && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600">
        <div className="w-5 h-5 border border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-widest font-mono">Loading</p>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-600 px-6 text-center">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <p className="text-sm">No conversations yet</p>
        <p className="text-xs">
          Start chatting from an order, a dealer, a vehicle or the support inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto divide-y divide-zinc-800/80">
      {conversations.map((c) => {
        const active = c.conversationId === selectedId;
        const label = peerLabel(c, meId);
        const peerCount = peersOf(c, meId).length;
        return (
          <button
            key={c.conversationId}
            onClick={() => void handleSelect(c.conversationId)}
            className={[
              'w-full text-left px-4 py-3 flex items-start gap-3 transition-colors',
              active
                ? 'bg-zinc-800/70'
                : 'hover:bg-zinc-900',
            ].join(' ')}
          >
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 text-sm font-medium shrink-0">
              {label.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-white truncate">
                  {label}
                </p>
                <span className="text-[10px] text-zinc-600 font-mono shrink-0">
                  {c.lastMessage ? time(c.lastMessage.timestamp) : ''}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-zinc-500 truncate">
                  {preview(c.lastMessage, meId)}
                </p>
                {c.unreadCount > 0 && (
                  <span className="shrink-0 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold flex items-center justify-center">
                    {c.unreadCount > 99 ? '99+' : c.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-mono px-1.5 py-0.5 rounded border border-zinc-800">
                  {contextLabel(c.contextType)}
                </span>
                <span className="text-[10px] text-zinc-700 font-mono">
                  {peerCount} participant{peerCount === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}