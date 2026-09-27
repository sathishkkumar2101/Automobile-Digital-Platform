package com.bmwtechworks.messaging.dto;

import com.bmwtechworks.messaging.model.ConversationContextType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ConversationResponse(
        UUID conversationId,
        ConversationContextType contextType,
        UUID contextId,
        String title,
        List<UUID> participantIds,
        List<ParticipantInfo> participants,
        MessageResponse lastMessage,
        long unreadCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}