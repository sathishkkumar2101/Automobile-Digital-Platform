package com.bmw.dealer.dto;

import java.util.UUID;

/**
 * The dealer identity an order carries so it stays attributable even when read
 * through another service.
 *
 * <p>Mirrors {@code com.bmwtechworks.order.dto.DealerSummary}. Nullable for the
 * same reason as {@link OrderCustomerSummary}.
 */
public record OrderDealerSummary(
        UUID dealerId,
        String name,
        String location
) {
}
