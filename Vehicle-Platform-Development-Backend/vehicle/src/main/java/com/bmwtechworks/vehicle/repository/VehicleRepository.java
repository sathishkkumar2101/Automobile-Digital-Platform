package com.bmwtechworks.vehicle.repository;

import com.bmwtechworks.vehicle.model.Vehicle;
import com.bmwtechworks.vehicle.model.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

    List<Vehicle> findByDealerId(UUID dealerId);

    List<Vehicle> findByStatus(VehicleStatus status);

    List<Vehicle> findByDealerIdAndStatus(
            UUID dealerId,
            VehicleStatus status
    );

    boolean existsByVin(String vin);
}