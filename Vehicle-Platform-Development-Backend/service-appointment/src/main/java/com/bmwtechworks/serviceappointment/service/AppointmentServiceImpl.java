package com.bmwtechworks.serviceappointment.service;

import com.bmwtechworks.serviceappointment.dto.AppointmentResponse;
import com.bmwtechworks.serviceappointment.dto.ServiceTypeResponse;
import com.bmwtechworks.serviceappointment.exception.AppointmentNotFoundException;
import com.bmwtechworks.serviceappointment.exception.InvalidServiceTypeException;
import com.bmwtechworks.serviceappointment.model.Appointment;
import com.bmwtechworks.serviceappointment.model.AppointmentStatus;
import com.bmwtechworks.serviceappointment.repository.AppointmentRepository;
import com.bmwtechworks.serviceappointment.repository.ServiceTypeRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final ServiceTypeRepository serviceTypeRepository;
    private final AppointmentEnrichmentService enrichmentService;

    public AppointmentServiceImpl(
            AppointmentRepository appointmentRepository,
            ServiceTypeRepository serviceTypeRepository,
            AppointmentEnrichmentService enrichmentService
    ) {
        this.appointmentRepository = appointmentRepository;
        this.serviceTypeRepository = serviceTypeRepository;
        this.enrichmentService = enrichmentService;
    }

    @Override
    public Appointment createAppointment(Appointment appointment) {

        return appointmentRepository.save(appointment);
    }

    @Override
    public Appointment getAppointmentById(UUID id) {

        return appointmentRepository.findById(id)
                .orElseThrow(() ->
                        new AppointmentNotFoundException(
                                "Appointment not found with id: " + id
                        ));
    }

    @Override
    public AppointmentResponse getAppointmentByIdEnriched(UUID id) {

        return enrichmentService.enrich(getAppointmentById(id));
    }

    @Override
    public List<AppointmentResponse> getAllAppointments() {

        return enrichmentService.enrichAll(appointmentRepository.findAll());
    }

    @Override
    public List<AppointmentResponse> getAppointmentsByCustomerId(UUID customerId) {
        return enrichmentService.enrichAll(
                appointmentRepository.findByCustomerId(customerId));
    }

    @Override
    public List<AppointmentResponse> getAppointmentsByDealerId(UUID dealerId) {
        return enrichmentService.enrichAll(
                appointmentRepository.findByDealerId(dealerId));
    }

    @Override
    public AppointmentResponse updateAppointment(
            UUID id,
            Appointment updatedAppointment) {

        Appointment existingAppointment =
                appointmentRepository.findById(id)
                        .orElseThrow(() ->
                                new AppointmentNotFoundException(
                                        "Appointment not found with id: " + id
                                ));

        existingAppointment.setCustomerId(
                updatedAppointment.getCustomerId()
        );

        existingAppointment.setVehicleId(
                updatedAppointment.getVehicleId()
        );

        existingAppointment.setDealerId(
                updatedAppointment.getDealerId()
        );

        existingAppointment.setAppointmentDate(
                updatedAppointment.getAppointmentDate()
        );

        existingAppointment.setServiceType(
                updatedAppointment.getServiceType()
        );

        existingAppointment.setStatus(
                updatedAppointment.getStatus()
        );

        existingAppointment.setEstimatedCost(
                updatedAppointment.getEstimatedCost()
        );

        return enrichmentService.enrich(
                appointmentRepository.save(existingAppointment)
        );
    }

    @Override
    public AppointmentResponse updateServiceType(
            UUID id,
            String serviceType) {

        Appointment appointment =
                appointmentRepository.findById(id)
                        .orElseThrow(() ->
                                new AppointmentNotFoundException(
                                        "Appointment not found with id: " + id
                                ));

        // Rejecting an unknown code here is the point of the service_types
        // table. Without this the column accepted any string, so a client that
        // sent a value from a stale or invented list got a 200 and a row that
        // nothing downstream could interpret.
        String normalised = normaliseServiceType(serviceType);
        if (serviceTypeRepository.findByCodeAndActiveTrue(normalised).isEmpty()) {
            throw new InvalidServiceTypeException(
                    "Unknown service type '" + serviceType + "'. Call "
                            + "GET /api/appointments/service-types for the accepted values."
            );
        }

        appointment.setServiceType(normalised);

        return enrichmentService.enrich(appointmentRepository.save(appointment));
    }

    /**
     * Trims and upper-cases a submitted service type.
     *
     * <p>Without this, {@code "oil change"} and {@code "OIL_CHANGE"} would be two
     * different values in the column and only one of them would match a row,
     * even though the customer selected the same service.
     */
    private String normaliseServiceType(String serviceType) {
        return serviceType == null ? "" : serviceType.trim().toUpperCase();
    }

    @Override
    public List<ServiceTypeResponse> listServiceTypes() {
        return serviceTypeRepository.findByActiveTrueOrderByLabelAsc().stream()
                .map(ServiceTypeResponse::from)
                .toList();
    }

    @Override
    public AppointmentResponse updateStatus(
            UUID id,
            AppointmentStatus status) {

        Appointment appointment =
                appointmentRepository.findById(id)
                        .orElseThrow(() ->
                                new AppointmentNotFoundException(
                                        "Appointment not found with id: " + id
                                ));

        appointment.setStatus(status);

        return enrichmentService.enrich(appointmentRepository.save(appointment));
    }

    @Override
    public void deleteAppointment(UUID id) {

        if (!appointmentRepository.existsById(id)) {

            throw new AppointmentNotFoundException(
                    "Appointment not found with id: " + id
            );
        }

        appointmentRepository.deleteById(id);
    }
}