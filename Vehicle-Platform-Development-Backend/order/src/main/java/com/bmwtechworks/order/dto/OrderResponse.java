package com.bmwtechworks.order.dto;

import com.bmwtechworks.order.model.OrderStatus;
import com.bmwtechworks.order.model.Orders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * An order as the API returns it: the stored columns plus the resolved customer,
 * vehicle and dealer.
 *
 * <p>The identifiers are always present even when a summary is not, so a client
 * can still identify the row and show the raw reference. The summaries are
 * resolved from the owning services and are null when those services are
 * unavailable or the reference is dangling, which keeps an order list readable
 * during a partial outage instead of failing the whole request.
 */
public record OrderResponse(
        UUID id,
        UUID customerId,
        UUID vehicleId,
        UUID dealerId,
        OrderStatus status,
        LocalDateTime createdAt,
        BigDecimal totalAmount,
        CustomerSummary customer,
        VehicleSummary vehicle,
        DealerSummary dealer
) {

    public static OrderResponse of(
            Orders order,
            CustomerSummary customer,
            VehicleSummary vehicle,
            DealerSummary dealer
    ) {
        return new OrderResponse(
                order.getId(),
                order.getCustomerId(),
                order.getVehicleId(),
                order.getDealerId(),
                order.getStatus(),
                order.getCreatedAt(),
                order.getTotalAmount(),
                customer,
                vehicle,
                dealer
        );
    }
}
