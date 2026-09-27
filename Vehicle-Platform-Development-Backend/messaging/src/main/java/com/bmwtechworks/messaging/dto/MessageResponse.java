package com.bmwtechworks.messaging.dto;

import com.bmwtechworks.messaging.model.MessageRole;
import com.bmwtechworks.messaging.model.MessageStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        UUID conversationId,
        UUID senderId,
        MessageRole senderRole,
        UUID receiverId,
        String content,
        LocalDateTime timestamp,
        MessageStatus status,
        List<UUID> readByUserIds
) {
}