package com.bmw.dealer.controller;

import com.bmw.dealer.dto.*;
import com.bmw.dealer.model.AppointmentStatus;
import com.bmw.dealer.model.Dealer;
import com.bmw.dealer.service.DealerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/dealers")
@RequiredArgsConstructor
public class DealerController {

    private final DealerService dealerService;

    /**
     * POST /dealers — Create dealer (ADMIN only — enforced by gateway)
     * Self-registration is DISABLED at the gateway level.
     */
    @PostMapping
    public ResponseEntity<Dealer> createDealer(@RequestBody DealerRequestDTO request) {
        Dealer savedDealer = dealerService.createDealer(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedDealer);
    }

    /** GET /dealers — All dealers (CUSTOMER + DEALER — enforced by gateway) */
    @GetMapping
    public ResponseEntity<List<Dealer>> getAllDealers() {
        return ResponseEntity.ok(dealerService.getAllDealers());
    }

    /**
     * GET /dealers/me — Logged-in dealer's own details.
     * Uses X-User-Id (from JWT sub) to resolve dealer record.
     * This is the correct pattern: userId → dealerRepository.findByUserId → dealer.
     */
    @GetMapping("/me")
    public ResponseEntity<Dealer> getMyDealer(
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(dealerService.getMyDealer(userId));
    }

    /** GET /dealers/{dealerId} — Get dealer by ID (CUSTOMER + DEALER — enforced by gateway) */
    @GetMapping("/{dealerId}")
    public ResponseEntity<Dealer> getDealerById(@PathVariable UUID dealerId) {
        return ResponseEntity.ok(dealerService.getDealerById(dealerId));
    }

    /** PUT /dealers/{dealerId} — Update dealer (ADMIN only — enforced by gateway) */
    @PutMapping("/{dealerId}")
    public ResponseEntity<Dealer> updateDealer(
            @PathVariable UUID dealerId,
            @RequestBody Dealer dealer) {
        return ResponseEntity.ok(dealerService.updateDealer(dealerId, dealer));
    }

    /** DELETE /dealers/{dealerId} — Delete dealer (ADMIN only — enforced by gateway) */
    @DeleteMapping("/{dealerId}")
    public ResponseEntity<Void> deleteDealer(@PathVariable UUID dealerId) {
        dealerService.deleteDealer(dealerId);
        return ResponseEntity.noContent().build();
    }

    /**
     * GET /dealers/{dealerId}/vehicles — Vehicles for a specific dealer.
     * Gateway allows CUSTOMER + DEALER.
     * For DEALER role: ownership is enforced by the gateway via userId→dealerId check.
     */
    @GetMapping("/{dealerId}/vehicles")
    public ResponseEntity<List<VehicleDTO>> getDealerVehicles(@PathVariable UUID dealerId) {
        return ResponseEntity.ok(dealerService.getVehiclesByDealer(dealerId));
    }

    /** GET /dealers/location/{location} — Dealers by location */
    @GetMapping("/location/{location}")
    public ResponseEntity<List<Dealer>> getDealersByLocation(@PathVariable String location) {
        return ResponseEntity.ok(dealerService.getDealersByLocation(location));
    }

    /**
     * GET /dealers/orders/{dealerId} — Get orders for a specific dealer.
     *
     * SECURITY: DealerService.getAllOrders() FIRST resolves userId→dealerId and
     * verifies the path dealerId matches the authenticated dealer.
     * If they don't match → 403. Only matching dealer can access.
     */
    @GetMapping("/orders/{dealerId}")
    public ResponseEntity<List<OrderDTO>> getAllOrder(
            @PathVariable UUID dealerId,
            @RequestHeader("X-User-Id") UUID userId) {

        return ResponseEntity.ok(dealerService.getAllOrders(dealerId, userId));
    }

    /**
     * GET /dealers/me/customers — Customers associated with the authenticated dealer.
     * Returns only customers who have an order or appointment with this dealer.
     * NEVER returns all customers.
     */
    @GetMapping("/me/customers")
    public ResponseEntity<List<CustomerDTO>> getMyCustomers(
            @RequestHeader("X-User-Id") UUID userId) {
        return ResponseEntity.ok(dealerService.getMyCustomers(userId));
    }

    /** GET /dealers/customer/{customerId} — Get a single customer (DEALER only — gateway enforced) */
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<CustomerDTO> getCustomerById(@PathVariable UUID customerId) {
        return ResponseEntity.ok(dealerService.getCustomerById(customerId));
    }

    /**
     * PUT /dealers/orders/{orderId} — Update order status (DEALER only — gateway enforced).
     *
     * SECURITY: DealerService.updateOrder() FIRST resolves userId→dealerId
     * and verifies order.dealerId == authenticated dealerId before updating.
     * Only the status field is modifiable by the dealer.
     * dealerId, customerId, vehicleId are NOT changeable.
     */
    @PutMapping("/orders/{orderId}")
    public ResponseEntity<OrderDTO> updateOrder(
            @PathVariable UUID orderId,
            @RequestBody OrderDTO orderDTO,
            @RequestHeader("X-User-Id") UUID userId) {

        OrderDTO updatedOrder = dealerService.updateOrder(orderId, orderDTO, userId);
        return ResponseEntity.ok(updatedOrder);
    }

    /**
     * PATCH /dealers/appointments/{id}/status — Update appointment status (DEALER only).
     *
     * SECURITY: DealerService.updateAppointmentStatus() verifies ownership
     * before delegating to appointment-service.
     */
    @PatchMapping("/appointments/{id}/status")
    public ResponseEntity<AppointmentDTO> updateAppointmentStatus(
            @PathVariable UUID id,
            @RequestParam AppointmentStatus status,
            @RequestHeader("X-User-Id") UUID userId) {

        return ResponseEntity.ok(
                dealerService.updateAppointmentStatus(id, status, userId)
        );
    }
}
