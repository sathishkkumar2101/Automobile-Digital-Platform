package com.bmwtechworks.order.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * The vehicle fields an order needs to be readable. Optional for the same
 * reason as {@link CustomerSummary}: a missing vehicle must not hide the order.
 */
public record VehicleSummary(
        UUID vehicleId,
        String model,
        String trim,
        String vin,
        String status,
        BigDecimal price,
        String image
) {
}
