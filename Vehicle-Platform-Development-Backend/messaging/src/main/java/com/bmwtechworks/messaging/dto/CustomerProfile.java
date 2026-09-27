package com.bmwtechworks.messaging.dto;

import java.util.UUID;

public record CustomerProfile(
        UUID id,
        UUID userId,
        String name,
        String email
) {
}