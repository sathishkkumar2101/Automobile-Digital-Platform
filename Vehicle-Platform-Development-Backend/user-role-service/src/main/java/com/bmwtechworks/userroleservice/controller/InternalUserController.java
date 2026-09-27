package com.bmwtechworks.userroleservice.controller;

import com.bmwtechworks.userroleservice.dto.UserProfileResponse;
import com.bmwtechworks.userroleservice.service.UserService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Internal-only endpoints for other microservices (e.g. messaging). These
 * paths are not routed through the API Gateway.
 */
@RestController
@RequestMapping("/api/internal/users")
public class InternalUserController {

    private final UserService userService;

    public InternalUserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/{id}")
    public UserProfileResponse getProfile(@PathVariable UUID id) {
        return userService.getProfile(id);
    }

    /**
     * Username lookup for service-to-service callers.
     *
     * The dealer service needs the user id behind a username when an
     * administrator registers a dealership. The public
     * /api/users/username/{username} route requires an ADMIN JWT, which a
     * Feign call from another service cannot present, so the lookup is
     * exposed here instead, behind the shared internal secret.
     */
    @GetMapping("/username/{username}")
    public UserProfileResponse getProfileByUsername(@PathVariable String username) {
        return userService.getProfileByUsername(username);
    }

    @GetMapping("/administrator")
    public UserProfileResponse getAdministrator() {
        return userService.getAdministrator();
    }
}