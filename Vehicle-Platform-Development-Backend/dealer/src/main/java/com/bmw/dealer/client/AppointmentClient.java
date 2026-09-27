package com.bmw.dealer.client;

import com.bmw.dealer.dto.AppointmentDTO;
import com.bmw.dealer.model.AppointmentStatus;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "service-appointment")
public interface AppointmentClient {

    @GetMapping("/api/appointments/dealers/{dealerId}")
    List<AppointmentDTO> getAppointmentsByDealer(
            @PathVariable("dealerId") UUID dealerId
    );

    @PatchMapping("/api/appointments/{id}/status")
    AppointmentDTO updateStatus(
            @PathVariable("id") UUID id,
            @RequestParam("status") AppointmentStatus status
    );
}