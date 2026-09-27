package com.bmwtechworks.permissionservice.dto;

import jakarta.validation.constraints.NotBlank;

public record PermissionRequest(

        @NotBlank(message = "Permission name is required")
        String name,

        String description
) {
}