package com.bmwtechworks.serviceappointment.repository;

import com.bmwtechworks.serviceappointment.model.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServiceTypeRepository extends JpaRepository<ServiceType, String> {

    List<ServiceType> findByActiveTrueOrderByLabelAsc();

    Optional<ServiceType> findByCodeAndActiveTrue(String code);
}
