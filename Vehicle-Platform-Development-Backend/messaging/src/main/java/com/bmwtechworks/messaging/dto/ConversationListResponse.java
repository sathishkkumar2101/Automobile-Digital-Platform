package com.bmwtechworks.messaging.dto;

import java.util.List;

public record ConversationListResponse(
        List<ConversationResponse> items,
        long totalUnread
) {
    public static ConversationListResponse empty() {
        return new ConversationListResponse(List.of(), 0);
    }
}