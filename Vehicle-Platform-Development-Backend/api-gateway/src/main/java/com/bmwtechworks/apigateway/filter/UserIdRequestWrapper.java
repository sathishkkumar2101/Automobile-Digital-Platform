package com.bmwtechworks.apigateway.filter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.UUID;

/**
 * Request wrapper that injects gateway-resolved headers into downstream requests.
 *
 * Headers injected:
 *  - X-User-Id   : the authenticated user's UUID (from JWT sub)
 *  - X-User-Role : the authenticated user's role (CUSTOMER / DEALER / ADMIN)
 *  - X-Dealer-Id : the authenticated dealer's dealerId (resolved from userId)
 *                  ONLY set for DEALER role — downstream services use this
 *                  instead of userId for dealer-scoped data queries.
 *
 * This is the canonical way to propagate authenticated identity from
 * the gateway to backend microservices without trusting client-supplied headers.
 */
public class UserIdRequestWrapper extends HttpServletRequestWrapper {

    private final UUID userId;
    private final String userRole;
    private final UUID dealerId;

    public UserIdRequestWrapper(HttpServletRequest request, UUID userId) {
        super(request);
        this.userId = userId;
        this.userRole = null;
        this.dealerId = null;
    }

    public UserIdRequestWrapper(HttpServletRequest request, UUID userId, String userRole) {
        super(request);
        this.userId = userId;
        this.userRole = userRole;
        this.dealerId = null;
    }

    public UserIdRequestWrapper(
            HttpServletRequest request,
            UUID userId,
            String userRole,
            UUID dealerId
    ) {
        super(request);
        this.userId = userId;
        this.userRole = userRole;
        this.dealerId = dealerId;
    }

    @Override
    public String getHeader(String name) {
        if ("X-User-Id".equalsIgnoreCase(name)) {
            return userId != null ? userId.toString() : null;
        }
        if ("X-User-Role".equalsIgnoreCase(name)) {
            return userRole;
        }
        if ("X-Dealer-Id".equalsIgnoreCase(name)) {
            return dealerId != null ? dealerId.toString() : null;
        }
        return super.getHeader(name);
    }

    @Override
    public Enumeration<String> getHeaders(String name) {
        if ("X-User-Id".equalsIgnoreCase(name)) {
            return Collections.enumeration(
                    userId != null ? List.of(userId.toString()) : List.of()
            );
        }
        if ("X-User-Role".equalsIgnoreCase(name)) {
            return Collections.enumeration(
                    userRole != null ? List.of(userRole) : List.of()
            );
        }
        if ("X-Dealer-Id".equalsIgnoreCase(name)) {
            return Collections.enumeration(
                    dealerId != null ? List.of(dealerId.toString()) : List.of()
            );
        }
        return super.getHeaders(name);
    }

    @Override
    public Enumeration<String> getHeaderNames() {
        List<String> headerNames = new ArrayList<>(Collections.list(super.getHeaderNames()));

        boolean existsId = headerNames.stream()
                .anyMatch(n -> "X-User-Id".equalsIgnoreCase(n));
        if (!existsId && userId != null) {
            headerNames.add("X-User-Id");
        }

        boolean existsRole = headerNames.stream()
                .anyMatch(n -> "X-User-Role".equalsIgnoreCase(n));
        if (!existsRole && userRole != null) {
            headerNames.add("X-User-Role");
        }

        boolean existsDealer = headerNames.stream()
                .anyMatch(n -> "X-Dealer-Id".equalsIgnoreCase(n));
        if (!existsDealer && dealerId != null) {
            headerNames.add("X-Dealer-Id");
        }

        return Collections.enumeration(headerNames);
    }
}