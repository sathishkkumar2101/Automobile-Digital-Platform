import { Client, type IMessage } from '@stomp/stompjs';
import api from './api';
import type {
  ChatMessage,
  ConversationListResponse,
  ConversationSummary,
  CreateConversationRequest,
  PageResponseMessages,
  SendMessageRequest,
} from '../types/messaging';

/**
 * Real-time messaging client for the messaging-service.
 *
 * Transport: STOMP over a native WebSocket at `/ws`. Production traffic arrives
 * through nginx (which upgrades /ws to messaging-service:8101) and development
 * traffic through the Vite `/ws` proxy. REST paths below are routed via the API
 * Gateway to `/api/messages/**`.
 */

export interface MessagingHandlers {
  onMessage: (message: ChatMessage) => void;
  onRead: (conversationId: string, readerUserId: string) => void;
  onTyping: (
    conversationId: string,
    userId: string,
    userName: string,
    typing: boolean,
  ) => void;
  onStateChange: (connected: boolean) => void;
}

let client: Client | null = null;
let handlers: MessagingHandlers | null = null;
let currentToken: string | null = null;

function wsBrokerUrl(token: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}

export function setMessagingHandlers(h: MessagingHandlers) {
  handlers = h;
}

export function isMessagingConnected(): boolean {
  return client !== null && client.connected;
}

function emitState(connected: boolean) {
  handlers?.onStateChange(connected);
}

export function connectMessaging(token: string): void {
  if (client && client.connected && token === currentToken) {
    return;
  }
  if (client) {
    try {
      client.deactivate();
    } catch {
      /* ignore */
    }
    client = null;
  }

  currentToken = token;

  const sock = new Client({
    brokerURL: wsBrokerUrl(token),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  });

  sock.onConnect = () => {
    emitState(true);

    sock.subscribe('/user/queue/messages', (frame: IMessage) => {
      try {
        const body = JSON.parse(frame.body) as { message?: ChatMessage };
        if (body && body.message) {
          handlers?.onMessage(body.message);
        }
      } catch {
        /* ignore malformed frames */
      }
    });

    sock.subscribe('/user/queue/read', (frame: IMessage) => {
      try {
        const body = JSON.parse(frame.body) as {
          conversationId: string;
          readerUserId: string;
        };
        handlers?.onRead(body.conversationId, body.readerUserId);
      } catch {
        /* ignore */
      }
    });

    sock.subscribe('/user/queue/typing', (frame: IMessage) => {
      try {
        const body = JSON.parse(frame.body) as {
          conversationId: string;
          userId: string;
          userName: string;
          typing: boolean;
        };
        handlers?.onTyping(
          body.conversationId,
          body.userId,
          body.userName,
          body.typing,
        );
      } catch {
        /* ignore */
      }
    });
  };

  sock.onWebSocketClose = () => emitState(false);
  sock.onWebSocketError = () => emitState(false);
  sock.onStompError = () => emitState(false);

  sock.activate();

  client = sock;
}

export function disconnectMessaging(): void {
  if (client) {
    try {
      client.deactivate();
    } catch {
      /* ignore */
    }
    client = null;
    currentToken = null;
    emitState(false);
  }
}

function requiresConnection(): boolean {
  if (client && client.connected) return true;
  return false;
}

export function sendTypingFrame(conversationId: string, typing: boolean): void {
  if (!requiresConnection()) return;
  client?.publish({
    destination: '/app/typing',
    body: JSON.stringify({ conversationId, typing }),
  });
}

export function sendReadReceiptFrame(conversationId: string): void {
  if (!requiresConnection()) return;
  client?.publish({
    destination: '/app/msg/read',
    body: JSON.stringify({ conversationId }),
  });
}

export function sendDeliveredReceiptFrame(conversationId: string): void {
  if (!requiresConnection()) return;
  client?.publish({
    destination: '/app/msg/delivered',
    body: JSON.stringify({ conversationId }),
  });
}

// ---------------------------------------------------------------------------
// REST helpers (through the API Gateway /api/messages/**)
// ---------------------------------------------------------------------------

export async function fetchConversations(
  params?: {
    contextType?: string;
    dealerId?: string;
    customerId?: string;
  },
): Promise<ConversationListResponse> {
  const query = new URLSearchParams();
  if (params?.contextType) query.set('contextType', params.contextType);
  if (params?.dealerId) query.set('dealerId', params.dealerId);
  if (params?.customerId) query.set('customerId', params.customerId);
  const qs = query.toString();
  return api.get<ConversationListResponse>(
    `/api/messages/conversations${qs ? `?${qs}` : ''}`,
  );
}

export async function fetchConversation(
  conversationId: string,
): Promise<ConversationSummary> {
  return api.get<ConversationSummary>(
    `/api/messages/conversations/${conversationId}`,
  );
}

export async function fetchMessageHistory(
  conversationId: string,
  page = 0,
  size = 50,
): Promise<PageResponseMessages> {
  return api.get<PageResponseMessages>(
    `/api/messages/conversations/${conversationId}/messages?page=${page}&size=${size}`,
  );
}

export async function createConversation(
  request: CreateConversationRequest,
): Promise<ConversationSummary> {
  return api.post<ConversationSummary>(
    '/api/messages/conversations',
    request,
  );
}

export async function sendMessage(
  request: SendMessageRequest,
): Promise<ChatMessage> {
  return api.post<ChatMessage>('/api/messages/send', request);
}

export async function markConversationReadRest(
  conversationId: string,
): Promise<{ conversationId: string; unreadCount: number }> {
  return api.put<{ conversationId: string; unreadCount: number }>(
    `/api/messages/conversations/${conversationId}/read`,
  );
}

export async function markMessageReadRest(
  messageId: string,
): Promise<{ messageId: string; status: string }> {
  return api.put<{ messageId: string; status: string }>(
    `/api/messages/${messageId}/read`,
  );
}