package com.bmwtechworks.userroleservice.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/**
 * Authenticates the API gateway on the internal endpoints it uses to resolve a
 * user's role and permissions.
 *
 * These endpoints are not reachable from a browser — the gateway strips the
 * X-Internal-Secret header from anything that arrives from outside — but the
 * service still refuses to serve them unless the caller can prove it holds the
 * shared secret. The comparison is constant-time so the secret cannot be
 * recovered by timing the endpoint.
 */
@Component
public class InternalServiceAuthFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Internal-Secret";

    private final byte[] expectedSecret;

    public InternalServiceAuthFilter(
            @Value("${internal.service.secret}") String secret
    ) {
        if (secret == null || secret.length() < 32) {

            throw new IllegalStateException(
                    "internal.service.secret must be supplied through the "
                            + "INTERNAL_SERVICE_SECRET environment variable "
                            + "and be at least 32 characters long"
            );
        }

        this.expectedSecret =
                secret.getBytes(StandardCharsets.UTF_8);
    }

    /**
     * Only the internal endpoints require the shared secret. Every other route
     * is authenticated by the resource server with the caller's JWT.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {

        return !request.getRequestURI().startsWith("/api/internal/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String provided = request.getHeader(HEADER);

        if (!matches(provided)) {

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                    "{\"error\":\"Unauthorized\","
                            + "\"message\":\"Internal endpoint\"}"
            );

            return;
        }

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "api-gateway",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_INTERNAL"))
                )
        );

        try {
            filterChain.doFilter(request, response);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private boolean matches(String provided) {

        if (provided == null) {
            return false;
        }

        return MessageDigest.isEqual(
                expectedSecret,
                provided.getBytes(StandardCharsets.UTF_8)
        );
    }
}
