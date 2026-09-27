import React, { useEffect, useRef } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { LoadError } from '../ui/LoadError';
import type { ChatMessage } from '../../types/messaging';

interface MessageThreadProps {
  conversationId: string;
}

function time(stamp: string): string {
  const d = new Date(stamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ticks(message: ChatMessage, meId: string): string {
  if (message.senderId !== meId) return '';
  switch (message.status) {
    case 'READ':
      return '✓✓';
    case 'DELIVERED':
      return '✓✓';
    default:
      return '✓';
  }
}

function nameFor(message: ChatMessage, meId: string): string {
  if (message.senderId === meId) return 'You';
  return message.senderRole === 'ADMIN'
    ? 'Admin'
    : message.senderRole === 'DEALER'
      ? 'Dealer'
      : 'Customer';
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const {
    messages,
    typingUsers,
    loadingMessagesId,
    conversations,
    threadLoadError,
    selectConversation,
  } = useChat();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const list = messages[conversationId] ?? [];
  const meId = (() => {
    try {
      return (JSON.parse(localStorage.getItem('auth_user')!) as { id: string }).id;
    } catch {
      return '';
    }
  })();
  const typing = typingUsers[conversationId] ?? {};
  const typingNames = Object.values(typing);
  const loading = loadingMessagesId === conversationId;
  const failedHere = threadLoadError?.conversationId === conversationId
    ? threadLoadError.error
    : null;
  const conversation = conversations.find(
    (c) => c.conversationId === conversationId,
  );

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [list.length, conversationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full gap-3 text-zinc-600">
        <div className="w-5 h-5 border border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-widest font-mono">Loading messages</p>
      </div>
    );
  }

  // Checked before the empty state, and not as a special case inside it. A
  // thread whose history failed to load has zero rendered messages for exactly
  // the same reason a brand new thread does, and the two are not the same fact
  // about the user's data.
  if (failedHere !== null) {
    return (
      <div className="p-4">
        <LoadError
          resource="this conversation"
          error={failedHere}
          impact="Its messages are not shown, and anything you send now may be out of order."
          onRetry={() => void selectConversation(conversationId)}
        />
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-zinc-600 px-6 text-center">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        <p className="text-sm">Say hello to start the conversation</p>
        <p className="text-xs">Messages are delivered in real time.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {list.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={[
                  'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  mine
                    ? 'bg-amber-500 text-zinc-950 rounded-br-md'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-md',
                ].join(' ')}
              >
                {!mine && (
                  <p
                    className={[
                      'text-[10px] font-semibold uppercase tracking-widest mb-1',
                      m.senderRole === 'ADMIN'
                        ? 'text-red-400'
                        : m.senderRole === 'DEALER'
                          ? 'text-amber-400'
                          : 'text-blue-400',
                    ].join(' ')}
                  >
                    {nameFor(m, meId)}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p
                  className={[
                    'mt-1 text-[10px] font-mono flex items-center gap-1',
                    mine ? 'text-zinc-800' : 'text-zinc-500',
                  ].join(' ')}
                >
                  {time(m.timestamp)}
                  {mine && <span className="font-bold">{ticks(m, meId)}</span>}
                </p>
              </div>
            </div>
          );
        })}
        {typingNames.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 text-zinc-400 rounded-2xl rounded-bl-md px-3.5 py-2 text-xs italic">
              {typingNames.join(', ')} typing…
            </div>
          </div>
        )}
      </div>
      {!conversation?.lastMessage && !loading && (
        <div className="text-center text-[10px] text-zinc-700 font-mono uppercase tracking-widest pb-1">
          New conversation
        </div>
      )}
    </div>
  );
}