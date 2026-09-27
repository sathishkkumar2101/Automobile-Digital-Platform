package com.bmw.dealer.dto;

import java.util.List;
import java.util.UUID;

/**
 * The customer fields an order carries so a dealer can read it without a second
 * round trip.
 *
 * <p>Mirrors {@code com.bmwtechworks.order.dto.CustomerSummary}, which the order
 * service resolves and sends along. It is a projection of a record owned by the
 * customer service, not a copy of it, so it carries no authority of its own.
 *
 * <p>Nullable on purpose: an order whose customer cannot be resolved still has
 * to be listed, so a null summary means "not resolved" and never "no customer".
 */
public record OrderCustomerSummary(
        UUID id,
        String name,
        String email,
        String phone,
        List<String> address
) {
}
