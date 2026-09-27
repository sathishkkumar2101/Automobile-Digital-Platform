package com.bmwtechworks.userroleservice.dto;

import java.util.List;
import java.util.UUID;

public record AuthorizationResponse(
        UUID userId,
        String role,
        List<String> permissions
) {
}