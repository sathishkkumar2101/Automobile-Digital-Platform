package com.bmwtechworks.apigateway.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.UUID;

@FeignClient(name = "customer")
public interface CustomerClient {

    @GetMapping("/api/v1/customers/me")
    CustomerResponse getMyCustomer(
            @RequestHeader("X-User-Id") UUID userId
    );

    record CustomerResponse(
            UUID id,
            UUID userId,
            String name,
            String email,
            String phone
    ) {
    }
}
