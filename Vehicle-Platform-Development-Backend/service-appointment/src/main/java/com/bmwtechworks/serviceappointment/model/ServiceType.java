package com.bmwtechworks.serviceappointment.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A service the workshops actually perform.
 *
 * <p>This table exists because {@code appointments.service_type} was a bare
 * {@code String} column with nothing constraining it. The booking form offered a
 * hardcoded list of types that were never in this schema, and the write path
 * accepted whatever it was sent, so a booking could be recorded against a
 * service that does not exist. Reports and workshop scheduling then had to cope
 * with values nobody had defined.
 *
 * <p>Making the type a real row — and having both the read endpoint and the
 * write validation consult it — means the list the customer chooses from and the
 * set the backend will accept are the same set, and an operator can add a
 * service without a redeploy.
 */
@Entity
@Table(name = "service_types")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceType {

    /**
     * The code stored in {@code appointments.service_type}, e.g. {@code OIL_CHANGE}.
     * Used as the primary key so the column and the row it must reference are the
     * same value by construction.
     */
    @Id
    @Column(name = "code", length = 64, nullable = false)
    private String code;

    /** Human-readable name for the booking form. */
    @Column(name = "label", length = 120, nullable = false)
    private String label;

    @Column(name = "description", length = 400)
    private String description;

    /**
     * Retired services stay in the table so historical appointments keep
     * resolving, but are not offered to new bookings.
     */
    @Builder.Default
    @Column(name = "active", nullable = false)
    private boolean active = true;
}
