package com.bmw.dealer.client;

import com.bmw.dealer.dto.VehicleDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;
import java.util.UUID;

@FeignClient(
        name = "vehicle-service"
)
public interface VehicleClient {

    @GetMapping("/api/vehicles/dealer/{dealerId}")
    List<VehicleDTO> getVehiclesByDealer(
            @PathVariable("dealerId") UUID dealerId
    );
}
