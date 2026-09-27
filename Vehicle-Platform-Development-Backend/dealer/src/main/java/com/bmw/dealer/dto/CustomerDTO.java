package com.bmw.dealer.dto;

import java.util.List;
import java.util.UUID;

public record CustomerDTO(
        UUID id,
        String name,
        String email,
        String phone,
        List<String> address
) {
}
