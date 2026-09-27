package com.bmwtechworks.serviceappointment.dto;

import com.bmwtechworks.serviceappointment.model.ServiceType;

/**
 * A bookable service as offered to the client.
 *
 * <p>Deliberately flat and code-first: the booking form needs a stable value to
 * submit and a label to show, and nothing else. {@code description} is optional
 * so a service can be listed without copy written for it.
 */
public record ServiceTypeResponse(
        String code,
        String label,
        String description
) {
    public static ServiceTypeResponse from(ServiceType serviceType) {
        return new ServiceTypeResponse(
                serviceType.getCode(),
                serviceType.getLabel(),
                serviceType.getDescription()
        );
    }
}
