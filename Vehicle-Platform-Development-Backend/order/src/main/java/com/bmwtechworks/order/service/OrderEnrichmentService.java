package com.bmwtechworks.order.service;

import com.bmwtechworks.order.client.ReferenceDataClient;
import com.bmwtechworks.order.dto.CustomerSummary;
import com.bmwtechworks.order.dto.DealerSummary;
import com.bmwtechworks.order.dto.OrderResponse;
import com.bmwtechworks.order.dto.VehicleSummary;
import com.bmwtechworks.order.model.Orders;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

/**
 * Attaches the resolved customer, vehicle and dealer to orders.
 *
 * <p>Reference data is loaded once per call and indexed by id, so a list of N
 * orders costs three internal calls rather than three per row. A service that
 * cannot be reached contributes no entries: its summaries come back null and the
 * orders still return with their identifiers intact.
 */
@Service
public class OrderEnrichmentService {

    private static final Logger log =
            LoggerFactory.getLogger(OrderEnrichmentService.class);

    private final ReferenceDataClient referenceDataClient;

    public OrderEnrichmentService(ReferenceDataClient referenceDataClient) {
        this.referenceDataClient = referenceDataClient;
    }

    public OrderResponse enrich(Orders order) {
        return enrichAll(List.of(order)).get(0);
    }

    public List<OrderResponse> enrichAll(List<Orders> orders) {

        Map<UUID, CustomerSummary> customers = index(
                load(referenceDataClient::customers, "customer"),
                ReferenceDataClient.CustomerPayload::id,
                p -> new CustomerSummary(
                        p.id(), p.name(), p.email(), p.phone(), p.address())
        );

        Map<UUID, VehicleSummary> vehicles = index(
                load(referenceDataClient::vehicles, "vehicle"),
                ReferenceDataClient.VehiclePayload::vehicleId,
                p -> new VehicleSummary(
                        p.vehicleId(), p.model(), p.trim(), p.vin(),
                        p.status(), p.price(), p.image())
        );

        Map<UUID, DealerSummary> dealers = index(
                load(referenceDataClient::dealers, "dealer"),
                ReferenceDataClient.DealerPayload::dealerId,
                p -> new DealerSummary(p.dealerId(), p.name(), p.location())
        );

        return orders.stream()
                .map(o -> OrderResponse.of(
                        o,
                        customers.get(o.getCustomerId()),
                        vehicles.get(o.getVehicleId()),
                        dealers.get(o.getDealerId())))
                .toList();
    }

    private <P, S> Map<UUID, S> index(
            List<P> payloads,
            Function<P, UUID> key,
            Function<P, S> summary
    ) {
        Map<UUID, S> indexed = new HashMap<>();
        for (P payload : payloads) {
            UUID id = key.apply(payload);
            if (id != null) {
                indexed.put(id, summary.apply(payload));
            }
        }
        return indexed;
    }

    /**
     * Runs a reference lookup, returning nothing on failure. Enrichment is a
     * convenience for the reader, so it must never be the reason a request
     * fails.
     */
    private <P> List<P> load(
            java.util.function.Supplier<List<P>> lookup,
            String what
    ) {
        try {
            return lookup.get();
        } catch (Exception e) {
            log.warn("Could not load {} data while enriching orders: {}",
                    what, e.toString());
            return List.of();
        }
    }
}
