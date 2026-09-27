package com.bmwtechworks.permissionservice.controller;

import com.bmwtechworks.permissionservice.dto.PermissionRequest;
import com.bmwtechworks.permissionservice.dto.PermissionResponse;
import com.bmwtechworks.permissionservice.service.PermissionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/permissions")
public class PermissionController {

    private final PermissionService permissionService;

    public PermissionController(PermissionService permissionService) {
        this.permissionService = permissionService;
    }

    @GetMapping
    public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
        return ResponseEntity.ok(
                permissionService.getAllPermissions()
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<PermissionResponse> getPermissionById(
            @PathVariable UUID id) {

        return ResponseEntity.ok(
                permissionService.getPermissionById(id)
        );
    }

    @PostMapping
    public ResponseEntity<PermissionResponse> createPermission(
            @Valid @RequestBody PermissionRequest request) {

        PermissionResponse response =
                permissionService.createPermission(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PermissionResponse> updatePermission(
            @PathVariable UUID id,
            @Valid @RequestBody PermissionRequest request) {

        return ResponseEntity.ok(
                permissionService.updatePermission(id, request)
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePermission(
            @PathVariable UUID id) {

        permissionService.deletePermission(id);

        return ResponseEntity.noContent().build();
    }
}