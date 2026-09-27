package com.bmwtechworks.messaging.dto;

public record WsMessageEvent(
        String type,
        MessageResponse message
) {
    public static final String TYPE = "MESSAGE";
}