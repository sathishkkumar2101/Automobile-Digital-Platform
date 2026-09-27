package com.bmwtechworks.vehicle.controller;

import com.bmwtechworks.vehicle.dto.VehicleRequestDTO;
import com.bmwtechworks.vehicle.dto.VehicleResponseDTO;
import com.bmwtechworks.vehicle.model.VehicleStatus;
import com.bmwtechworks.vehicle.service.VehicleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    // CREATE VEHICLE
    @PostMapping
    public ResponseEntity<VehicleResponseDTO> createVehicle(
            @Valid @RequestBody VehicleRequestDTO requestDTO
    ) {

        VehicleResponseDTO response =
                vehicleService.createVehicle(requestDTO);

        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    // GET ALL VEHICLES
    @GetMapping
    public ResponseEntity<List<VehicleResponseDTO>> getAllVehicles() {

        return ResponseEntity.ok(
                vehicleService.getAllVehicles()
        );
    }

    // GET VEHICLE BY ID
    @GetMapping("/{vehicleId}")
    public ResponseEntity<VehicleResponseDTO> getVehicleById(
            @PathVariable UUID vehicleId
    ) {

        return ResponseEntity.ok(
                vehicleService.getVehicleById(vehicleId)
        );
    }

    // GET VEHICLES BY DEALER ID
    @GetMapping("/dealer/{dealerId}")
    public ResponseEntity<List<VehicleResponseDTO>> getVehiclesByDealer(
            @PathVariable UUID dealerId
    ) {

        return ResponseEntity.ok(
                vehicleService.getVehiclesByDealer(dealerId)
        );
    }

    // GET AVAILABLE VEHICLES
    @GetMapping("/available")
    public ResponseEntity<List<VehicleResponseDTO>> getAvailableVehicles() {

        return ResponseEntity.ok(
                vehicleService.getAvailableVehicles()
        );
    }

    // UPDATE VEHICLE
    @PutMapping("/{vehicleId}")
    public ResponseEntity<VehicleResponseDTO> updateVehicle(
            @PathVariable UUID vehicleId,
            @Valid @RequestBody VehicleRequestDTO requestDTO
    ) {

        return ResponseEntity.ok(
                vehicleService.updateVehicle(vehicleId, requestDTO)
        );
    }

    // UPDATE VEHICLE STATUS
    @PatchMapping("/{vehicleId}/status")
    public ResponseEntity<VehicleResponseDTO> updateVehicleStatus(
            @PathVariable UUID vehicleId,
            @RequestParam VehicleStatus status
    ) {

        return ResponseEntity.ok(
                vehicleService.updateVehicleStatus(vehicleId, status)
        );
    }

    // DELETE VEHICLE
    @DeleteMapping("/{vehicleId}")
    public ResponseEntity<Void> deleteVehicle(
            @PathVariable UUID vehicleId
    ) {

        vehicleService.deleteVehicle(vehicleId);

        return ResponseEntity.noContent().build();
    }
}
