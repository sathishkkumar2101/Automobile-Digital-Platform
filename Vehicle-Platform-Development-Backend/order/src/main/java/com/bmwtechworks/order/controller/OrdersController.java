package com.bmwtechworks.order.controller;

import com.bmwtechworks.order.client.ReferenceDataClient;
import com.bmwtechworks.order.dto.OrderResponse;
import com.bmwtechworks.order.model.Orders;
import com.bmwtechworks.order.service.OrdersService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrdersController {
    @Autowired
    private OrdersService ordersService;

    @Autowired
    private ReferenceDataClient referenceDataClient;

    /**
     * Resolves the customer profile id for the calling account.
     *
     * <p>{@code orders.customer_id} references {@code customers.id}, not
     * {@code users.id}. The two are minted independently, so the id has to be
     * resolved through the customer service rather than reused from the auth
     * header. Without this, every customer filter silently matches zero rows.
     */
    private UUID requireCustomerId(String userId) {
        UUID customerId;
        try {
            customerId = referenceDataClient.customerIdForUser(userId);
        } catch (ReferenceDataClient.ReferenceServiceUnavailableException e) {
            // The lookup never happened. Reporting "no profile" here would be a
            // lie that sends the caller off to fix an account that is fine.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Customer lookup is temporarily unavailable", e);
        }

        if (customerId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "No customer profile exists for this account");
        }
        return customerId;
    }

    /**
     * GET /api/v1/orders
     *
     * CUSTOMER → returns only their own orders, matched on the resolved
     *            customer profile id rather than the account id
     * ADMIN    → returns all orders
     * DEALER   → NOT served here; dealers use /dealers/orders/{dealerId} via dealer-service
     *            which performs proper userId→dealerId resolution + ownership check.
     *            Returning all orders for an unverified dealerId would be an IDOR.
     */
    @GetMapping
    public List<OrderResponse> findAllOrders(
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if ("CUSTOMER".equals(userRole) && userId != null) {
            return ordersService.findByCustomerId(requireCustomerId(userId));
        }
        if ("ADMIN".equals(userRole)) {
            return ordersService.findAllOrders();
        }
        // DEALER role should NOT receive all orders via this endpoint.
        // Dealer order fetching is handled via dealer-service → /dealers/orders/{dealerId}
        // which performs proper userId→dealerId ownership resolution.
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }

    /**
     * GET /api/v1/orders/{id}
     *
     * ADMIN    → always allowed
     * CUSTOMER → only if the order belongs to the caller's customer profile
     * DEALER   → requires X-Dealer-Id header (set by dealer-service after ownership check)
     *            Compares order.dealerId with the verified dealerId, NOT userId.
     */
    @GetMapping("/{id}")
    public OrderResponse findById(
            @PathVariable UUID id,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-Dealer-Id", required = false) String dealerId
    ) {
        OrderResponse order = ordersService.findByIdEnriched(id);

        if ("ADMIN".equals(userRole)) {
            return order;
        }

        if ("CUSTOMER".equals(userRole) && userId != null) {
            UUID customerId = requireCustomerId(userId);
            if (order.customerId() != null && order.customerId().equals(customerId)) {
                return order;
            }
        }

        if ("DEALER".equals(userRole) && dealerId != null) {
            // X-Dealer-Id is set by dealer-service after resolving userId → dealerId
            // Compare against actual dealerId stored on the order
            if (order.dealerId() != null && order.dealerId().toString().equals(dealerId)) {
                return order;
            }
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
    }

    /**
     * GET /api/v1/orders/dealers/{dealerId}
     *
     * This endpoint is called by dealer-service (internal Feign) after it has already
     * verified that the authenticated dealer owns this dealerId.
     * The gateway-level route for /dealers/orders/{dealerId} performs userId→dealerId
     * ownership verification in DealerService.getAllOrders() before calling this.
     *
     * NOTE: This endpoint is intentionally NOT protected by an ownership check here
     * because dealer-service performs that check before calling us.
     * Direct access to this port is a network-level concern (internal Docker network).
     */
    @GetMapping("/dealers/{dealerId}")
    public List<OrderResponse> findByDealerId(@PathVariable UUID dealerId) {
        return ordersService.findByDealerId(dealerId);
    }

    @GetMapping("/customers/{customerId}")
    public List<OrderResponse> findByCustomerId(@PathVariable UUID customerId) {
        return ordersService.findByCustomerId(customerId);
    }

    /**
     * POST /api/v1/orders
     *
     * The gateway has already confirmed the caller holds the CUSTOMER role, but
     * the body's customerId is caller-supplied and cannot be trusted: accepting
     * it would let one customer file an order against another customer's
     * profile. The id is therefore always taken from the authenticated account
     * and any value in the body is ignored.
     */
    @PostMapping
    public OrderResponse createOrder(
            @RequestBody Orders order,
            @RequestHeader(value = "X-User-Id", required = false) String userId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole
    ) {
        if ("CUSTOMER".equals(userRole) && userId != null) {
            order.setCustomerId(requireCustomerId(userId));
        }

        return ordersService.findByIdEnriched(
                ordersService.createOrder(order).getId()
        );
    }

    /**
     * PUT /api/v1/orders/{id}
     *
     * ADMIN → full update allowed
     * DEALER → only allowed to update status field; ownership verified upstream by dealer-service
     *          dealerId, customerId, vehicleId are NOT modifiable by dealer
     *
     * The gateway blocks DEALER role from calling this endpoint directly.
     * Dealers update orders via PUT /dealers/orders/{orderId} which goes through dealer-service.
     */
    @PutMapping("/{id}")
    public OrderResponse updateOrder(
            @PathVariable UUID id,
            @RequestBody Orders order,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-Dealer-Id", required = false) String dealerId
    ) {
        Orders existing = ordersService.findById(id);

        if ("DEALER".equals(userRole) && dealerId != null) {
            // Dealer can only update status — verify ownership first
            if (existing.getDealerId() == null || !existing.getDealerId().toString().equals(dealerId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied: order does not belong to your dealership");
            }
            ordersService.updateOrderStatus(id, order.getStatus());
            return ordersService.findByIdEnriched(id);
        }

        // ADMIN full update
        ordersService.updateOrder(id, order);
        return ordersService.findByIdEnriched(id);
    }

    @DeleteMapping("/{id}")
    public String deleteOrder(@PathVariable UUID id) {
        return ordersService.deleteOrder(id);
    }
}
