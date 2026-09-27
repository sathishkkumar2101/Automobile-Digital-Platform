package com.bmwtechworks.order.dto;

import java.util.UUID;

/** The dealer identity an order needs in order to be attributable. */
public record DealerSummary(
        UUID dealerId,
        String name,
        String location
) {
}
