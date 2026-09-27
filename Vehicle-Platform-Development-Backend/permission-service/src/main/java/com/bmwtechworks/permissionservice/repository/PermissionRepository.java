package com.bmwtechworks.permissionservice.repository;

import com.bmwtechworks.permissionservice.model.Permission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;
import java.util.Optional;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    Optional<Permission> findByName(String name);
}