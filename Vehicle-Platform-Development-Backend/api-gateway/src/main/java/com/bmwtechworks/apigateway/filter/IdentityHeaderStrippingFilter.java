package com.bmwtechworks.apigateway.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.Locale;

/**
 * Removes client-supplied identity headers before anything downstream can read
 * them.
 *
 * The gateway tells the backend services who the caller is using
 * {@code X-User-Id}, {@code X-User-Role} and {@code X-Dealer-Id}, and the
 * services make ownership and filtering decisions from those values. Without
 * this filter a client could simply send the headers itself: a request to
 * {@code PUT /api/v1/customers/{someone else's id}} with
 * {@code X-User-Id: <their own id>} would be forwarded untouched on every code
 * path that does not re-wrap the request, and the service would believe it.
 *
 * Stripping happens first, so a header the gateway adds afterwards is the only
 * one the services ever see. A client cannot spoof an identity, and a forged
 * {@code X-Internal-Secret} cannot reach user-role-service through the gateway.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class IdentityHeaderStrippingFilter extends OncePerRequestFilter {

    /**
     * Headers that describe the caller's identity or the gateway's own trust.
     * Anything in this list that arrives from outside is discarded.
     */
    private static final List<String> TRUSTED_HEADERS = List.of(
            "x-user-id",
            "x-user-role",
            "x-dealer-id",
            "x-internal-secret"
    );

    private static boolean isTrusted(String name) {
        return TRUSTED_HEADERS.contains(name.toLowerCase(Locale.ROOT));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        filterChain.doFilter(
                new HeaderHidingRequestWrapper(request),
                response
        );
    }

    /**
     * Hides the trusted headers from every downstream consumer, including
     * {@link AuthorizationFilter} and the code that builds the outbound
     * request to the backend service.
     */
    private static final class HeaderHidingRequestWrapper
            extends HttpServletRequestWrapper {

        private HeaderHidingRequestWrapper(HttpServletRequest request) {
            super(request);
        }

        @Override
        public String getHeader(String name) {
            return isTrusted(name) ? null : super.getHeader(name);
        }

        @Override
        public Enumeration<String> getHeaders(String name) {
            return isTrusted(name)
                    ? Collections.<String>emptyEnumeration()
                    : super.getHeaders(name);
        }

        @Override
        public Enumeration<String> getHeaderNames() {

            Enumeration<String> original = super.getHeaderNames();

            if (original == null) {
                return Collections.<String>emptyEnumeration();
            }

            List<String> visible = Collections.list(original)
                    .stream()
                    .filter(name -> !isTrusted(name))
                    .toList();

            return Collections.enumeration(visible);
        }
    }
}
