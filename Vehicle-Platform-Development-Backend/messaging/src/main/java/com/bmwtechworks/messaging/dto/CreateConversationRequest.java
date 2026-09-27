package com.bmwtechworks.messaging.dto;

import com.bmwtechworks.messaging.model.ConversationContextType;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateConversationRequest(
        @NotNull ConversationContextType contextType,
        UUID contextId,
        String title,
        UUID dealerId,
        UUID customerId,
        UUID recipientUserId
) {
}