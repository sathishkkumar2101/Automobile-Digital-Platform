package com.bmwtechworks.serviceappointment.dto;

import java.util.List;
import java.util.UUID;

/**
 * The customer fields an appointment needs in order to be readable without a second
 * round trip. Deliberately a projection: the authoritative customer record
 * stays in the customer service and is not duplicated here.
 *
 * <p>Optional on purpose. An appointment whose customer cannot be resolved still has
 * to be listed, so callers must treat a null summary as "not resolved" rather
 * than as an error.
 */
public record CustomerSummary(
        UUID id,
        String name,
        String email,
        String phone,
        List<String> address
) {
}
