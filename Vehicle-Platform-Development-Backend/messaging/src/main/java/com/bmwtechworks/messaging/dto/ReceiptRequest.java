package com.bmwtechworks.messaging.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReceiptRequest(
        @NotNull UUID conversationId
) {
}