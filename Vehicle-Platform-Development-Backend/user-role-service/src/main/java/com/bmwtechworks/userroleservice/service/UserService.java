package com.bmwtechworks.userroleservice.service;

import com.bmwtechworks.userroleservice.client.CustomerProfileClient;
import com.bmwtechworks.userroleservice.client.PermissionClient;
import com.bmwtechworks.userroleservice.dto.MeResponse;
import com.bmwtechworks.userroleservice.dto.PermissionResponse;
import com.bmwtechworks.userroleservice.dto.UserRequest;
import com.bmwtechworks.userroleservice.dto.UserProfileResponse;
import com.bmwtechworks.userroleservice.dto.UserResponse;
import com.bmwtechworks.userroleservice.dto.UserUpdateRequest;
import com.bmwtechworks.userroleservice.exception.UserAlreadyExistsException;
import com.bmwtechworks.userroleservice.exception.UserNotFoundException;
import com.bmwtechworks.userroleservice.model.Role;
import com.bmwtechworks.userroleservice.model.User;
import com.bmwtechworks.userroleservice.repository.RoleRepository;
import com.bmwtechworks.userroleservice.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    /**
     * The roles an account may be given.
     *
     * Any role that exists in the roles table can be assigned, so a role created
     * on the Roles &amp; Permissions screen is actually usable. The set of
     * assignable roles is deliberately not hardcoded: keeping a fixed list here
     * meant custom roles could be created but never handed to anybody.
     * Whether a role exists is decided by the caller, which looks it up.
     */
    private static final String ADMIN_ROLE = "ADMIN";
    private static final String CUSTOMER_ROLE = "CUSTOMER";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionClient permissionClient;
    private final PasswordEncoder passwordEncoder;
    private final CustomerProfileClient customerProfileClient;

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PermissionClient permissionClient,
            PasswordEncoder passwordEncoder,
            CustomerProfileClient customerProfileClient
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.permissionClient = permissionClient;
        this.passwordEncoder = passwordEncoder;
        this.customerProfileClient = customerProfileClient;
    }

    public List<UserResponse> getAllUsers() {

        Map<UUID, String> roleNames = roleRepository.findAll()
                .stream()
                .collect(Collectors.toMap(Role::getId, Role::getName));

        return userRepository.findAll()
                .stream()
                .map(user -> toResponse(user, roleNames))
                .toList();
    }

    /**
     * Internal subsystem endpoint helpers - never exposed through the API
     * Gateway. Returns the compact profile used by the messaging service.
     */
    public UserProfileResponse getProfile(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: " + id
                        )
                );
        return toProfileResponse(user);
    }

    /**
     * Username lookup for service-to-service callers, used by the dealer
     * service when an administrator registers a dealership. The message names
     * no detail beyond the fact that the account is absent, because this
     * response travels to another service rather than to a browser.
     */
    public UserProfileResponse getProfileByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new RuntimeException(
                                "No such user account"
                        )
                );
        return toProfileResponse(user);
    }

    public UserProfileResponse getAdministrator() {
        User admin = userRepository.findByRoleName("ADMIN")
                .stream()
                .findFirst()
                .orElseThrow(() ->
                        new RuntimeException(
                                "No ADMIN user found"
                        )
                );
        return toProfileResponse(admin);
    }

    private UserProfileResponse toProfileResponse(User user) {
        Role role = roleRepository.findById(user.getRoleId())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Role not found with id: " + user.getRoleId()
                        )
                );
        return new UserProfileResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                role.getName()
        );
    }

    public UserResponse getUserById(UUID id) {

        User user = userRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: " + id
                        )
                );

        return toResponse(user);
    }
    public UserResponse getUserByUsername(String username) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with username: " + username
                        )
                );

        return toResponse(user);
    }

    public MeResponse getCurrentUser(UUID userId) {

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

        return new MeResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                role.getName(),
                permissions
        );
    }
    /**
     * Creates an account.
     *
     * POST /api/users doubles as public self-registration and as the admin
     * "create user" action, so the caller's identity decides what happens to
     * the requested role:
     *
     *  - anonymous (self-registration) always becomes CUSTOMER. The gateway
     *    exempts this route from authentication, so honouring a role here
     *    would let anyone on the internet mint themselves an administrator.
     *  - an authenticated administrator gets the role they asked for, which is
     *    what the admin Users screen needs.
     *
     * Anyone else asking for a privileged role is refused rather than silently
     * downgraded, so a client cannot believe it created a dealer when it did
     * not.
     */
    public UserResponse createUser(
            UserRequest request,
            UUID callerId
    ) {

        if (userRepository.existsByEmail(request.email())) {
            throw new UserAlreadyExistsException(
                    "User already exists with email: " + request.email()
            );
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new UserAlreadyExistsException(
                    "User already exists with username: "
                            + request.username()
            );
        }

        Role role = roleRepository.findByName(
                roleNameForNewUser(request, callerId)
        ).orElseThrow(() ->
                new UserNotFoundException(
                        "Role not found: "
                                + roleNameForNewUser(request, callerId)
                )
        );

        User user = User.builder()
                .username(request.username())
                .name(request.name())
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .roleId(role.getId())
                .build();

        User savedUser = userRepository.save(user);

        return toResponse(savedUser);
    }

    private String roleNameForNewUser(
            UserRequest request,
            UUID callerId
    ) {

        String requested = hasText(request.role())
                ? normalizeRole(request.role())
                : CUSTOMER_ROLE;

        if (CUSTOMER_ROLE.equals(requested)) {
            return requested;
        }

        /*
         * Anything above CUSTOMER is a privileged account, and the only way to
         * mint one is as an administrator. Self-registration is public, so an
         * anonymous caller asking for ADMIN is refused outright rather than
         * quietly downgraded, which would leave the client thinking it had
         * created an administrator.
         */
        if (!ADMIN_ROLE.equals(roleNameOf(callerId))) {

            throw new AccessDeniedException(
                    "Only an administrator can create a "
                            + requested + " account"
            );
        }

        return requested;
    }

    /**
     * Partial update of an existing account. The password and the role are only
     * touched when the request actually supplies them, so an account can be
     * renamed without knowing (or resetting) its credentials.
     *
     * Role changes are refused unless the caller is an administrator. The
     * gateway lets anybody PUT their own record, so without this check any
     * signed-in CUSTOMER could send {@code {"role":"DEALER"}} for their own id
     * and be promoted. The caller identity comes from the verified token, so a
     * client cannot forge it.
     */
    public UserResponse updateUser(
            UUID id,
            UUID callerId,
            UserUpdateRequest request
    ) {

        User existingUser = userRepository.findById(id)
                .orElseThrow(() ->
                        new UserNotFoundException(
                                "User not found with id: " + id
                        )
                );

        String newEmail = request.email().trim();

        if (!newEmail.equalsIgnoreCase(existingUser.getEmail())
                && userRepository.existsByEmail(newEmail)) {

            throw new UserAlreadyExistsException(
                    "User already exists with email: " + newEmail
            );
        }

        existingUser.setName(request.name());
        existingUser.setEmail(newEmail);

        if (hasText(request.password())) {

            existingUser.setPassword(
                    passwordEncoder.encode(request.password())
            );
        }

        if (hasText(request.role())) {

            applyRoleChange(existingUser, request.role(), callerId);
        }

        return toResponse(userRepository.save(existingUser));
    }

    /**
     * Applies a requested role change, refusing anything the caller is not
     * entitled to make.
     */
    private void applyRoleChange(
            User target,
            String requestedRole,
            UUID callerId
    ) {

        String roleName = normalizeRole(requestedRole);
        String currentRole = currentRoleName(target);

        if (roleName.equals(currentRole)) {
            return;
        }

        String callerRole = roleNameOf(callerId);

        if (!ADMIN_ROLE.equals(callerRole)) {

            throw new AccessDeniedException(
                    "Only an administrator can change a role"
            );
        }

        /*
         * Nobody edits their own role, not even an administrator. The gateway
         * resolves roles per request from the database, so an admin who
         * demoted themselves would lose access mid-request and, if they were
         * the last one, the platform would be unadministrable.
         */
        if (target.getId().equals(callerId)) {

            throw new AccessDeniedException(
                    "You cannot change your own role"
            );
        }

        if (ADMIN_ROLE.equals(currentRole)
                && countAdministrators() <= 1) {

            throw new AccessDeniedException(
                    "The last administrator cannot be demoted"
            );
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() ->
                        new UserNotFoundException(
                                "Role not found: " + roleName
                        )
                );

        target.setRoleId(role.getId());
    }

    private long countAdministrators() {

        UUID adminRoleId = roleRepository
                .findByName(ADMIN_ROLE)
                .map(Role::getId)
                .orElse(null);

        if (adminRoleId == null) {
            return 0;
        }

        return userRepository.countByRoleId(adminRoleId);
    }

    private String roleNameOf(UUID userId) {

        if (userId == null) {
            return null;
        }

        return userRepository.findById(userId)
                .map(User::getRoleId)
                .map(roleId -> roleRepository.findById(roleId)
                        .map(Role::getName)
                        .orElse(null))
                .orElse(null);
    }

    /**
     * Deletes an account, taking its customer profile with it.
     *
     * <p>The profile has to go first. The user and customer tables sit in
     * separate databases with no foreign key between them, so nothing cascades
     * for us: removing the account first and then failing to reach the profile
     * would strand a row that can no longer be attributed to anybody, because
     * every route to it is keyed by the user id that has just been discarded.
     * This way an unreachable customer service leaves the account fully intact
     * and the delete can simply be retried.
     *
     * <p>Runs for every account, whatever its role. The customer service treats
     * a missing profile as a successful no-op, so this costs a single cheap
     * call for an administrator and still cleans up an account that was
     * re-roled away from CUSTOMER after it had onboarded.
     *
     * @throws com.bmwtechworks.userroleservice.exception.CustomerProfileCleanupException
     *         when the profile could not be removed; the account is left in place
     */
    public void deleteUser(UUID id) {

        User user = userRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: " + id
                        )
                );

        customerProfileClient.deleteProfileForUser(id);

        userRepository.delete(user);
    }

    public User login(String email, String password) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new com.bmwtechworks.userroleservice.exception.InvalidCredentialsException(
                                "Invalid email or password"
                        )
                );

        boolean validPassword =
                passwordEncoder.matches(
                        password,
                        user.getPassword()
                );

        if (!validPassword) {
            throw new com.bmwtechworks.userroleservice.exception.InvalidCredentialsException(
                    "Invalid email or password"
            );
        }

        return user;
    }

    private UserResponse toResponse(User user) {

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getEmail(),
                user.getRoleId(),
                currentRoleName(user),
                user.getCreatedAt()
        );
    }

    private UserResponse toResponse(User user, Map<UUID, String> roleNames) {

        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getEmail(),
                user.getRoleId(),
                roleNames.get(user.getRoleId()),
                user.getCreatedAt()
        );
    }

    private String currentRoleName(User user) {

        return roleRepository.findById(user.getRoleId())
                .map(Role::getName)
                .orElse(null);
    }

    private boolean hasText(String value) {

        return value != null && !value.isBlank();
    }

    private String normalizeRole(String role) {

        return role.trim().toUpperCase(Locale.ROOT);
    }
}