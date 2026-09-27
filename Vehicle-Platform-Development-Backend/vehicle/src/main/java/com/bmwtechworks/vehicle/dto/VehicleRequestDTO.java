package com.bmwtechworks.vehicle.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record VehicleRequestDTO(

        @NotBlank(message = "VIN is required")
        String vin,

        @NotBlank(message = "Model is required")
        String model,

        @NotBlank(message = "Trim is required")
        String trim,

        @NotBlank(message = "Color is required")
        String color,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.0", inclusive = false, message = "Price must be greater than 0")
        BigDecimal price,

        @NotNull(message = "Dealer ID is required")
        UUID dealerId,

        Integer mileage,
        String image,
        String bodyType,
        String engine,
        String transmission,
        String fuelType,
        String description

) {
}