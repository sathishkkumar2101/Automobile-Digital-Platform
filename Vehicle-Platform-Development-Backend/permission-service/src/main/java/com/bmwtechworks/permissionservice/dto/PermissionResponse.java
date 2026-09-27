package com.bmwtechworks.permissionservice.dto;

import java.util.UUID;

public record PermissionResponse(
        UUID id,
        String name,
        String description
) {
}