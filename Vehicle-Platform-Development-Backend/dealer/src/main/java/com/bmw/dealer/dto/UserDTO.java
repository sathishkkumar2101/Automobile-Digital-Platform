package com.bmw.dealer.dto;

import java.util.UUID;

public record UserDTO(
        UUID id,
        String username,
        String name,
        String email,
        UUID roleId
) {
}