package com.bmw.dealer.dto;

import com.bmw.dealer.model.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An order as the order service returns it: the stored columns plus the
 * resolved customer, vehicle and dealer.
 *
 * <p>This type used to hold the identifiers only, which silently discarded the
 * enrichment the order service had already performed. The order service resolves
 * the customer and vehicle before responding, but the dealer module was
 * deserialising the response into this narrower shape, so the summary objects
 * were dropped on the floor and every dealer order reached the UI as bare ids.
 * The result was a dealer list reading {@code Customer #8f2a…} with no model
 * name to search on, while the same order showed a full customer and vehicle to
 * an admin reading the identical data.
 *
 * <p>Declaring the summaries here is what keeps them intact across the hop: the
 * shape on this side of the call now matches the shape on the other.
 *
 * <p>The summaries are read-only projections. They are never read from a
 * request body, and {@code DealerService#updateOrder} sends them as null because
 * an update is a status change, not a re-declaration of who the order belongs to.
 */
public record OrderDTO(
        UUID id,
        UUID customerId,
        UUID vehicleId,
        UUID dealerId,
        OrderStatus status,
        LocalDateTime createdAt,
        BigDecimal totalAmount,
        OrderCustomerSummary customer,
        OrderVehicleSummary vehicle,
        OrderDealerSummary dealer
) {
}
