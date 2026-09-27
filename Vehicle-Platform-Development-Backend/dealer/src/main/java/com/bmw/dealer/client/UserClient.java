package com.bmw.dealer.client;

import com.bmw.dealer.dto.UserDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "user-role-service")
public interface UserClient {

    /**
     * Resolves a username to the user it belongs to.
     *
     * Calls the /api/internal route rather than /api/users/username/{username}:
     * the latter is guarded by hasRole('ADMIN') and expects a caller's JWT,
     * which a service-to-service Feign call has no way to present, so
     * registering a dealership failed with 401 for every username. The internal
     * route is authenticated by the shared X-Internal-Secret instead, which
     * FeignSecurityInterceptor adds to every outbound call.
     */
    @GetMapping("/api/internal/users/username/{username}")
    UserDTO getUserByUsername(
            @PathVariable("username") String username
    );
}
