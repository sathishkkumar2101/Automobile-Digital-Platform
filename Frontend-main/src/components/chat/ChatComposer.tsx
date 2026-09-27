import React, { useState, useCallback } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { sendTypingFrame } from '../../lib/messaging';

interface ChatComposerProps {
  conversationId: string;
}

export function ChatComposer({ conversationId }: ChatComposerProps) {
  const { send } = useChat();
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);

  const notifyTyping = useCallback(
    (typing: boolean) => {
      sendTypingFrame(conversationId, typing);
    },
    [conversationId],
  );

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);
      if (text) notifyTyping(true);
    },
    [notifyTyping],
  );

  const submit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await send(conversationId, trimmed);
      setValue('');
      notifyTyping(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send message';
      const evt = new CustomEvent('chat:error', { detail: message });
      window.dispatchEvent(evt);
    } finally {
      setSending(false);
    }
  }, [value, sending, conversationId, send, notifyTyping]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void submit();
      }
    },
    [submit],
  );

  return (
    <div className="border-t border-zinc-800 px-4 py-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => value.length === 0 && notifyTyping(false)}
          rows={1}
          placeholder="Type a message…"
          className="flex-1 resize-none bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 max-h-32"
        />
        <button
          onClick={() => void submit()}
          disabled={!value.trim() || sending}
          className={[
            'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
            value.trim() && !sending
              ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed',
          ].join(' ')}
          aria-label="Send message"
        >
          {sending ? (
            <div className="w-4 h-4 border border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          )}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-700 font-mono">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}