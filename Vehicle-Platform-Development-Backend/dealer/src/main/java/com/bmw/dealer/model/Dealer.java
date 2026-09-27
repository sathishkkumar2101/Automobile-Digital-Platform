package com.bmw.dealer.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Entity
@Data
public class Dealer {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID dealerId;

    private UUID userId;

    private String name;

    private String location;
}