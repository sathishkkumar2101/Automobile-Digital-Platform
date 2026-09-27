package com.bmwtechworks.userroleservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * The service validates the caller's JWT itself instead of trusting a header.
 *
 * Previously every endpoint was {@code permitAll} and the only thing standing
 * between the internet and the user table was the API gateway. That is not
 * enough on its own: an endpoint that decides "is this caller an administrator?"
 * must be able to prove who the caller is, so the decision is taken from the
 * cryptographically verified token rather than from a client-supplied
 * {@code X-User-Id} header.
 *
 * Three kinds of caller are recognised:
 *  - anonymous, only for login and self-registration
 *  - the API gateway, on {@code /api/internal/**}, presenting a shared secret
 *  - a signed-in user, carrying a JWT the gateway already validated
 *
 * The gateway is the first line of defence, but the service repeats the checks
 * because it is reachable directly as well as through the gateway.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            InternalServiceAuthFilter internalServiceAuthFilter,
            DatabaseRoleAuthenticationConverter authenticationConverter
    ) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session -> session
                        .sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        // Login issues the token, so it cannot require one.
                        .requestMatchers("/api/auth/**").permitAll()

                        // Self-registration is intentionally public; the role
                        // in the body is ignored by UserService.
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/users"
                        ).permitAll()

                        // Service-to-service calls from the gateway, which
                        // carry the shared secret instead of a user token.
                        .requestMatchers("/api/internal/**")
                        .hasAuthority("ROLE_INTERNAL")

                        // Everything else needs a valid user token.
                        .anyRequest().authenticated()
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt ->
                                jwt.jwtAuthenticationConverter(
                                        authenticationConverter
                                )
                        )
                )

                /*
                 * The internal-secret check has to run before the bearer token
                 * is inspected, because an internal caller presents a secret
                 * rather than a user token.
                 */
                .addFilterBefore(
                        internalServiceAuthFilter,
                        org.springframework.security.oauth2.server.resource
                                .web.authentication
                                .BearerTokenAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.issuer}") String issuer,
            @Value("${jwt.audience}") String audience
    ) {

        if (secret == null || secret.length() < 32) {

            throw new IllegalStateException(
                    "jwt.secret must be supplied through the JWT_SECRET "
                            + "environment variable and be at least 32 "
                            + "characters long"
            );
        }

        SecretKey secretKey =
                new SecretKeySpec(
                        secret.getBytes(StandardCharsets.UTF_8),
                        "HmacSHA256"
                );

        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();

        OAuth2TokenValidator<Jwt> validator =
                new DelegatingOAuth2TokenValidator<>(
                        JwtValidators.createDefaultWithIssuer(issuer),
                        new JwtClaimValidator<List<String>>(
                                JwtClaimNames.AUD,
                                claim -> claim != null
                                        && claim.contains(audience)
                        )
                );

        decoder.setJwtValidator(validator);

        return decoder;
    }
}
