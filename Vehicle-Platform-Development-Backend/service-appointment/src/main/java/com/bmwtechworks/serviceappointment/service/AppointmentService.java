package com.bmwtechworks.serviceappointment.service;

import com.bmwtechworks.serviceappointment.dto.AppointmentResponse;
import com.bmwtechworks.serviceappointment.dto.ServiceTypeResponse;
import com.bmwtechworks.serviceappointment.model.Appointment;
import com.bmwtechworks.serviceappointment.model.AppointmentStatus;

import java.util.List;
import java.util.UUID;

public interface AppointmentService {

    Appointment createAppointment(Appointment appointment);

    Appointment getAppointmentById(UUID id);

    AppointmentResponse getAppointmentByIdEnriched(UUID id);

    List<AppointmentResponse> getAllAppointments();
    
    List<AppointmentResponse> getAppointmentsByCustomerId(UUID customerId);

    List<AppointmentResponse> getAppointmentsByDealerId(UUID dealerId);

    AppointmentResponse updateAppointment(UUID id, Appointment appointment);

    AppointmentResponse updateServiceType(UUID id, String serviceType);

    /**
     * The services that can currently be booked.
     *
     * <p>The single source of truth behind both the booking form's options and
     * the validation in {@link #updateServiceType}, so the two cannot disagree.
     */
    List<ServiceTypeResponse> listServiceTypes();

    AppointmentResponse updateStatus(UUID id, AppointmentStatus status);

    void deleteAppointment(UUID id);
}