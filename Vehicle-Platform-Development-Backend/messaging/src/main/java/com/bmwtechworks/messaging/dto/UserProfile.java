package com.bmwtechworks.messaging.dto;

import java.util.UUID;

public record UserProfile(
        UUID id,
        String name,
        String email,
        String roleName
) {
}