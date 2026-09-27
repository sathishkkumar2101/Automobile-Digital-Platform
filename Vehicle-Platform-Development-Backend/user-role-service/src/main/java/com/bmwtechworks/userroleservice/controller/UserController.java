package com.bmwtechworks.userroleservice.controller;

import com.bmwtechworks.userroleservice.dto.MeResponse;
import com.bmwtechworks.userroleservice.dto.UserRequest;
import com.bmwtechworks.userroleservice.dto.UserResponse;
import com.bmwtechworks.userroleservice.dto.UserUpdateRequest;
import com.bmwtechworks.userroleservice.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * The user table holds every account on the platform, including the admin
     * roster, so listing it is an administrator action. The gateway applies the
     * same rule; it is repeated here so the service is not more permissive when
     * reached directly.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> getAllUsers() {
        return userService.getAllUsers();
    }

    /**
     * "Me" is resolved from the verified token rather than the X-User-Id
     * header. The header is set by the gateway, but a client calling the
     * service directly could put any user's id in it and read that account.
     */
    @GetMapping("/me")
    public MeResponse getCurrentUser(Authentication authentication) {
        return userService.getCurrentUser(callerId(authentication));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id.toString() == authentication.name")
    public UserResponse getUserById(
            @PathVariable UUID id
    ) {
        return userService.getUserById(id);
    }

    @GetMapping("/username/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse getUserByUsername(
            @PathVariable String username
    ) {
        return userService.getUserByUsername(username);
    }

    /**
     * Self-registration is public and always produces a CUSTOMER. An
     * administrator creating an account on the other hand gets the role they
     * asked for, which is what the admin Users screen needs.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(
            @Valid @RequestBody UserRequest request,
            Authentication authentication
    ) {
        return userService.createUser(
                request,
                callerIdOrNull(authentication)
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id.toString() == authentication.name")
    public UserResponse updateUser(
            @PathVariable UUID id,
            @Valid @RequestBody UserUpdateRequest request,
            Authentication authentication
    ) {
        /*
         * The caller is taken from the verified token, never from a header the
         * client controls. UserService uses it to decide whether this caller is
         * allowed to change a role, which is what stops an account from
         * promoting itself.
         */
        return userService.updateUser(
                id,
                callerId(authentication),
                request
        );
    }

    private UUID callerId(Authentication authentication) {

        UUID callerId = callerIdOrNull(authentication);

        if (callerId == null) {

            throw new AccessDeniedException(
                    "An authenticated caller is required"
            );
        }

        return callerId;
    }

    /**
     * Null for anonymous self-registration, the caller's id otherwise.
     */
    private UUID callerIdOrNull(Authentication authentication) {

        if (!(authentication instanceof
                JwtAuthenticationToken jwtAuthentication)) {

            return null;
        }

        String subject =
                jwtAuthentication.getToken().getSubject();

        if (subject == null) {
            return null;
        }

        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException malformed) {
            return null;
        }
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteUser(
            @PathVariable UUID id
    ) {
        userService.deleteUser(id);
    }
}