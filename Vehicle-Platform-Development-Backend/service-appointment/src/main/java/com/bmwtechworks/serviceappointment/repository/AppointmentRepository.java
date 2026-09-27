package com.bmwtechworks.serviceappointment.repository;

import com.bmwtechworks.serviceappointment.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    List<Appointment> findByCustomerId(UUID customerId);
    List<Appointment> findByDealerId(UUID dealerId);
}