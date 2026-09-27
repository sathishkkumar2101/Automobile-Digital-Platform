package com.bmwtechworks.serviceappointment.service;

import com.bmwtechworks.serviceappointment.client.ReferenceDataClient;
import com.bmwtechworks.serviceappointment.dto.AppointmentResponse;
import com.bmwtechworks.serviceappointment.dto.CustomerSummary;
import com.bmwtechworks.serviceappointment.dto.DealerSummary;
import com.bmwtechworks.serviceappointment.dto.VehicleSummary;
import com.bmwtechworks.serviceappointment.model.Appointment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Attaches the resolved customer, vehicle and dealer to appointments.
 *
 * <p>Reference data is loaded once per call and indexed by id, so a list of N
 * appointments costs three internal calls rather than three per row. A service
 * that cannot be reached contributes no entries: its summaries come back null
 * and the appointments still return with their identifiers intact.
 */
@Service
public class AppointmentEnrichmentService {

    private static final Logger log =
            LoggerFactory.getLogger(AppointmentEnrichmentService.class);

    private final ReferenceDataClient referenceDataClient;

    public AppointmentEnrichmentService(ReferenceDataClient referenceDataClient) {
        this.referenceDataClient = referenceDataClient;
    }

    public AppointmentResponse enrich(Appointment appointment) {
        return enrichAll(List.of(appointment)).get(0);
    }

    public List<AppointmentResponse> enrichAll(List<Appointment> appointments) {

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

        return appointments.stream()
                .map(a -> AppointmentResponse.of(
                        a,
                        customers.get(a.getCustomerId()),
                        vehicles.get(a.getVehicleId()),
                        dealers.get(a.getDealerId())))
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
    private <P> List<P> load(Supplier<List<P>> lookup, String what) {
        try {
            return lookup.get();
        } catch (Exception e) {
            log.warn("Could not load {} data while enriching appointments: {}",
                    what, e.toString());
            return List.of();
        }
    }
}
