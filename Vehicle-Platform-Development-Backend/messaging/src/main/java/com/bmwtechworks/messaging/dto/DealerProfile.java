package com.bmwtechworks.messaging.dto;

import java.util.UUID;

public record DealerProfile(
        UUID dealerId,
        UUID userId,
        String name,
        String location
) {
}