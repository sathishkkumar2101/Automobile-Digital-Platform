package com.bmwtechworks.userroleservice.client;

import com.bmwtechworks.userroleservice.dto.PermissionResponse;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class PermissionClient {

    private final LoadBalancerClient loadBalancerClient;
    private final RestClient restClient;

    public PermissionClient(LoadBalancerClient loadBalancerClient) {
        this.loadBalancerClient = loadBalancerClient;
        this.restClient = RestClient.builder().build();
    }

    public PermissionResponse getPermissionById(UUID permissionId) {

        ServiceInstance instance =
                loadBalancerClient.choose("permission-service");

        if (instance == null) {
            throw new RuntimeException(
                    "Permission Service is not available"
            );
        }

        String url = instance.getUri()
                + "/api/permissions/"
                + permissionId;

        return restClient.get()
                .uri(url)
                .retrieve()
                .body(PermissionResponse.class);
    }
}