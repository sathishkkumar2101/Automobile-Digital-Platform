package com.bmwtechworks.apigateway.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class UserAuthorizationClient {

    private final LoadBalancerClient loadBalancerClient;
    private final RestClient restClient;
    private final String internalSecret;

    public UserAuthorizationClient(
            LoadBalancerClient loadBalancerClient,
            @Value("${internal.service.secret}") String internalSecret
    ) {
        this.loadBalancerClient = loadBalancerClient;
        this.internalSecret = internalSecret;
        this.restClient = RestClient.builder().build();
    }

    public AuthorizationResponse getUserAuthorization(UUID userId) {

        ServiceInstance instance =
                loadBalancerClient.choose("user-role-service");

        if (instance == null) {
            throw new RuntimeException(
                    "User Role Service is not available"
            );
        }

        String url = instance.getUri()
                + "/api/internal/users/"
                + userId
                + "/authorization";

        /*
         * The internal endpoint is not exposed to browsers, but the service
         * still authenticates this call so that reaching the container by any
         * other route does not grant authorization lookups.
         */
        return restClient
                .get()
                .uri(url)
                .header("X-Internal-Secret", internalSecret)
                .retrieve()
                .body(AuthorizationResponse.class);
    }

    public record AuthorizationResponse(
            UUID userId,
            String role,
            java.util.List<String> permissions
    ) {
    }
}