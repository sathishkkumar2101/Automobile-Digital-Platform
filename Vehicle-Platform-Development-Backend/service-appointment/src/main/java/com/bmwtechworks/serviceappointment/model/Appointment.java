package com.bmwtechworks.serviceappointment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "appointments")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private UUID customerId;

    private UUID vehicleId;

    private UUID dealerId;

    @CreationTimestamp
    private LocalDateTime appointmentDate;

    private String serviceType;

    /**
     * What the workshop quoted for this work. Nullable: a booking can exist
     * before it has been costed, and an unknown quote must read as "not quoted"
     * rather than as zero.
     */
    private BigDecimal estimatedCost;

    @Enumerated(EnumType.STRING)
    private AppointmentStatus status = AppointmentStatus.REQUESTED;

}