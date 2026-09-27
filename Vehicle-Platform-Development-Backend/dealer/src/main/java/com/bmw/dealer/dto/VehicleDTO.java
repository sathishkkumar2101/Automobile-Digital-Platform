package com.bmw.dealer.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record VehicleDTO(
        UUID vehicleId,
        UUID dealerId,
        String vin,
        String model,
        String trim,
        String color,
        BigDecimal price,
        String status
) {
}