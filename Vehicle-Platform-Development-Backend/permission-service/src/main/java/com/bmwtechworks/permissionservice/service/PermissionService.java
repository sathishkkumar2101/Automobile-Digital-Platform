package com.bmwtechworks.permissionservice.service;

import com.bmwtechworks.permissionservice.dto.PermissionRequest;
import com.bmwtechworks.permissionservice.exception.PermissionNotFoundException;
import com.bmwtechworks.permissionservice.dto.PermissionResponse;
import com.bmwtechworks.permissionservice.model.Permission;
import com.bmwtechworks.permissionservice.repository.PermissionRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class PermissionService {

    private final PermissionRepository permissionRepository;

    public PermissionService(PermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public PermissionResponse getPermissionById(UUID id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() ->
                        new PermissionNotFoundException(
                                "Permission not found with id: " + id));

        return toResponse(permission);
    }

    public PermissionResponse createPermission(PermissionRequest request) {

        Permission permission = Permission.builder()
                .name(request.name())
                .description(request.description())
                .build();

        Permission savedPermission = permissionRepository.save(permission);

        return toResponse(savedPermission);
    }

    public PermissionResponse updatePermission(
            UUID id,
            PermissionRequest request) {

        Permission existingPermission = permissionRepository.findById(id)
                .orElseThrow(() ->
                        new PermissionNotFoundException(
                                "Permission not found with id: " + id));

        existingPermission.setName(request.name());
        existingPermission.setDescription(request.description());

        Permission updatedPermission =
                permissionRepository.save(existingPermission);

        return toResponse(updatedPermission);
    }

    public void deletePermission(UUID id) {

        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() ->
                        new PermissionNotFoundException(
                                "Permission not found with id: " + id));

        permissionRepository.delete(permission);
    }

    private PermissionResponse toResponse(Permission permission) {

        return new PermissionResponse(
                permission.getId(),
                permission.getName(),
                permission.getDescription()
        );
    }
}