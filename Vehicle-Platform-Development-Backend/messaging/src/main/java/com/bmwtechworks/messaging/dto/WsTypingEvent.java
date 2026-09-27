package com.bmwtechworks.messaging.dto;

import java.util.UUID;

public record WsTypingEvent(
        String type,
        String conversationId,
        UUID userId,
        String userName,
        boolean typing
) {
    public static final String TYPE = "TYPING";
}