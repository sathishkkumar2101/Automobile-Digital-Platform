package com.bmwtechworks.vehicle.service;

import com.bmwtechworks.vehicle.dto.VehicleRequestDTO;
import com.bmwtechworks.vehicle.dto.VehicleResponseDTO;
import com.bmwtechworks.vehicle.exception.DuplicateVinException;
import com.bmwtechworks.vehicle.exception.VehicleNotFoundException;
import com.bmwtechworks.vehicle.model.Vehicle;
import com.bmwtechworks.vehicle.model.VehicleStatus;
import com.bmwtechworks.vehicle.repository.VehicleRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public VehicleService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    // CREATE VEHICLE
    public VehicleResponseDTO createVehicle(VehicleRequestDTO requestDTO) {

        if (vehicleRepository.existsByVin(requestDTO.vin())) {
            throw new DuplicateVinException(
                    "Vehicle with VIN already exists: " + requestDTO.vin()
            );
        }

        Vehicle vehicle = new Vehicle();

        vehicle.setVin(requestDTO.vin());
        vehicle.setModel(requestDTO.model());
        vehicle.setTrim(requestDTO.trim());
        vehicle.setColor(requestDTO.color());
        vehicle.setPrice(requestDTO.price());
        vehicle.setDealerId(requestDTO.dealerId());
        vehicle.setMileage(requestDTO.mileage() != null ? requestDTO.mileage() : 0);
        vehicle.setImage(requestDTO.image());
        vehicle.setBodyType(requestDTO.bodyType());
        vehicle.setEngine(requestDTO.engine());
        vehicle.setTransmission(requestDTO.transmission());
        vehicle.setFuelType(requestDTO.fuelType());
        vehicle.setDescription(requestDTO.description());

        // Every new vehicle starts as AVAILABLE
        vehicle.setStatus(VehicleStatus.AVAILABLE);

        Vehicle savedVehicle = vehicleRepository.save(vehicle);

        return mapToResponse(savedVehicle);
    }

    // GET ALL VEHICLES
    public List<VehicleResponseDTO> getAllVehicles() {

        return vehicleRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // GET VEHICLE BY ID
    public VehicleResponseDTO getVehicleById(UUID vehicleId) {

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() ->
                        new VehicleNotFoundException(
                                "Vehicle not found with id: " + vehicleId
                        )
                );

        return mapToResponse(vehicle);
    }

    // GET VEHICLES BY DEALER
    public List<VehicleResponseDTO> getVehiclesByDealer(UUID dealerId) {

        return vehicleRepository.findByDealerId(dealerId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // GET AVAILABLE VEHICLES
    public List<VehicleResponseDTO> getAvailableVehicles() {

        return vehicleRepository.findByStatus(VehicleStatus.AVAILABLE)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    // UPDATE VEHICLE
    public VehicleResponseDTO updateVehicle(
            UUID vehicleId,
            VehicleRequestDTO requestDTO
    ) {

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() ->
                        new VehicleNotFoundException(
                                "Vehicle not found with id: " + vehicleId
                        )
                );

        vehicle.setVin(requestDTO.vin());
        vehicle.setModel(requestDTO.model());
        vehicle.setTrim(requestDTO.trim());
        vehicle.setColor(requestDTO.color());
        vehicle.setPrice(requestDTO.price());
        vehicle.setDealerId(requestDTO.dealerId());

        Vehicle updatedVehicle = vehicleRepository.save(vehicle);

        return mapToResponse(updatedVehicle);
    }

    // UPDATE VEHICLE STATUS
    public VehicleResponseDTO updateVehicleStatus(
            UUID vehicleId,
            VehicleStatus status
    ) {

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() ->
                        new VehicleNotFoundException(
                                "Vehicle not found with id: " + vehicleId
                        )
                );

        vehicle.setStatus(status);

        Vehicle updatedVehicle = vehicleRepository.save(vehicle);

        return mapToResponse(updatedVehicle);
    }

    // DELETE VEHICLE
    public void deleteVehicle(UUID vehicleId) {

        if (!vehicleRepository.existsById(vehicleId)) {
            throw new VehicleNotFoundException(
                    "Vehicle not found with id: " + vehicleId
            );
        }

        vehicleRepository.deleteById(vehicleId);
    }

    // CONVERT ENTITY TO RESPONSE DTO
    private VehicleResponseDTO mapToResponse(Vehicle vehicle) {
        java.util.List<String> images = vehicle.getImage() != null && !vehicle.getImage().isBlank()
                ? java.util.List.of(vehicle.getImage())
                : java.util.List.of();

        return new VehicleResponseDTO(
                vehicle.getVehicleId(),
                vehicle.getVin(),
                vehicle.getModel(),
                vehicle.getTrim(),
                vehicle.getColor(),
                vehicle.getPrice(),
                vehicle.getStatus(),
                vehicle.getDealerId(),
                vehicle.getMileage(),
                vehicle.getImage(),
                images,
                vehicle.getBodyType(),
                vehicle.getEngine(),
                vehicle.getTransmission(),
                vehicle.getFuelType(),
                vehicle.getDescription()
        );
    }
}
