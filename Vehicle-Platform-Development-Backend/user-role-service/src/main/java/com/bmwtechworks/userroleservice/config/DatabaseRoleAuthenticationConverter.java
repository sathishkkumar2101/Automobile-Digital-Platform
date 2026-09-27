package com.bmwtechworks.userroleservice.config;

import com.bmwtechworks.userroleservice.model.Role;
import com.bmwtechworks.userroleservice.model.User;
import com.bmwtechworks.userroleservice.repository.RoleRepository;
import com.bmwtechworks.userroleservice.repository.UserRepository;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns a verified JWT into an authentication that carries the caller's role,
 * so the service can make its own access decisions.
 *
 * The gateway already resolves roles before forwarding a request, but the
 * service is also reachable directly and must not depend on the caller having
 * gone through the gateway. The role is read from the database on every request
 * rather than from a claim, which means a token cannot claim to be an
 * administrator and a demotion takes effect immediately instead of when the
 * token happens to expire.
 */
@Component
public class DatabaseRoleAuthenticationConverter
        implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public DatabaseRoleAuthenticationConverter(
            UserRepository userRepository,
            RoleRepository roleRepository
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {

        String subject = jwt.getSubject();

        List<SimpleGrantedAuthority> authorities =
                new ArrayList<>();

        if (subject != null) {

            roleNameFor(subject).ifPresent(roleName ->
                    authorities.add(
                            new SimpleGrantedAuthority("ROLE_" + roleName)
                    )
            );
        }

        /*
         * Every authenticated account may read its own record and change its
         * own name, so SCOPE_SELF is always present alongside the role.
         */
        authorities.add(
                new SimpleGrantedAuthority("SCOPE_SELF")
        );

        /*
         * The principal name is the subject, which is the user's UUID.
         * Method security expressions such as
         * "#id == authentication.name" compare it against the path variable, so
         * it has to be the id and not the email address.
         */
        return new JwtAuthenticationToken(
                jwt,
                authorities,
                subject == null ? jwt.getClaimAsString("email") : subject
        );
    }

    private Optional<String> roleNameFor(String subject) {

        UUID userId;

        try {
            userId = UUID.fromString(subject);
        } catch (IllegalArgumentException invalidSubject) {
            return Optional.empty();
        }

        return userRepository.findById(userId)
                .map(User::getRoleId)
                .flatMap(roleRepository::findById)
                .map(Role::getName);
    }
}
