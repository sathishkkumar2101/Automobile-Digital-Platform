package com.bmwtechworks.apigateway.config;

import com.bmwtechworks.apigateway.filter.AuthorizationFilter;
import com.bmwtechworks.apigateway.service.AuthorizationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    public AuthorizationFilter authorizationFilter(
            AuthorizationService authorizationService
    ) {
        return new AuthorizationFilter(
                authorizationService
        );
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AuthorizationFilter authorizationFilter
    ) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**")
                        .permitAll()

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/users"
                        )
                        .permitAll()

                        .anyRequest()
                        .authenticated()
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2.jwt(jwt -> {})
                )

                .addFilterAfter(
                        authorizationFilter,
                        BearerTokenAuthenticationFilter.class
                );

        return http.build();
    }

    /**
     * The signing key is never compiled in. It is supplied through
     * {@code jwt.secret}, which resolves from the JWT_SECRET environment
     * variable (see docker-compose.yml). Boot fails fast when it is missing or
     * too short, so a deployment can never silently fall back to a key that is
     * published in this repository.
     */
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

        /*
         * Pinning the issuer and audience means a token minted by any other
         * service that happens to share the key is rejected here, and the
         * algorithm is pinned so the "none" / RS256 confusion tricks are
         * refused. user-role-service stamps the same two claims at login.
         */
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