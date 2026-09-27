package com.bmwtechworks.userroleservice.client;

import com.bmwtechworks.userroleservice.exception.CustomerProfileCleanupException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.UUID;

/**
 * Removes the customer profile belonging to an account that is being deleted.
 *
 * <p>An account lives in the user database and its profile in a second, separate
 * Postgres instance, so there is no foreign key between them and no cascade for
 * the database to apply. Deleting the account on its own strands the profile, and
 * because the profile is addressed by user id it is still being served to
 * whoever next claims that identity. The two deletes therefore have to be
 * sequenced by whoever owns the account, which is this module.
 *
 * <p>Unconditional rather than gated on the account holding the CUSTOMER role:
 * the endpoint answers 204 without touching anything when there is no profile,
 * so a dealer or administrator costs one cheap call, and an account that was
 * re-roled after onboarding can never be left behind.
 *
 * <p>Failures are reported instead of being swallowed. The caller deletes the
 * profile before the account, so a customer service that cannot be reached leaves
 * the account intact and the administrator free to retry, rather than producing
 * the orphan this exists to prevent.
 */
@Component
public class CustomerProfileClient {

    private static final String CUSTOMER_SERVICE = "customer";

    private final LoadBalancerClient loadBalancerClient;
    private final RestClient restClient;
    private final String internalSecret;

    public CustomerProfileClient(
            LoadBalancerClient loadBalancerClient,
            @Value("${internal.service.secret:}") String internalSecret
    ) {
        this.loadBalancerClient = loadBalancerClient;
        this.restClient = RestClient.builder().build();
        this.internalSecret = internalSecret;
    }

    /**
     * Deletes every profile attached to an account, addressed by user id.
     *
     * <p>Resolving 204 covers both a profile that was removed and an account that
     * never had one, so callers do not need to distinguish the two.
     *
     * @throws CustomerProfileCleanupException when the customer service cannot be
     *         resolved or does not answer successfully
     */
    public void deleteProfileForUser(UUID userId) {

        ServiceInstance instance =
                loadBalancerClient.choose(CUSTOMER_SERVICE);

        if (instance == null) {
            // An unresolvable service is not the same thing as an absent
            // profile. Reporting it as "no profile to delete" would let the
            // account be removed and strand the row, which is the one outcome
            // this call exists to rule out.
            throw new CustomerProfileCleanupException(
                    CUSTOMER_SERVICE + " could not be resolved", null
            );
        }

        RestClient.RequestHeadersSpec<?> request =
                restClient.delete()
                        .uri(instance.getUri()
                                + "/api/v1/customers/by-user/"
                                + userId);

        /*
         * The customer service does not authenticate its own endpoints — the
         * gateway is the only boundary — so this is sent for consistency with the
         * other service-to-service calls rather than because it is checked today.
         */
        if (internalSecret != null && !internalSecret.isBlank()) {
            request = request.header("X-Internal-Secret", internalSecret);
        }

        try {
            request.retrieve().toBodilessEntity();
        } catch (RestClientException e) {
            throw new CustomerProfileCleanupException(
                    CUSTOMER_SERVICE + " did not remove the profile for user "
                            + userId,
                    e
            );
        }
    }
}
