package com.bmwtechworks.messaging.client;

import com.bmwtechworks.messaging.dto.DealerProfile;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

/**
 * Internal client to dealer-service for resolving dealerId -> dealer user id.
 * The dealer entity carries the userId that links a dealer login to its
 * messaging identity.
 */
@Component
public class DealerServiceClient {

    private final LoadBalancerClient loadBalancerClient;
    private final RestClient restClient;

    public DealerServiceClient(LoadBalancerClient loadBalancerClient) {
        this.loadBalancerClient = loadBalancerClient;
        this.restClient = RestClient.builder().build();
    }

    public DealerProfile getDealer(UUID dealerId) {
        ServiceInstance instance = loadBalancerClient.choose("dealer-service");
        if (instance == null) {
            throw new IllegalStateException("dealer-service is not available");
        }
        String url = instance.getUri() + "/dealers/" + dealerId;
        return restClient.get().uri(url).retrieve().body(DealerProfile.class);
    }
}