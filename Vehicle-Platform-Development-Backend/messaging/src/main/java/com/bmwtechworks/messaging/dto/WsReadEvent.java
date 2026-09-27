package com.bmwtechworks.messaging.dto;

import java.util.UUID;

public record WsReadEvent(
        String type,
        String conversationId,
        UUID readerUserId
) {
    public static final String TYPE = "READ";
}