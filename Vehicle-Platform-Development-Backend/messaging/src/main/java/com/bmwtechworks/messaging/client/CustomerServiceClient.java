package com.bmwtechworks.messaging.client;

import com.bmwtechworks.messaging.dto.CustomerProfile;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

/**
 * Internal client to customer-service for resolving customerId -> user id.
 * The customer entity links the customer domain id to the auth user id.
 */
@Component
public class CustomerServiceClient {

    private final LoadBalancerClient loadBalancerClient;
    private final RestClient restClient;

    public CustomerServiceClient(LoadBalancerClient loadBalancerClient) {
        this.loadBalancerClient = loadBalancerClient;
        this.restClient = RestClient.builder().build();
    }

    public CustomerProfile getCustomer(UUID customerId) {
        ServiceInstance instance = loadBalancerClient.choose("customer");
        if (instance == null) {
            throw new IllegalStateException("customer service is not available");
        }
        String url = instance.getUri() + "/api/v1/customers/" + customerId;
        return restClient.get().uri(url).retrieve().body(CustomerProfile.class);
    }
}