import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { ChatComposer } from './ChatComposer';
import { markConversationReadRest, sendReadReceiptFrame } from '../../lib/messaging';
import { currentUserId, peerLabel, roleSummary } from './peers';
import { LoadError } from '../ui/LoadError';

interface ChatPanelProps {
  emptyTitle?: string;
}

export function ChatPanel({ emptyTitle = 'Messages' }: ChatPanelProps) {
  const { selectedId, clearSelection, connected, conversations, messages, listLoadError, refresh } =
    useChat();
  const [error, setError] = useState<string | null>(null);
  const lastCountRef = useRef<number>(0);

  const selected = conversations.find((c) => c.conversationId === selectedId) ?? null;
  const selectedCount = selectedId ? (messages[selectedId]?.length ?? 0) : 0;

  // Listen for custom error events raised by the composer.
  useEffect(() => {
    function onError(e: Event) {
      setError((e as CustomEvent<string>).detail ?? 'Failed to send message');
    }
    window.addEventListener('chat:error', onError);
    return () => window.removeEventListener('chat:error', onError);
  }, []);

  // When new messages arrive in the open thread, push a read receipt.
  useEffect(() => {
    if (!selectedId) return;
    if (selectedCount > lastCountRef.current) {
      void markConversationReadRest(selectedId).catch(() => {});
      sendReadReceiptFrame(selectedId);
    }
    lastCountRef.current = selectedCount;
  }, [selectedCount, selectedId]);

  useEffect(() => {
    lastCountRef.current = 0;
  }, [selectedId]);

  function peerTitle(): string {
    if (!selected) return emptyTitle;
    return peerLabel(selected, currentUserId(), emptyTitle);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] h-full min-h-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      {/* List pane */}
      <div className={selectedId ? 'hidden lg:block lg:border-r border-zinc-800' : ''}>
        <div className="h-full flex flex-col">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Inbox</p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                {connected ? 'Live' : 'Offline — polling'}
              </p>
            </div>
            <span
              className={[
                'w-2 h-2 rounded-full',
                connected ? 'bg-emerald-500' : 'bg-zinc-600',
              ].join(' ')}
            />
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            {listLoadError !== null && (
              <div className="p-3">
                <LoadError
                  resource="conversations"
                  error={listLoadError}
                  impact="The list below may be out of date."
                  onRetry={() => void refresh()}
                />
              </div>
            )}
            <div className="flex-1 min-h-0">
              <ConversationList />
            </div>
          </div>
        </div>
      </div>

      {/* Thread pane */}
      <div className={selectedId ? '' : 'hidden lg:flex'}>
        {selectedId ? (
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={clearSelection}
                  className="lg:hidden text-zinc-400 hover:text-white"
                  aria-label="Back to conversations"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <p
                    data-testid="thread-title"
                    className="text-sm font-semibold text-white truncate"
                  >
                    {peerTitle()}
                  </p>
                  {selected && (
                    <p
                      data-testid="thread-roles"
                      className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 truncate"
                    >
                      {roleSummary(selected, currentUserId())}
                    </p>
                  )}
                </div>
              </div>
              {error && (
                <button
                  onClick={() => setError(null)}
                  className="text-[11px] text-red-400 border border-red-900/60 rounded px-2 py-0.5"
                  title="Dismiss"
                >
                  {error} ×
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <MessageThread conversationId={selectedId} />
            </div>
            <ChatComposer conversationId={selectedId} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-600 px-6 text-center">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            <p className="text-sm">Select a conversation to start chatting</p>
            <p className="text-xs max-w-xs">
              {emptyTitle === 'Support Inbox'
                ? 'Customers and dealers message you from their order, vehicle and service screens.'
                : 'Message the dealership, admin support or follow an ongoing order/vehicle thread.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}