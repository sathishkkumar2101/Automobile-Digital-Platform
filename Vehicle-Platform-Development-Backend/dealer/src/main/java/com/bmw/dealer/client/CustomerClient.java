package com.bmw.dealer.client;

import com.bmw.dealer.dto.CustomerDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.UUID;

@FeignClient(
        name ="customer"
)
public interface CustomerClient {

    @GetMapping("/api/v1/customers/{id}")
    public CustomerDTO getCustomerById(@PathVariable("id") UUID id);
}
