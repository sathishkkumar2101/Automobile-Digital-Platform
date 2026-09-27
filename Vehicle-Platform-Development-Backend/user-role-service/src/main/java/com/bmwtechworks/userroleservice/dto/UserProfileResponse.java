package com.bmwtechworks.userroleservice.dto;

import java.util.UUID;

/**
 * Compact profile used by internal service-to-service calls (e.g. the messaging
 * service) to resolve a user's display identity and role. These endpoints are
 * not routed through the API Gateway.
 */
public record UserProfileResponse(
        UUID id,
        String name,
        String email,
        String roleName
) {
}