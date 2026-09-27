package com.bmwtechworks.messaging.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Exposes a Nimbus JWT decoder built from the shared signing key so the
 * messaging service can authenticate WebSocket (STOMP CONNECT) handshakes the
 * same way the API Gateway authenticates REST requests.
 *
 * The key arrives through the JWT_SECRET environment variable and is validated
 * against the same issuer and audience as the gateway, so a token that the
 * gateway would refuse is refused here too.
 */
@Configuration
public class JwtDecoderConfig {

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

        SecretKeySpec key = new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        );

        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withSecretKey(key)
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
