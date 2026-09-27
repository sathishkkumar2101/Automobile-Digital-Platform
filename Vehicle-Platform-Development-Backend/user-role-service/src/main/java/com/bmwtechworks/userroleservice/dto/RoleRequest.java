package com.bmwtechworks.userroleservice.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Set;
import java.util.UUID;

public record RoleRequest(

        @NotBlank(message = "Role name is required")
        String name,

        String description,

        /**
         * Null leaves the role's current permissions untouched, which lets a
         * caller edit the name or description without having to restate the
         * whole permission set. An empty set removes them all.
         */
        Set<UUID> permissionIds
) {
}