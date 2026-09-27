package com.bmwtechworks.messaging.service;

import com.bmwtechworks.messaging.dto.MessageResponse;
import com.bmwtechworks.messaging.dto.WsMessageEvent;
import com.bmwtechworks.messaging.dto.WsReadEvent;
import com.bmwtechworks.messaging.dto.WsTypingEvent;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

/**
 * Pushes real-time events to the user-specific STOMP queues
 * /user/{userId}/queue/{messages|read|typing}.
 */
@Service
public class RealtimeService {

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishMessage(Set<UUID> participantIds, MessageResponse message) {
        WsMessageEvent event = new WsMessageEvent(WsMessageEvent.TYPE, message);
        for (UUID participant : participantIds) {
            messagingTemplate.convertAndSendToUser(
                    participant.toString(),
                    "/queue/messages",
                    event
            );
        }
    }

    public void publishRead(Set<UUID> participantIds, UUID readerUserId, UUID conversationId) {
        WsReadEvent event = new WsReadEvent(
                WsReadEvent.TYPE,
                conversationId.toString(),
                readerUserId
        );
        for (UUID participant : participantIds) {
            if (!participant.equals(readerUserId)) {
                messagingTemplate.convertAndSendToUser(
                        participant.toString(),
                        "/queue/read",
                        event
                );
            }
        }
    }

    public void publishTyping(
            Set<UUID> participantIds,
            UUID fromUserId,
            String fromName,
            UUID conversationId,
            boolean typing
    ) {
        WsTypingEvent event = new WsTypingEvent(
                WsTypingEvent.TYPE,
                conversationId.toString(),
                fromUserId,
                fromName,
                typing
        );
        for (UUID participant : participantIds) {
            if (!participant.equals(fromUserId)) {
                messagingTemplate.convertAndSendToUser(
                        participant.toString(),
                        "/queue/typing",
                        event
                );
            }
        }
    }
}