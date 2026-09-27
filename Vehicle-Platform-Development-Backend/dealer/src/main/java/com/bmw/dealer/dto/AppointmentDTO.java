package com.bmw.dealer.dto;

import com.bmw.dealer.model.AppointmentStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AppointmentDTO {
    private UUID id;
    private UUID customerId;
    private UUID vehicleId;
    private UUID dealerId;
    private LocalDateTime appointmentDate;
    private String serviceType;
    private AppointmentStatus status;
}
