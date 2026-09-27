package com.bmwtechworks.messaging.client;

import com.bmwtechworks.messaging.dto.UserProfile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

/**
 * Internal client to user-role-service. These endpoints are NOT routed through
 * the API Gateway, so the shared internal secret is presented on every call
 * instead of a user token. Being inside the Docker network is not treated as
 * sufficient authorisation: any process that can reach the container can reach
 * these routes, and user profiles are not public.
 */
@Component
public class UserRoleServiceClient {

    private static final String HEADER = "X-Internal-Secret";

    private final LoadBalancerClient loadBalancerClient;
    private final RestClient restClient;
    private final String internalSecret;

    public UserRoleServiceClient(
            LoadBalancerClient loadBalancerClient,
            @Value("${internal.service.secret}") String internalSecret
    ) {
        this.loadBalancerClient = loadBalancerClient;
        this.internalSecret = internalSecret;
        this.restClient = RestClient.builder().build();
    }

    public UserProfile getUserProfile(UUID userId) {
        return get(instance().getUri() + "/api/internal/users/" + userId);
    }

    public UserProfile getAdministratorUser() {
        return get(instance().getUri() + "/api/internal/users/administrator");
    }

    private UserProfile get(String url) {
        return restClient.get()
                .uri(url)
                .header(HEADER, internalSecret)
                .retrieve()
                .body(UserProfile.class);
    }

    private ServiceInstance instance() {
        ServiceInstance instance = loadBalancerClient.choose("user-role-service");

        if (instance == null) {
            throw new IllegalStateException("user-role-service is not available");
        }

        return instance;
    }
}
