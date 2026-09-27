package com.bmwtechworks.serviceappointment.dto;

import java.util.UUID;

/** The dealer identity an appointment needs in order to be attributable. */
public record DealerSummary(
        UUID dealerId,
        String name,
        String location
) {
}
