package com.bmwtechworks.userroleservice.service;

import com.bmwtechworks.userroleservice.client.PermissionClient;
import com.bmwtechworks.userroleservice.dto.PermissionResponse;
import com.bmwtechworks.userroleservice.dto.RoleRequest;
import com.bmwtechworks.userroleservice.dto.RoleResponse;
import com.bmwtechworks.userroleservice.exception.RoleNotFoundException;
import com.bmwtechworks.userroleservice.model.Role;
import com.bmwtechworks.userroleservice.repository.RoleRepository;
import com.bmwtechworks.userroleservice.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class RoleService {

    /**
     * The three roles the platform itself is built on. The API gateway matches
     * request authorisations against these exact names, and the services compare
     * against them too, so they are part of the contract rather than data:
     * they may have their permissions edited, but they cannot be renamed or
     * deleted without locking everybody out.
     */
    private static final Set<String> SYSTEM_ROLES =
            Set.of("ADMIN", "CUSTOMER", "DEALER");

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PermissionClient permissionClient;

    public RoleService(
            RoleRepository roleRepository,
            UserRepository userRepository,
            PermissionClient permissionClient
    ) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.permissionClient = permissionClient;
    }

    // =========================
    // GET ALL ROLES
    // =========================

    public List<RoleResponse> getAllRoles() {

        return roleRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // =========================
    // GET ROLE BY ID
    // =========================

    public RoleResponse getRoleById(UUID id) {

        Role role = roleRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Role not found with id: " + id
                        )
                );

        return toResponse(role);
    }

    // =========================
    // CREATE ROLE
    // =========================

    public RoleResponse createRole(RoleRequest request) {

        String name = request.name().trim();

        if (roleRepository.existsByName(name)) {
            throw new RuntimeException(
                    "Role already exists: " + name
            );
        }

        /*
         * Refuses to create a second role carrying a system name. The unique
         * constraint already stops an exact duplicate, but a near-miss such as
         * "admin" or "Admin" would be a role that never matches any of the
         * gateway's authorisation checks while still looking like it should.
         */
        if (SYSTEM_ROLES.stream()
                .anyMatch(system -> system.equalsIgnoreCase(name))) {

            throw new AccessDeniedException(
                    name + " is a system role and cannot be created"
            );
        }

        Set<UUID> permissionIds =
                request.permissionIds() != null
                        ? new HashSet<>(request.permissionIds())
                        : new HashSet<>();

        // Verify permissions through Permission Service
        validatePermissions(permissionIds);

        Role role = Role.builder()
                .name(name)
                .description(request.description() == null
                        ? null
                        : request.description().trim())
                .permissionIds(permissionIds)
                .build();

        Role savedRole = roleRepository.save(role);

        return toResponse(savedRole);
    }

    // =========================
    // UPDATE ROLE
    // =========================

    public RoleResponse updateRole(
            UUID id,
            RoleRequest request
    ) {

        Role existingRole = roleRepository.findById(id)
                .orElseThrow(() ->
                        new RoleNotFoundException(
                                "Role not found with id: " + id
                        )
                );

        String requestedName = request.name().trim();
        boolean renaming = !existingRole.getName()
                .equalsIgnoreCase(requestedName);

        /*
         * Renaming a system role would break authorisation everywhere at once:
         * the gateway resolves a user's role from this table and then compares
         * it against the literal names ADMIN, CUSTOMER and DEALER, so the
         * moment ADMIN is renamed to anything else every administrator silently
         * becomes an ordinary user and the admin area is unreachable.
         */
        if (renaming && isSystemRole(existingRole.getName())) {

            throw new AccessDeniedException(
                    existingRole.getName()
                            + " is a system role and cannot be renamed"
            );
        }

        /*
         * The mirror image: an ordinary role must not be renamed onto a system
         * name either, or it would inherit the authority that name implies
         * everywhere the platform does a string comparison.
         */
        if (renaming && isSystemRole(requestedName)) {

            throw new AccessDeniedException(
                    requestedName
                            + " is reserved for the platform and cannot be used"
            );
        }

        // Check if another role already uses this name
        if (renaming && roleRepository.existsByName(requestedName)) {

            throw new RuntimeException(
                    "Role already exists: " + requestedName
            );
        }

        /*
         * An absent permissionIds means "not supplied", not "none". The roles
         * screen saves a name and description on its own, so treating a missing
         * list as an empty one silently stripped every permission from the role
         * the moment anyone edited its description.
         */
        boolean permissionsSupplied = request.permissionIds() != null;

        Set<UUID> permissionIds = permissionsSupplied
                ? new HashSet<>(request.permissionIds())
                : new HashSet<>(existingRole.getPermissionIds());

        // Verify permissions through Permission Service
        validatePermissions(permissionIds);

        if (renaming) {
            existingRole.setName(requestedName);
        }

        if (request.description() != null) {
            existingRole.setDescription(request.description().trim());
        }

        existingRole.setPermissionIds(permissionIds);

        Role updatedRole = roleRepository.save(existingRole);

        return toResponse(updatedRole);
    }

    // =========================
    // DELETE ROLE
    // =========================

    /**
     * Deletes a role, unless doing so would damage the platform.
     *
     * Two situations are refused:
     *
     *  - a system role, which the gateway authorises against by name
     *  - a role that accounts are still assigned to. users.role_id is a plain
     *    UUID column with no foreign key, so the delete used to succeed and
     *    leave those accounts pointing at a role that no longer exists, which
     *    made them fail to load and could not be repaired through the UI.
     */
    public void deleteRole(UUID id) {

        Role role = roleRepository.findById(id)
                .orElseThrow(() ->
                        new RoleNotFoundException(
                                "Role not found with id: " + id
                        )
                );

        if (isSystemRole(role.getName())) {

            throw new AccessDeniedException(
                    role.getName()
                            + " is a system role and cannot be deleted"
            );
        }

        long assignedUsers = userRepository.countByRoleId(id);

        if (assignedUsers > 0) {

            throw new AccessDeniedException(
                    role.getName() + " is assigned to "
                            + assignedUsers
                            + " user(s) and cannot be deleted. "
                            + "Reassign them first."
            );
        }

        roleRepository.delete(role);
    }

    private static boolean isSystemRole(String name) {

        if (name == null) {
            return false;
        }

        return SYSTEM_ROLES.stream()
                .anyMatch(system -> system.equalsIgnoreCase(name));
    }

    // =========================
    // VALIDATE PERMISSIONS
    // =========================

    private void validatePermissions(Set<UUID> permissionIds) {

        for (UUID permissionId : permissionIds) {

            try {

                PermissionResponse permission =
                        permissionClient.getPermissionById(permissionId);

                if (permission == null) {
                    throw new RuntimeException(
                            "Permission not found: " + permissionId
                    );
                }

            } catch (Exception e) {

                throw new RuntimeException(
                        "Invalid permission ID: " + permissionId,
                        e
                );
            }
        }
    }

    // =========================
    // ENTITY → RESPONSE
    // =========================

    private RoleResponse toResponse(Role role) {

        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getDescription(),
                role.getPermissionIds()
        );
    }
}