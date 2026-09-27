package com.bmw.dealer.dto;

import java.util.List;
import java.util.UUID;

public record DealerResponseDTO(
        UUID dealerId,
        String name,
        String location,
        List<VehicleDTO> inventory
) {
}