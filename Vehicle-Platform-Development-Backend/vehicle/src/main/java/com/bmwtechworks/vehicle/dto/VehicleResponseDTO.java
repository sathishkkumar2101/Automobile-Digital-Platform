package com.bmwtechworks.vehicle.dto;

import com.bmwtechworks.vehicle.model.VehicleStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record VehicleResponseDTO(
        UUID vehicleId,
        String vin,
        String model,
        String trim,
        String color,
        BigDecimal price,
        VehicleStatus status,
        UUID dealerId,
        Integer mileage,
        String image,
        List<String> images,
        String bodyType,
        String engine,
        String transmission,
        String fuelType,
        String description
) {
}
