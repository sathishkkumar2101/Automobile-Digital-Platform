package com.bmwtechworks.serviceappointment.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Reads the reference data an appointment is displayed with: the customer who
 * booked it, the vehicle it is for and the dealer handling it.
 *
 * <p>These live in other services, so the values are fetched over the internal
 * network and are never persisted locally. A copy of them in the appointment database
 * would drift, and the appointment is not the system of record for any of the three.
 *
 * <p>Every lookup is best effort. A reference service being down degrades an
 * appointment row to its identifiers instead of failing the entire list, because a
 * partial outage in one service should not take the appointments screen with it.
 */
@Component
public class ReferenceDataClient {

    private static final String VEHICLE_SERVICE = "vehicle-service";
    private static final String CUSTOMER_SERVICE = "customer";
    private static final String DEALER_SERVICE = "dealer-service";

    private final LoadBalancerClient loadBalancerClient;
    private final RestClient restClient;
    private final String internalSecret;

    public ReferenceDataClient(
            LoadBalancerClient loadBalancerClient,
            @Value("${INTERNAL_SERVICE_SECRET:}") String internalSecret
    ) {
        this.loadBalancerClient = loadBalancerClient;
        this.internalSecret = internalSecret;
        this.restClient = RestClient.builder().build();
    }

    public List<CustomerPayload> customers() {
        return getList(CUSTOMER_SERVICE, "/api/v1/customers", CustomerPayload[].class);
    }

    public List<VehiclePayload> vehicles() {
        return getList(VEHICLE_SERVICE, "/api/vehicles", VehiclePayload[].class);
    }

    public List<DealerPayload> dealers() {
        return getList(DEALER_SERVICE, "/dealers", DealerPayload[].class);
    }

    /**
     * Resolves the customer profile id that belongs to an authenticated user id.
     *
     * <p>An appointment stores {@code customerId}, which references
     * {@code customers.id} in the customer service. That identifier is minted
     * when the profile is created and is NOT the same value as the account's
     * {@code users.id} — the profile is a separate record from the login it
     * belongs to.
     *
     * <p>This distinction is the reason a customer could see none of their own
     * appointments. The booking form was storing the account id, the rows shipped
     * in the seed data hold the profile id, and the customer's own list was being
     * filtered by whichever id the gateway happens to carry. Whichever half was
     * used to write a row decided whether the customer could then see it, so the
     * same account saw some of its bookings and not others. The caller is
     * resolved instead of assumed, on both the write and the read.
     *
     * @return the customer profile id, or null when the account has no profile yet
     * @throws ReferenceServiceUnavailableException when the customer service cannot
     *         be reached, which is not the same as the account having no profile
     */
    public UUID customerIdForUser(String userId) {
        ServiceInstance instance = loadBalancerClient.choose(CUSTOMER_SERVICE);
        if (instance == null) {
            // An unresolvable service is not the same thing as a missing
            // profile. Reporting it as "no profile" would tell the caller their
            // account is incomplete when the truth is that the lookup could not
            // be attempted, so this is surfaced as an outage instead.
            throw new ReferenceServiceUnavailableException(
                    CUSTOMER_SERVICE + " could not be resolved", null);
        }

        CustomerPayload profile;
        try {
            profile = get(CUSTOMER_SERVICE, "/api/v1/customers/me", CustomerPayload.class,
                    "X-User-Id", userId);
        } catch (RestClientException e) {
            throw new ReferenceServiceUnavailableException(
                    CUSTOMER_SERVICE + " did not answer the customer lookup", e);
        }

        return profile == null ? null : profile.id();
    }

    /**
     * Signals that a reference service could not be consulted, as opposed to
     * answering that it holds no such record.
     */
    public static class ReferenceServiceUnavailableException extends RuntimeException {
        public ReferenceServiceUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    private <T> List<T> getList(String service, String path, Class<T[]> element) {
        T[] body = get(service, path, element);
        return body == null ? List.of() : List.of(body);
    }

    private <T> T get(String service, String path, Class<T> type) {
        return get(service, path, type, null, null);
    }

    private <T> T get(String service, String path, Class<T> type,
                      String headerName, String headerValue) {
        ServiceInstance instance = loadBalancerClient.choose(service);
        if (instance == null) {
            return null;
        }

        RestClient.RequestHeadersSpec<?> request =
                restClient.get().uri(instance.getUri() + path);

        if (!internalSecret.isBlank()) {
            request = request.header("X-Internal-Secret", internalSecret);
        }

        if (headerName != null && headerValue != null) {
            request = request.header(headerName, headerValue);
        }

        return request.retrieve().body(type);
    }

    /** The subset of the customer record an appointment displays. */
    public record CustomerPayload(
            UUID id,
            String name,
            String email,
            String phone,
            List<String> address
    ) {
    }

    /** The subset of the vehicle record an appointment displays. */
    public record VehiclePayload(
            UUID vehicleId,
            String model,
            String trim,
            String vin,
            String status,
            BigDecimal price,
            String image
    ) {
    }

    /** The subset of the dealer record an appointment displays. */
    public record DealerPayload(
            UUID dealerId,
            String name,
            String location
    ) {
    }
}
