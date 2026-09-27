package com.bmw.dealer.client;

import com.bmw.dealer.dto.OrderDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;
import java.util.UUID;

@FeignClient(name = "order-service")
public interface OrderClient {

    @GetMapping("/api/v1/orders/dealers/{dealerId}")
    List<OrderDTO> getAllOrders(
            @PathVariable("dealerId") UUID dealerId
    );

    @GetMapping("/api/v1/orders/{orderId}")
    OrderDTO getOrderById(
            @PathVariable("orderId") UUID orderId,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-Dealer-Id", required = false) String dealerId
    );

    @PutMapping("/api/v1/orders/{orderId}")
    OrderDTO updateOrder(
            @PathVariable("orderId") UUID orderId,
            @RequestBody OrderDTO orderDTO,
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader(value = "X-Dealer-Id", required = false) String dealerId
    );
}
