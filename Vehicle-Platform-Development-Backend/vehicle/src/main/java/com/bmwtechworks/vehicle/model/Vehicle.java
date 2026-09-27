package com.bmwtechworks.vehicle.model;

import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Data
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    public UUID vehicleId;

    private String vin;

    private String model;

    private String trim;

    private String color;

    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    private VehicleStatus status;

    private UUID dealerId;

    private Integer mileage;

    private String image;

    private String bodyType;

    private String engine;

    private String transmission;

    private String fuelType;

    private String description;
}
