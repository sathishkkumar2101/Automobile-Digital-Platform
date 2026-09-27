package com.bmwtechworks.userroleservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Partial update payload for an existing user account.
 *
 * Unlike {@link UserRequest} this record does not demand a password: the
 * account keeps its current credentials when {@code password} is null or blank
 * and keeps its current role when {@code role} is null or blank. The username is
 * intentionally not editable.
 */
public record UserUpdateRequest(

        @NotBlank(message = "Name is required")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email")
        String email,

        String role,

        String password

) {
}
