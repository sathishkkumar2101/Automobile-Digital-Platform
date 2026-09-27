export type ConversationContextType =
  | 'GENERAL'
  | 'ORDER'
  | 'VEHICLE'
  | 'APPOINTMENT';

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export type MessageSenderRole = 'ADMIN' | 'DEALER' | 'CUSTOMER';

export interface ParticipantInfo {
  /**
   * Mirrors the messaging service's `ParticipantInfo(UUID userId, String name,
   * String email, String role)`. `userId` is the auth-service user id — the same
   * UUID as `auth_user.id` — which is not the customer-service profile id for
   * the same person. `name`, `email` and `role` are nullable because the
   * service falls back to an empty profile when the user-role lookup fails.
   */
  userId: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: MessageSenderRole;
  receiverId: string | null;
  content: string;
  timestamp: string;
  status: MessageStatus;
  readByUserIds: string[];
}

export interface ConversationSummary {
  conversationId: string;
  contextType: ConversationContextType;
  contextId: string | null;
  title: string | null;
  participantIds: string[];
  participants: ParticipantInfo[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListResponse {
  items: ConversationSummary[];
  totalUnread: number;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
}

export interface CreateConversationRequest {
  contextType: ConversationContextType;
  contextId?: string;
  title?: string;
  dealerId?: string;
  customerId?: string;
  recipientUserId?: string;
}

export interface PageResponseMessages {
  content: ChatMessage[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface WsMessageEvent {
  type: 'MESSAGE';
  message: ChatMessage;
}

export interface WsReadEvent {
  type: 'READ';
  conversationId: string;
  readerUserId: string;
}

export interface WsTypingEvent {
  type: 'TYPING';
  conversationId: string;
  userId: string;
  userName: string;
  typing: boolean;
}

export type WsEvent = WsMessageEvent | WsReadEvent | WsTypingEvent;