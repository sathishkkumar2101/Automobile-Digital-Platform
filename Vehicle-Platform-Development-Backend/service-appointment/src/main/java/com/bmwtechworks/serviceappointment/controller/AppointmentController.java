package com.bmwtechworks.serviceappointment.controller;

import com.bmwtechworks.serviceappointment.client.ReferenceDataClient;
import com.bmwtechworks.serviceappointment.dto.AppointmentResponse;
import com.bmwtechworks.serviceappointment.dto.ServiceTypeResponse;
import com.bmwtechworks.serviceappointment.model.Appointment;
import com.bmwtechworks.serviceappointment.model.AppointmentStatus;
import com.bmwtechworks.serviceappointment.service.AppointmentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final ReferenceDataClient referenceDataClient;

    public AppointmentController(
            AppointmentService appointmentService,
            ReferenceDataClient referenceDataClient
    ) {
        this.appointmentService = appointmentService;
        this.referenceDataClient = referenceDataClient;
    }

    /**
     * Resolves the customer profile id for the caller.
     *
     * <p>{@code customerId} on an appointment references {@code customers.id} in
     * the customer service, which is a different value from the account's
     * {@code users.id}. The two are minted independently and are never equal.
     *
     * <p>Both halves of this feature have to agree on which one they mean. When
     * the booking form stored the account id while the seeded rows held the
     * profile id, a customer's own list was filtered by the account id and
     * matched only the rows the browser had just written — so a customer with
     * real appointment history saw an empty page. Resolving on both the write
     * and the read makes the stored value the only one in play.
     */
    private UUID resolveCustomerId(String userId) {
        try {
            return referenceDataClient.customerIdForUser(userId);
        } catch (ReferenceDataClient.ReferenceServiceUnavailableException e) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Customer lookup is temporarily unavailable",
                    e
            );
        }
    }

    /**
     * CREATE APPOINTMENT — CUSTOMER only (gateway enforced)
     *
     * <p>The customer is taken from the authenticated caller, not the request
     * body, so a booking cannot be filed under somebody else's account. The
     * gateway supplies {@code X-User-Id} for every caller it lets through and
     * strips any client-supplied copy.
     */
    @PostMapping
    public ResponseEntity<AppointmentResponse> createAppointment(
            @RequestBody Appointment appointment,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {

        if ("CUSTOMER".equals(userRole) && userId != null) {
            UUID customerId = resolveCustomerId(userId);

            if (customerId == null) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No customer profile exists for this account"
                );
            }

            appointment.setCustomerId(customerId);
        }

        Appointment createdAppointment = appointmentService.createAppointment(appointment);
        return new ResponseEntity<>(
                appointmentService.getAppointmentByIdEnriched(
                        createdAppointment.getId()),
                HttpStatus.CREATED
        );
    }

    // GET APPOINTMENT BY ID — ownership enforced by gateway
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointmentById(@PathVariable UUID id) {
        return ResponseEntity.ok(
                appointmentService.getAppointmentByIdEnriched(id)
        );
    }

    /**
     * GET /api/appointments/service-types
     *
     * The bookable services, for the booking form to offer.
     *
     * <p>Declared above {@code @GetMapping("/{id}")} on purpose. {@code {id}} is
     * a {@link UUID} path variable, so a literal request to this path is matched
     * against it and fails to convert, producing a 400 "Invalid appointment ID"
     * rather than the list. A more specific literal segment has to be registered
     * first for it to be reachable at all. The gateway has the same hazard and
     * needs the same ordering.
     */
    @GetMapping("/service-types")
    public ResponseEntity<List<ServiceTypeResponse>> listServiceTypes() {
        return ResponseEntity.ok(appointmentService.listServiceTypes());
    }

    /**
     * GET /api/appointments
     *
     * CUSTOMER → own appointments, looked up by the customer profile id that
     *            {@link #resolveCustomerId} derives from the account id.
     *            These are NOT the same value, so the account id cannot be used
     *            here directly: doing so matched only rows the same browser had
     *            just written and hid every pre-existing booking.
     * DEALER   → dealer's appointments using X-Dealer-Id header
     *            X-Dealer-Id is the REAL dealerId (resolved from userId by the gateway
     *            or dealer-service). NOT the userId.
     * ADMIN    → returns all appointments
     *
     * CRITICAL FIX: Dealer appointments now use X-Dealer-Id (real dealerId),
     * NOT userId (which is different from dealerId and caused empty results).
     */
    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAllAppointments(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-Dealer-Id", required = false) String dealerId
    ) {
        if ("CUSTOMER".equals(userRole) && userId != null) {
            UUID customerId = resolveCustomerId(userId);

            // An account that has not completed onboarding owns no profile, and
            // so has never booked anything. Handing a null id to the repository
            // is an error rather than an empty result, and this account is
            // exactly the one the onboarding gate is waiting on.
            if (customerId == null) {
                return ResponseEntity.ok(List.of());
            }

            return ResponseEntity.ok(
                    appointmentService.getAppointmentsByCustomerId(customerId)
            );
        }
        if ("DEALER".equals(userRole) && dealerId != null) {
            // Use the real dealerId (not userId) to filter appointments
            return ResponseEntity.ok(
                    appointmentService.getAppointmentsByDealerId(UUID.fromString(dealerId))
            );
        }
        if ("ADMIN".equals(userRole)) {
            return ResponseEntity.ok(appointmentService.getAllAppointments());
        }
        // Deny all other requests (including headerless calls to internal port)
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }

    // GET BY CUSTOMER — used by gateway-verified CUSTOMER requests
    @GetMapping("/customers/{customerId}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByCustomer(
            @PathVariable UUID customerId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByCustomerId(customerId));
    }

    /**
     * GET /api/appointments/dealers/{dealerId}
     *
     * Called by gateway after verifying ownership via X-Dealer-Id check.
     * The {dealerId} path variable is the real dealerId.
     */
    @GetMapping("/dealers/{dealerId}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByDealer(
            @PathVariable UUID dealerId) {
        return ResponseEntity.ok(appointmentService.getAppointmentsByDealerId(dealerId));
    }

    // FULL UPDATE — ADMIN only (gateway enforced)
    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> updateAppointment(
            @PathVariable UUID id,
            @RequestBody Appointment appointment) {

        return ResponseEntity.ok(appointmentService.updateAppointment(id, appointment));
    }

    // UPDATE SERVICE TYPE — customer/dealer own appointment (gateway enforced)
    @PatchMapping("/{id}/service-type")
    public ResponseEntity<AppointmentResponse> updateServiceType(
            @PathVariable UUID id,
            @RequestParam String serviceType) {

        return ResponseEntity.ok(appointmentService.updateServiceType(id, serviceType));
    }

    /**
     * PATCH /api/appointments/{id}/status
     *
     * DEALER only (gateway enforced via isAppointmentDealer check).
     * The gateway checks appointment.dealerId against the authenticated dealer
     * using the authorizationService.isAppointmentDealer() which uses userId.
     *
     * NOTE: For this check to work correctly the authorizationService must also
     * resolve userId → dealerId. See gateway AuthorizationFilter lines 1142-1158.
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<AppointmentResponse> updateStatus(
            @PathVariable UUID id,
            @RequestParam AppointmentStatus status) {

        return ResponseEntity.ok(appointmentService.updateStatus(id, status));
    }

    // DELETE APPOINTMENT — ADMIN only (gateway enforced)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable UUID id) {
        appointmentService.deleteAppointment(id);
        return ResponseEntity.noContent().build();
    }
}