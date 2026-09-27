package com.bmwtechworks.serviceappointment.dto;

import com.bmwtechworks.serviceappointment.model.Appointment;
import com.bmwtechworks.serviceappointment.model.AppointmentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An appointment as the API returns it: the stored columns plus the resolved
 * customer, vehicle and dealer.
 *
 * <p>The identifiers are always present even when a summary is not, so a client
 * can still identify the row and show the raw reference. The summaries come
 * from the owning services and are null when those services are unavailable or
 * the reference is dangling, which keeps the list readable during a partial
 * outage instead of failing the whole request.
 */
public record AppointmentResponse(
        UUID id,
        UUID customerId,
        UUID vehicleId,
        UUID dealerId,
        LocalDateTime appointmentDate,
        String serviceType,
        AppointmentStatus status,
        BigDecimal estimatedCost,
        CustomerSummary customer,
        VehicleSummary vehicle,
        DealerSummary dealer
) {

    public static AppointmentResponse of(
            Appointment appointment,
            CustomerSummary customer,
            VehicleSummary vehicle,
            DealerSummary dealer
    ) {
        return new AppointmentResponse(
                appointment.getId(),
                appointment.getCustomerId(),
                appointment.getVehicleId(),
                appointment.getDealerId(),
                appointment.getAppointmentDate(),
                appointment.getServiceType(),
                appointment.getStatus(),
                appointment.getEstimatedCost(),
                customer,
                vehicle,
                dealer
        );
    }
}
