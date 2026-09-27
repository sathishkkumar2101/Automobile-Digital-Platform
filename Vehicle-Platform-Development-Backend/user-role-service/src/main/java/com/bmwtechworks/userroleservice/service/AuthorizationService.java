package com.bmwtechworks.userroleservice.service;

import com.bmwtechworks.userroleservice.client.PermissionClient;
import com.bmwtechworks.userroleservice.dto.AuthorizationResponse;
import com.bmwtechworks.userroleservice.dto.PermissionResponse;
import com.bmwtechworks.userroleservice.model.Role;
import com.bmwtechworks.userroleservice.model.User;
import com.bmwtechworks.userroleservice.repository.RoleRepository;
import com.bmwtechworks.userroleservice.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AuthorizationService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionClient permissionClient;

    public AuthorizationService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PermissionClient permissionClient
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.permissionClient = permissionClient;
    }

    public AuthorizationResponse getUserAuthorization(UUID userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: " + userId
                        )
                );

        Role role = roleRepository.findById(user.getRoleId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Role not found with id: " + user.getRoleId()
                        )
                );

        List<String> permissions = role.getPermissionIds()
                .stream()
                .map(permissionClient::getPermissionById)
                .map(PermissionResponse::name)
                .toList();

        return new AuthorizationResponse(
                user.getId(),
                role.getName(),
                permissions
        );
    }
}