package com.bmwtechworks.userroleservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String name,
        String email,
        UUID roleId,
        String role,
        LocalDateTime createdAt
) {
}