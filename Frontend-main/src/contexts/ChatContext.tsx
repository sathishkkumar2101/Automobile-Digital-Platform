import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { getToken } from '../lib/auth';
import {
  connectMessaging,
  disconnectMessaging,
  setMessagingHandlers,
  isMessagingConnected,
  sendTypingFrame,
  sendReadReceiptFrame,
  sendDeliveredReceiptFrame,
  fetchConversations,
  fetchMessageHistory,
  createConversation,
  sendMessage,
  markConversationReadRest,
} from '../lib/messaging';
import type {
  ChatMessage,
  ConversationContextType,
  ConversationSummary,
  CreateConversationRequest,
  MessageSenderRole,
} from '../types/messaging';

interface ChatContextValue {
  conversations: ConversationSummary[];
  totalUnread: number;
  connected: boolean;
  messages: Record<string, ChatMessage[]>;
  typingUsers: Record<string, Record<string, string>>;
  selectedId: string | null;
  isLoadingList: boolean;
  /**
   * Set when the conversation list could not be loaded, cleared on the next
   * success. Kept separate from the send-error channel because a failed list
   * load and a failed send are different faults: the first means the inbox
   * cannot be trusted, the second means one message did not go out.
   */
  listLoadError: unknown;
  loadingMessagesId: string | null;
  /**
   * Set when the selected thread's history could not be read, keyed to the
   * conversation it belongs to.
   *
   * <p>Without this the catch below was empty, so a failed history read left
   * `messages[id]` undefined and the thread rendered its zero-message state —
   * "Say hello to start the conversation" — on a conversation that already had
   * messages in the database. A 500 from the messaging service was reported to
   * the customer as an invitation to send the first message in a thread they had
   * already written, and the only visible symptom was their own message not
   * appearing after a reload.
   */
  threadLoadError: { conversationId: string; error: unknown } | null;
  clearThreadLoadError: () => void;
  filterContextType: string | null;
  setFilterContextType: (type: string | null) => void;
  refresh: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  clearSelection: () => void;
  send: (conversationId: string, content: string) => Promise<ChatMessage>;
  startOrOpenConversation: (
    request: CreateConversationRequest,
  ) => Promise<ConversationSummary>;
  openedConversations: string[];
}

const ChatContext = createContext<ChatContextValue | null>(null);

const POLL_INTERVAL_MS = 30_000;

/**
 * Whether `conversation` is already the thread that `request` is asking for.
 *
 * <p>The previous version compared only `contextId`, and only when the request
 * had one. Every context that identifies its target some other way therefore
 * skipped the check entirely and opened a fresh thread on each visit — a dealer
 * page reached twice left two identical threads behind, which is what had
 * accumulated seven copies of the same BMW Chennai conversation in the fixture
 * database.
 *
 * <p>For the id-less contexts the recipient is matched by *auth* user id, and
 * that is not a stylistic choice. A conversation records `participants` as auth
 * user ids, while the `dealerId` / `customerId` on the request are ids minted by
 * the dealer and customer services. They are different UUIDs for the same
 * person, so no client-side comparison can line them up, and matching on
 * `dealerId` would silently compare unrelated values and never match.
 */
function isSameTarget(
  conversation: ConversationSummary,
  request: CreateConversationRequest,
): boolean {
  if (conversation.contextType !== request.contextType) return false;

  if (request.contextId) {
    return conversation.contextId === request.contextId;
  }

  if (request.recipientUserId) {
    return conversation.participants.some(
      (p) => p.userId === request.recipientUserId,
    );
  }

  // No comparable identifier on either side. Creating is the safe answer:
  // a duplicate thread is untidy, whereas reusing a thread that belongs to a
  // different order or vehicle puts unrelated messages in front of a customer.
  return false;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [typingUsers, setTypingUsers] = useState<
    Record<string, Record<string, string>>
  >({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listLoadError, setListLoadError] = useState<unknown>(null);
  const [loadingMessagesId, setLoadingMessagesId] = useState<string | null>(null);
  const [threadLoadError, setThreadLoadError] = useState<{
    conversationId: string;
    error: unknown;
  } | null>(null);
  const [openedConversations, setOpenedConversations] = useState<string[]>([]);
  const [filterContextType, setFilterContextType] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    // Announced for the whole duration of the request, not just the success
    // path. `ConversationList` has a spinner branch behind this flag that was
    // never reachable, because nothing ever set the flag — so every messaging
    // screen painted "No conversations yet" on its first paint and then
    // repopulated a second later, asserting that the user had no conversations
    // during exactly the window where the answer was not yet known.
    setIsLoadingList(true);
    try {
      const data = await fetchConversations(
        filterContextType ? { contextType: filterContextType } : undefined,
      );
      setConversations(data.items);
      setTotalUnread(data.totalUnread);
      setListLoadError(null);
    } catch (error) {
      // Recorded rather than discarded. This previously kept the last known
      // list and said nothing, on the assumption that "network failures are
      // surfaced by the REST layer" — but nothing in the REST layer reaches
      // this far, so an unreachable messaging service rendered as an inbox with
      // no conversations in it, which is indistinguishable from an inbox where
      // nobody has ever contacted anybody.
      setListLoadError(error);
    } finally {
      setIsLoadingList(false);
    }
  }, [filterContextType]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      void refresh();
      if (!pollTimer.current) {
        pollTimer.current = setInterval(() => {
          // WS is the primary real-time channel; polling acts as the fallback
          // so nothing is missed while the socket is down.
          void refresh();
        }, POLL_INTERVAL_MS);
      }
    }
    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [isAuthenticated, refresh]);

  // STOMP lifecycle
  useEffect(() => {
    if (!isAuthenticated) {
      disconnectMessaging();
      setConnected(false);
      return;
    }
    const token = getToken();
    if (!token) return;

    setMessagingHandlers({
      onMessage: (message) => {
        // Dedupe on the server-assigned id so cross-tab duplicates collapse.
        setMessages((prev) => {
          const list = prev[message.conversationId] ?? [];
          if (list.some((m) => m.id === message.id)) return prev;
          return {
            ...prev,
            [message.conversationId]: [...list, message].sort(
              (a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            ),
          };
        });

        setConversations((prev) => {
          const existing = prev.find(
            (c) => c.conversationId === message.conversationId,
          );
          if (!existing) return prev;
          const incomingUnread = existing.unreadCount + 1;
          return [
            {
              ...existing,
              lastMessage: message,
              updatedAt: message.timestamp,
              unreadCount: incomingUnread,
            },
            ...prev.filter((c) => c.conversationId !== message.conversationId),
          ];
        });
        setTotalUnread((prev) => prev + 1);
      },
      onRead: (conversationId, readerUserId) => {
        setMessages((prev) => {
          const list = prev[conversationId];
          if (!list) return prev;
          return {
            ...prev,
            [conversationId]: list.map((m) =>
              m.senderId !== readerUserId &&
              !m.readByUserIds.includes(readerUserId)
                ? {
                    ...m,
                    status: 'READ' as const,
                    readByUserIds: [...m.readByUserIds, readerUserId],
                  }
                : m,
            ),
          };
        });
      },
      onTyping: (conversationId, userId, userName, typing) => {
        setTypingUsers((prev) => {
          if (!typing) {
            const current = prev[conversationId];
            if (!current || !current[userId]) return prev;
            const next = { ...current };
            delete next[userId];
            return { ...prev, [conversationId]: next };
          }
          return {
            ...prev,
            [conversationId]: {
              ...(prev[conversationId] ?? {}),
              [userId]: userName,
            },
          };
        });
      },
      onStateChange: (state) => setConnected(state),
    });

    connectMessaging(token);
    return () => {
      disconnectMessaging();
    };
  }, [isAuthenticated]);

  const selectConversation = useCallback(
    async (id: string): Promise<void> => {
      setSelectedId(id);
      setLoadingMessagesId(id);
      // Any failure reported for the previous thread must not be inherited by
      // this one, or a stale banner would appear over unrelated messages.
      setThreadLoadError(null);

      // Level 1: already cached in memory
      if (messages[id] && messages[id].length > 0) {
        setLoadingMessagesId(null);
        return;
      }

      try {
        const data = await fetchMessageHistory(id, 0, 100);
        setMessages((prev) => ({
          ...prev,
          [id]: data.content
            .slice()
            .reverse()
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            ),
        }));

        // Mark as read + fire read receipts over the socket.
        try {
          await markConversationReadRest(id);
        } catch {
          /* best effort */
        }
        if (isMessagingConnected()) {
          sendDeliveredReceiptFrame(id);
          sendReadReceiptFrame(id);
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.conversationId === id ? { ...c, unreadCount: 0 } : c,
          ),
        );
        void refresh();
      } catch (error) {
        // Surfaced rather than ignored. `messages[id]` is deliberately left
        // untouched: writing an empty array here would make the failure
        // indistinguishable from a genuinely new conversation, which is the
        // whole point of the state this records.
        setThreadLoadError({ conversationId: id, error });
      } finally {
        setLoadingMessagesId(null);
      }
    },
    [messages, refresh],
  );

  const clearThreadLoadError = useCallback(
    () => setThreadLoadError(null),
    [],
  );

  const clearSelection = useCallback(() => setSelectedId(null), []);

  const send = useCallback(
    async (conversationId: string, content: string): Promise<ChatMessage> => {
      const trimmed = content.trim();
      if (!trimmed) throw new Error('Message cannot be empty');
      const sent = await sendMessage({ conversationId, content: trimmed });

      setMessages((prev) => {
        const list = prev[conversationId] ?? [];
        if (list.some((m) => m.id === sent.id)) return prev;
        return {
          ...prev,
          [conversationId]: [...list, sent],
        };
      });
      setConversations((prev) => {
        const existing = prev.find((c) => c.conversationId === conversationId);
        if (!existing) return prev;
        return [
          { ...existing, lastMessage: sent, updatedAt: sent.timestamp },
          ...prev.filter((c) => c.conversationId !== conversationId),
        ];
      });
      return sent;
    },
    [],
  );

  const startOrOpenConversation = useCallback(
    async (request: CreateConversationRequest): Promise<ConversationSummary> => {
      // Re-use an existing conversation for the same context target instead of
      // creating a duplicate thread.
      let current = conversations;
      try {
        const data = await fetchConversations();
        current = data.items;
        setConversations(data.items);
        setTotalUnread(data.totalUnread);
      } catch {
        /* fall back to in-memory list */
      }

      const existing = current.find((c) => isSameTarget(c, request));
      if (existing) {
        await selectConversation(existing.conversationId);
        return existing;
      }

      const conversation = await createConversation(request);
      setConversations((prev) => [
        conversation,
        ...prev.filter((c) => c.conversationId !== conversation.conversationId),
      ]);
      setOpenedConversations((prev) => [
        ...new Set([...prev, conversation.conversationId]),
      ]);
      await selectConversation(conversation.conversationId);
      return conversation;
    },
    [conversations, selectConversation],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      totalUnread,
      connected,
      messages,
      typingUsers,
      selectedId,
      isLoadingList,
      listLoadError,
      loadingMessagesId,
      threadLoadError,
      clearThreadLoadError,
      filterContextType,
      setFilterContextType,
      refresh,
      selectConversation,
      clearSelection,
      send,
      startOrOpenConversation,
      openedConversations,
    }),
    [
      conversations,
      totalUnread,
      connected,
      messages,
      typingUsers,
      selectedId,
      isLoadingList,
      listLoadError,
      loadingMessagesId,
      threadLoadError,
      clearThreadLoadError,
      filterContextType,
      refresh,
      selectConversation,
      clearSelection,
      send,
      startOrOpenConversation,
      openedConversations,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}

type SenderRole = MessageSenderRole;

export function senderRoleFromUser(
  role: string | undefined | null,
): SenderRole {
  if (role === 'DEALER') return 'DEALER';
  if (role === 'ADMIN') return 'ADMIN';
  return 'CUSTOMER';
}

export function contextLabel(type: ConversationContextType): string {
  switch (type) {
    case 'ORDER':
      return 'Order';
    case 'VEHICLE':
      return 'Vehicle';
    case 'APPOINTMENT':
      return 'Service';
    default:
      return 'General';
  }
}