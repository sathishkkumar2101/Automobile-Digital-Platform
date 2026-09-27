package com.bmwtechworks.apigateway.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(name = "service-appointment")
public interface AppointmentClient {

    @GetMapping("/api/appointments/{id}")
    AppointmentResponse getAppointmentById(
            @PathVariable("id") UUID id
    );

    record AppointmentResponse(
            UUID id,
            UUID customerId,
            UUID vehicleId,
            UUID dealerId
    ) {
    }
}