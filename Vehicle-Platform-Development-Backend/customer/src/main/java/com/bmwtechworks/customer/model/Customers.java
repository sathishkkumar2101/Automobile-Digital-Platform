package com.bmwtechworks.customer.model;

import jakarta.persistence.Entity;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;
import org.hibernate.annotations.CreationTimestamp;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Customers {

    @Id
    @GeneratedValue
    private UUID id;

    private UUID userId;

    private String name;

    @NotNull
    private String email;

    private String phone;

    @ElementCollection
    private List<String> address;

    /**
     * When the account was created, so the customer list can show a join date
     * instead of leaving it blank. Set once on insert and not editable
     * afterwards.
     */
    @CreationTimestamp
    private LocalDateTime createdAt;
}