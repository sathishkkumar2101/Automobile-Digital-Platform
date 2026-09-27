package com.bmwtechworks.userroleservice.controller;

import com.bmwtechworks.userroleservice.dto.AuthorizationResponse;
import com.bmwtechworks.userroleservice.service.AuthorizationService;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/internal/users")
public class AuthorizationController {

    private final AuthorizationService authorizationService;

    public AuthorizationController(
            AuthorizationService authorizationService
    ) {
        this.authorizationService = authorizationService;
    }

    @GetMapping("/{userId}/authorization")
    public AuthorizationResponse getUserAuthorization(
            @PathVariable UUID userId
    ) {
        return authorizationService.getUserAuthorization(userId);
    }
}