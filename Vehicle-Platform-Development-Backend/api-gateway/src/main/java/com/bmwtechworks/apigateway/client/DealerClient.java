package com.bmwtechworks.apigateway.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.UUID;

@FeignClient(name = "dealer-service")
public interface DealerClient {

    @GetMapping("/dealers/me")
    DealerResponse getMyDealer(
            @RequestHeader("X-User-Id") UUID userId
    );

    record DealerResponse(
            UUID dealerId,
            UUID userId,
            String name,
            String location
    ) {
    }
}
