package com.bmw.dealer.dto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * The vehicle fields an order carries so a dealer can read it without a second
 * round trip.
 *
 * <p>Mirrors {@code com.bmwtechworks.order.dto.VehicleSummary}. Nullable for the
 * same reason as {@link OrderCustomerSummary}: a missing vehicle must not hide
 * the order that references it.
 */
public record OrderVehicleSummary(
        UUID vehicleId,
        String model,
        String trim,
        String vin,
        String status,
        BigDecimal price,
        String image
) {
}
