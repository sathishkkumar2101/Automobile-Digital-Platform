import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../../contexts/ChatContext';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import type { CreateConversationRequest } from '../../types/messaging';

interface ChatStartButtonProps {
  request: CreateConversationRequest;
  label?: string;
  redirectTo?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  full?: boolean;
}

export function ChatStartButton({
  request,
  label = 'Start Chat',
  redirectTo = '/messages',
  variant = 'secondary',
  size = 'md',
  className = '',
  full,
}: ChatStartButtonProps) {
  const { startOrOpenConversation } = useChat();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleStart() {
    setBusy(true);
    try {
      await startOrOpenConversation(request);
      success('Conversation started');
      navigate(redirectTo);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Could not start the conversation');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={[full ? 'w-full' : '', className].join(' ')}
      loading={busy}
      onClick={() => void handleStart()}
    >
      {label}
    </Button>
  );
}