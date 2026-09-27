package com.bmwtechworks.apigateway.filter;

import com.bmwtechworks.apigateway.client.UserAuthorizationClient;
import com.bmwtechworks.apigateway.service.AuthorizationService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

public class AuthorizationFilter extends OncePerRequestFilter {

    private final AuthorizationService authorizationService;

    public AuthorizationFilter(
            AuthorizationService authorizationService
    ) {
        this.authorizationService = authorizationService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getRequestURI();
        String method = request.getMethod();

        if (path.startsWith("/api/auth/")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (method.equals("POST") && path.equals("/api/users")) {
            filterChain.doFilter(request, response);
            return;
        }
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        /*
         * The authentication object is never logged. JwtAuthenticationToken
         * carries the raw token as its credentials, so printing it wrote a
         * live bearer token into the container log on every single request,
         * where it is readable by anything that can reach the log sink.
         */
        if (!(authentication instanceof JwtAuthenticationToken jwtAuthentication)) {

            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED
            );

            response.getWriter().write(
                    "Unauthorized"
            );

            return;
        }

        UUID userId;

        try {

            String subject =
                    jwtAuthentication
                            .getToken()
                            .getSubject();

            userId = UUID.fromString(subject);

        } catch (Exception e) {

            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED
            );

            response.getWriter().write(
                    "Invalid user ID in JWT"
            );

            return;
        }

        /*
         * /api/users/me
         */
        if (method.equals("GET") && path.equals("/api/users/me")) {
            filterChain.doFilter(
                    new UserIdRequestWrapper(request, userId),
                    response
            );

            return;
        }

        /*
         * Permission Service
         */
        if (path.startsWith("/api/permissions")) {

            if (!hasRole(request, userId, "ADMIN")) {

                response.setStatus(
                        HttpServletResponse.SC_FORBIDDEN
                );

                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );

                return;
            }

            filterChain.doFilter(request, response);
            return;
        }

        /*
         * Role Service
         */
        if (path.startsWith("/api/roles")) {

            if (!hasRole(request, userId, "ADMIN")) {

                response.setStatus(
                        HttpServletResponse.SC_FORBIDDEN
                );

                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );

                return;
            }

            filterChain.doFilter(request, response);
            return;
        }

        /*
         * User Service
         */
        if (path.startsWith("/api/users")) {

            if (method.equals("PUT")) {

                String userIdPart =
                        path.substring("/api/users/".length());

                try {

                    UUID requestedUserId =
                            UUID.fromString(userIdPart);

                    if (authorizationService.isOwner(
                            userId,
                            requestedUserId
                    )) {

                        filterChain.doFilter(
                                request,
                                response
                        );

                        return;
                    }

                } catch (IllegalArgumentException ignored) {
                }

                if (authorizationService.hasPermission(
                        userId,
                        "UPDATE_USER"
                )) {

                    filterChain.doFilter(
                            request,
                            response
                    );

                    return;
                }

                response.setStatus(
                        HttpServletResponse.SC_FORBIDDEN
                );

                response.getWriter().write(
                        "Access denied: UPDATE_USER permission required"
                );

                return;
            }

            if (method.equals("DELETE")) {

                if (authorizationService.hasPermission(
                        userId,
                        "DELETE_USER"
                )) {

                    filterChain.doFilter(
                            request,
                            response
                    );

                    return;
                }

                response.setStatus(
                        HttpServletResponse.SC_FORBIDDEN
                );

                response.getWriter().write(
                        "Access denied: DELETE_USER permission required"
                );

                return;
            }

            if (method.equals("GET")) {

                if (hasRole(request, userId, "ADMIN")) {

                    filterChain.doFilter(
                            request,
                            response
                    );

                    return;
                }

                response.setStatus(
                        HttpServletResponse.SC_FORBIDDEN
                );

                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );

                return;
            }
        }
        /*
         * Vehicle Service
         */
        if (path.startsWith("/api/vehicles")) {

            // ADMIN can do everything
            if (hasRole(request, userId, "ADMIN")) {
                filterChain.doFilter(request, response);
                return;
            }

            /*
             * CUSTOMER and DEALER can view all vehicles
             */
            if (method.equals("GET")
                    && path.equals("/api/vehicles")) {

                if (hasRole(request, userId, "CUSTOMER") || hasRole(request, userId, "DEALER")) {

                    filterChain.doFilter(request, response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER, DEALER or ADMIN role required"
                );
                return;
            }

            /*
             * CUSTOMER + DEALER can view vehicles by dealer
             */
            if (method.equals("GET")
                    && path.matches("/api/vehicles/dealer/[^/]+")) {

                if (hasRole(request, userId, "CUSTOMER")
                        || hasRole(request, userId, "DEALER")) {

                    filterChain.doFilter(request, response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER or DEALER role required"
                );
                return;
            }

            /*
             * CUSTOMER + DEALER can view a vehicle by ID
             */
            if (method.equals("GET")) {

                if (hasRole(request, userId, "CUSTOMER")
                        || hasRole(request, userId, "DEALER")) {

                    filterChain.doFilter(request, response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER or DEALER role required"
                );
                return;
            }

            /*
             * DEALER can change vehicle status
             */
            if (method.equals("PATCH")
                    && path.matches("/api/vehicles/[^/]+/status")) {

                if (hasRole(request, userId, "DEALER")) {

                    filterChain.doFilter(request, response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            /*
             * POST, PUT and DELETE are ADMIN only
             */
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(
                    "Access denied: ADMIN role required"
            );

            return;
        }
        /*
         * Customer Service
         */
        if (path.startsWith("/api/v1/customers")) {

            /*
             * POST /api/v1/customers
             *
             * Only CUSTOMER can create a customer.
             * ADMIN cannot create a customer.
             */
            if (method.equals("POST")
                    && path.equals("/api/v1/customers")) {

                if (hasRole(request, userId, "CUSTOMER")) {

                    filterChain.doFilter(
                            new UserIdRequestWrapper(request, userId),
                            response
                    );

                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER role required"
                );
                return;
            }
            /*
             * GET ALL CUSTOMERS
             */
            if (method.equals("GET")
                    && path.equals("/api/v1/customers")) {

                if (hasRole(request, userId, "ADMIN") || hasRole(request, userId, "DEALER")) {
                    filterChain.doFilter(request, response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN or DEALER role required"
                );
                return;
            }

            /*
             * GET MY CUSTOMER PROFILE
             *
             * CUSTOMER can access only their own profile.
             */
            if (method.equals("GET")
                    && path.equals("/api/v1/customers/me")) {

                if (hasRole(request, userId, "CUSTOMER")) {

                    filterChain.doFilter(
                            new UserIdRequestWrapper(request, userId),
                            response
                    );

                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER role required"
                );
                return;
            }
            /*
             * ADMIN can do everything EXCEPT POST above.
             */
            if (hasRole(request, userId, "ADMIN")) {
                filterChain.doFilter(request, response);
                return;
            }

            /*
             * GET ALL CUSTOMERS
             *
             * CUSTOMER + DEALER
             */
            /*
             * GET CUSTOMER BY ID
             *
             * CUSTOMER can access only their own customer record.
             * DEALER can view customer records.
             */
            if (method.equals("GET")
                    && path.matches("/api/v1/customers/[^/]+")) {

                if (path.equals("/api/v1/customers/me")) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String customerIdPart =
                        path.substring("/api/v1/customers/".length());

                try {
                    UUID requestedCustomerId =
                            UUID.fromString(customerIdPart);

                    /*
                     * DEALER can view customer records.
                     */
                    if (hasRole(request, userId, "DEALER")) {
                        filterChain.doFilter(request, response);
                        return;
                    }

                    /*
                     * CUSTOMER can view only their own record.
                     */
                    if (hasRole(request, userId, "CUSTOMER")
                            && authorizationService.isOwner(
                            userId,
                            requestedCustomerId)) {

                        filterChain.doFilter(request, response);
                        return;
                    }

                } catch (IllegalArgumentException ignored) {
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: you can only access your own customer profile"
                );
                return;
            }

            /*
             * GET CUSTOMER BY ID
             *
             * CUSTOMER + DEALER
             */
            if (method.equals("GET")
                    && path.matches("/api/v1/customers/[^/]+")) {

                if (hasRole(request, userId, "CUSTOMER")
                        || hasRole(request, userId, "DEALER")) {

                    filterChain.doFilter(request, response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER or DEALER role required"
                );
                return;
            }

            /*
             * PUT CUSTOMER
             *
             * CUSTOMER can update their own customer record.
             */
            if (method.equals("PUT")
                    && path.matches("/api/v1/customers/[^/]+")) {

                String customerIdPart =
                        path.substring("/api/v1/customers/".length());

                try {
                    UUID requestedCustomerId =
                            UUID.fromString(customerIdPart);

                    if (authorizationService.isOwner(
                            userId,
                            requestedCustomerId)) {

                        filterChain.doFilter(request, response);
                        return;
                    }

                } catch (IllegalArgumentException ignored) {
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: you can only update your own customer profile"
                );
                return;
            }

            /*
             * DELETE CUSTOMER
             *
             * ADMIN was already handled above.
             * Everyone else is denied.
             */
            if (method.equals("DELETE")
                    && path.matches("/api/v1/customers/[^/]+")) {

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }

            /*
             * Any other Customer API is denied.
             */
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(
                    "Access denied"
            );
            return;
        }
        /*
         * Order Service
         */
        if (path.startsWith("/api/v1/orders")) {

            /*
             * POST /api/v1/orders
             *
             * Only CUSTOMER can create an order.
             * ADMIN and DEALER cannot create orders.
             */
            if (method.equals("POST")
                    && path.equals("/api/v1/orders")) {

                if (hasRole(request, userId, "CUSTOMER")) {
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, "CUSTOMER"), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER role required"
                );
                return;
            }

            /*
             * ADMIN can do everything except POST above.
             */
            if (hasRole(request, userId, "ADMIN")) {
                filterChain.doFilter(new UserIdRequestWrapper(request, userId, "ADMIN"), response);
                return;
            }

            /*
             * GET ORDERS BY CUSTOMER
             */
            if (method.equals("GET")
                    && path.matches("/api/v1/orders/customers/[^/]+")) {

                if (hasRole(request, userId, "CUSTOMER")) {
                    String customerIdPart = path.substring("/api/v1/orders/customers/".length());
                    try {
                        UUID requestedCustomerId = UUID.fromString(customerIdPart);
                        if (userId.equals(requestedCustomerId)) { // Customer owns this
                            filterChain.doFilter(new UserIdRequestWrapper(request, userId, "CUSTOMER"), response);
                            return;
                        }
                    } catch (IllegalArgumentException ignored) {}
                    
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Access denied: you can only view your own orders");
                    return;
                }
                
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Access denied: CUSTOMER or ADMIN role required");
                return;
            }

            /*
             * GET ALL ORDERS
             *
             * ADMIN is already handled above.
             * CUSTOMER and DEALER will be implicitly filtered
             * by the Order Service.
             */
            if (method.equals("GET")
                    && path.equals("/api/v1/orders")) {
                if (hasRole(request, userId, "CUSTOMER") || hasRole(request, userId, "DEALER")) {
                    String role = hasRole(request, userId, "CUSTOMER") ? "CUSTOMER" : "DEALER";
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, role), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied"
                );
                return;
            }

            /*
             * GET ORDERS BY DEALER
             *
             * DEALER can only access their own dealership's orders.
             * Prevents cross-dealer IDOR.
             */
            if (method.equals("GET")
                    && path.matches("/api/v1/orders/dealers/[^/]+")) {

                if (hasRole(request, userId, "DEALER")) {
                    String dealerIdPart = path.substring("/api/v1/orders/dealers/".length());
                    try {
                        UUID requestedDealerId = UUID.fromString(dealerIdPart);
                        if (authorizationService.isDealerOwner(userId, requestedDealerId)) {
                            filterChain.doFilter(
                                    new UserIdRequestWrapper(request, userId, "DEALER", requestedDealerId),
                                    response
                            );
                            return;
                        }
                    } catch (IllegalArgumentException ignored) {}

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Access denied: you can only view your own dealership's orders");
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            /*
             * GET ORDER BY ID
             *
             * CUSTOMER and DEALER can access an order,
             * but ownership is verified by the Order Service using
             * customerId (userId) or dealerId (X-Dealer-Id).
             */
            if (method.equals("GET")
                    && path.matches("/api/v1/orders/[^/]+")) {

                if (hasRole(request, userId, "CUSTOMER")) {
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, "CUSTOMER"), response);
                    return;
                }

                if (hasRole(request, userId, "DEALER")) {
                    UUID dealerId = authorizationService.getDealerId(userId);
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, "DEALER", dealerId), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER or DEALER role required"
                );
                return;
            }

            /*
             * PUT ORDER
             *
             * ADMIN is already handled above.
             * CUSTOMER and DEALER are denied for now.
             */
            if (method.equals("PUT")
                    && path.matches("/api/v1/orders/[^/]+")) {

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }

            /*
             * DELETE ORDER
             *
             * ADMIN is already handled above.
             */
            if (method.equals("DELETE")
                    && path.matches("/api/v1/orders/[^/]+")) {

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }

            /*
             * Any other Order API is denied.
             */
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(
                    "Access denied"
            );
            return;
        }
        /*
         * Dealer Service
         */
        if (path.startsWith("/dealers")) {

            /*
             * CREATE DEALER
             *
             * ADMIN only. Dealer self-registration is disabled.
             */
            if (method.equals("POST")
                    && path.equals("/dealers")) {

                if (hasRole(request, userId, "ADMIN")) {
                    filterChain.doFilter(
                            new UserIdRequestWrapper(request, userId, "ADMIN"),
                            response
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }
            /*
             * ADMIN can do everything else.
             *
             * The request still has to be wrapped: dealer service reads
             * X-User-Id to resolve the caller, and forwarding the raw request
             * left it with no caller at all (HTTP 500 on /dealers/orders/{id}).
             */
            if (hasRole(request, userId, "ADMIN")) {
                filterChain.doFilter(
                        new UserIdRequestWrapper(request, userId, "ADMIN"),
                        response
                );
                return;
            }

            /*
             * GET MY DEALER DETAILS
             *
             * DEALER only.
             *
             * X-User-Id and X-Dealer-Id are passed to Dealer Service
             * so Dealer Service can find the dealer
             * belonging to the logged-in user.
             */
            if (method.equals("GET")
                    && path.equals("/dealers/me")) {

                if (hasRole(request, userId, "DEALER")) {
                    UUID dealerId = authorizationService.getDealerId(userId);
                    filterChain.doFilter(
                            new UserIdRequestWrapper(request, userId, "DEALER", dealerId),
                            response
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            /*
             * GET MY CUSTOMERS
             *
             * DEALER only. Returns only customers associated with this dealer.
             */
            if (method.equals("GET")
                    && path.equals("/dealers/me/customers")) {

                if (hasRole(request, userId, "DEALER")) {
                    UUID dealerId = authorizationService.getDealerId(userId);
                    filterChain.doFilter(
                            new UserIdRequestWrapper(request, userId, "DEALER", dealerId),
                            response
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            /*
             * GET ALL DEALERS
             *
             * CUSTOMER + DEALER
             */
            if (method.equals("GET")
                    && path.equals("/dealers")) {

                if (hasRole(request, userId, "CUSTOMER")
                        || hasRole(request, userId, "DEALER")) {

                    String role = hasRole(request, userId, "CUSTOMER") ? "CUSTOMER" : "DEALER";
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, role), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER or DEALER role required"
                );
                return;
            }

            /*
             * GET DEALER BY ID
             *
             * CUSTOMER + DEALER
             */
            if (method.equals("GET")
                    && path.matches("/dealers/[^/]+")) {

                if (hasRole(request, userId, "CUSTOMER")
                        || hasRole(request, userId, "DEALER")) {

                    String role = hasRole(request, userId, "CUSTOMER") ? "CUSTOMER" : "DEALER";
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, role), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER or DEALER role required"
                );
                return;
            }

            /*
             * GET DEALERS BY LOCATION
             *
             * CUSTOMER + DEALER
             */
            if (method.equals("GET")
                    && path.startsWith("/dealers/location/")) {

                if (hasRole(request, userId, "CUSTOMER")
                        || hasRole(request, userId, "DEALER")) {

                    String role = hasRole(request, userId, "CUSTOMER") ? "CUSTOMER" : "DEALER";
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, role), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER or DEALER role required"
                );
                return;
            }

            /*
             * GET DEALER VEHICLES
             *
             * CUSTOMER + DEALER.
             * For DEALER role: must be their own dealership. Prevents cross-dealer inventory browsing.
             */
            if (method.equals("GET")
                    && path.matches("/dealers/[^/]+/vehicles")) {

                if (hasRole(request, userId, "DEALER")) {
                    String dealerIdPart = path.substring("/dealers/".length(), path.length() - "/vehicles".length());
                    try {
                        UUID requestedDealerId = UUID.fromString(dealerIdPart);
                        if (authorizationService.isDealerOwner(userId, requestedDealerId)) {
                            filterChain.doFilter(
                                    new UserIdRequestWrapper(request, userId, "DEALER", requestedDealerId),
                                    response
                            );
                            return;
                        }
                    } catch (IllegalArgumentException ignored) {}

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Access denied: you can only view your own dealership's inventory");
                    return;
                }

                if (hasRole(request, userId, "CUSTOMER")) {
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, "CUSTOMER"), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER or DEALER role required"
                );
                return;
            }

            /*
             * GET CUSTOMER FROM DEALER SERVICE
             *
             * DEALER only.
             */
            if (method.equals("GET")
                    && path.matches("/dealers/customer/[^/]+")) {

                if (hasRole(request, userId, "DEALER")) {
                    UUID dealerId = authorizationService.getDealerId(userId);
                    filterChain.doFilter(
                            new UserIdRequestWrapper(request, userId, "DEALER", dealerId),
                            response
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            /*
             * UPDATE ORDER
             *
             * DEALER only.
             */
            if (method.equals("PUT")
                    && path.matches("/dealers/orders/[^/]+")) {

                if (hasRole(request, userId, "DEALER")) {
                    UUID dealerId = authorizationService.getDealerId(userId);
                    filterChain.doFilter(
                            new UserIdRequestWrapper(request, userId, "DEALER", dealerId),
                            response
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            /*
             * GET ORDER
             *
             * DEALER only — must be their own dealership's orders.
             */
            if (method.equals("GET")
                    && path.matches("/dealers/orders/[^/]+")) {

                if (hasRole(request, userId, "DEALER")) {
                    String dealerIdPart = path.substring("/dealers/orders/".length());
                    try {
                        UUID requestedDealerId = UUID.fromString(dealerIdPart);
                        if (authorizationService.isDealerOwner(userId, requestedDealerId)) {
                            filterChain.doFilter(
                                    new UserIdRequestWrapper(request, userId, "DEALER", requestedDealerId),
                                    response
                            );
                            return;
                        }
                    } catch (IllegalArgumentException ignored) {}

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Access denied: you can only view your own dealership's orders");
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            /*
             * PATCH APPOINTMENT STATUS VIA DEALER SERVICE
             *
             * DEALER only — must be appointment for this dealership.
             */
            if (method.equals("PATCH")
                    && path.matches("/dealers/appointments/[^/]+/status")) {

                if (hasRole(request, userId, "DEALER")) {
                    String[] parts = path.split("/");
                    try {
                        UUID appointmentId = UUID.fromString(parts[3]);
                        if (authorizationService.isAppointmentDealer(userId, appointmentId)) {
                            UUID dealerId = authorizationService.getDealerId(userId);
                            filterChain.doFilter(
                                    new UserIdRequestWrapper(request, userId, "DEALER", dealerId),
                                    response
                            );
                            return;
                        }
                    } catch (IllegalArgumentException ignored) {}

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Access denied: appointment does not belong to your dealership");
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            /*
             * UPDATE DEALER
             *
             * ADMIN was already handled above.
             * DEALER and CUSTOMER cannot update dealers.
             */
            if (method.equals("PUT")
                    && path.matches("/dealers/[^/]+")) {

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }

            /*
             * DELETE DEALER
             *
             * ADMIN was already handled above.
             */
            if (method.equals("DELETE")
                    && path.matches("/dealers/[^/]+")) {

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }

            /*
             * Any other Dealer API is denied.
             */
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(
                    "Access denied"
            );
            return;
        }
        // SERVICE APPOINTMENT
        if (path.startsWith("/api/appointments")) {

            // ADMIN can do everything
            if (hasRole(request, userId, "ADMIN")) {
                filterChain.doFilter(new UserIdRequestWrapper(request, userId, "ADMIN"), response);
                return;
            }

            // CREATE APPOINTMENT - CUSTOMER only
            if (method.equals("POST")
                    && path.equals("/api/appointments")) {

                if (hasRole(request, userId, "CUSTOMER")) {
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, "CUSTOMER"), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: CUSTOMER role required"
                );
                return;
            }

            // GET APPOINTMENTS BY CUSTOMER
            if (method.equals("GET")
                    && path.matches("/api/appointments/customers/[^/]+")) {

                if (hasRole(request, userId, "CUSTOMER")) {
                    String customerIdPart = path.substring("/api/appointments/customers/".length());
                    try {
                        UUID requestedCustomerId = UUID.fromString(customerIdPart);
                        if (userId.equals(requestedCustomerId)) { // Customer owns this
                            filterChain.doFilter(new UserIdRequestWrapper(request, userId, "CUSTOMER"), response);
                            return;
                        }
                    } catch (IllegalArgumentException ignored) {}
                    
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Access denied: you can only view your own appointments");
                    return;
                }
                
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Access denied: CUSTOMER or ADMIN role required");
                return;
            }

            // GET APPOINTMENTS BY DEALER
            if (method.equals("GET")
                    && path.matches("/api/appointments/dealers/[^/]+")) {

                if (hasRole(request, userId, "DEALER")) {
                    String dealerIdPart = path.substring("/api/appointments/dealers/".length());
                    try {
                        UUID requestedDealerId = UUID.fromString(dealerIdPart);
                        if (authorizationService.isDealerOwner(userId, requestedDealerId)) { // Dealer owns this
                            filterChain.doFilter(new UserIdRequestWrapper(request, userId, "DEALER", requestedDealerId), response);
                            return;
                        }
                    } catch (IllegalArgumentException ignored) {}
                    
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write("Access denied: you can only view your own dealer appointments");
                    return;
                }
                
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Access denied: DEALER or ADMIN role required");
                return;
            }

            // GET ALL APPOINTMENTS
            if (method.equals("GET")
                    && path.equals("/api/appointments")) {

                if (hasRole(request, userId, "ADMIN") || hasRole(request, userId, "CUSTOMER") || hasRole(request, userId, "DEALER")) {
                    String role = hasRole(request, userId, "ADMIN") ? "ADMIN" : (hasRole(request, userId, "DEALER") ? "DEALER" : "CUSTOMER");
                    UUID dealerId = "DEALER".equals(role) ? authorizationService.getDealerId(userId) : null;
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, role, dealerId), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied"
                );
                return;
            }

            // GET BOOKABLE SERVICE TYPES
            //
            // Must be tested before the "/api/appointments/[^/]+" rule below.
            // That rule parses the segment after /api/appointments/ as a UUID
            // and answers 400 "Invalid appointment ID" when it is not one, so
            // "service-types" was being consumed as a malformed id and this
            // endpoint was unreachable through the gateway — the only way in
            // was to bypass it. The booking form's list of services therefore
            // could not come from the API at all.
            if (method.equals("GET")
                    && path.equals("/api/appointments/service-types")) {

                if (hasRole(request, userId, "ADMIN")
                        || hasRole(request, userId, "CUSTOMER")
                        || hasRole(request, userId, "DEALER")) {
                    String role = hasRole(request, userId, "ADMIN") ? "ADMIN" : (hasRole(request, userId, "DEALER") ? "DEALER" : "CUSTOMER");
                    UUID dealerId = "DEALER".equals(role) ? authorizationService.getDealerId(userId) : null;
                    filterChain.doFilter(new UserIdRequestWrapper(request, userId, role, dealerId), response);
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Access denied");
                return;
            }

            // GET APPOINTMENT BY ID - CUSTOMER own or DEALER own dealer
            if (method.equals("GET")
                    && path.matches("/api/appointments/[^/]+")) {

                UUID appointmentId;

                try {
                    String[] parts = path.split("/");
                    appointmentId = UUID.fromString(parts[3]);
                } catch (Exception e) {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    response.getWriter().write("Invalid appointment ID");
                    return;
                }

                // CUSTOMER can access own appointment
                if (hasRole(request, userId, "CUSTOMER")) {

                    if (authorizationService.isAppointmentCustomer(
                            userId,
                            appointmentId
                    )) {
                        filterChain.doFilter(new UserIdRequestWrapper(request, userId, "CUSTOMER"), response);
                        return;
                    }

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write(
                            "Access denied: appointment does not belong to customer"
                    );
                    return;
                }

                // DEALER can access their dealer appointments
                if (hasRole(request, userId, "DEALER")) {

                    if (authorizationService.isAppointmentDealer(
                            userId,
                            appointmentId
                    )) {
                        filterChain.doFilter(new UserIdRequestWrapper(request, userId, "DEALER"), response);
                        return;
                    }

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write(
                            "Access denied: appointment does not belong to dealer"
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Access denied");
                return;
            }

            // PUT APPOINTMENT - ADMIN only
            if (method.equals("PUT")
                    && path.matches("/api/appointments/[^/]+")) {

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }

            // PATCH SERVICE TYPE - CUSTOMER own or DEALER own dealer
            if (method.equals("PATCH")
                    && path.matches("/api/appointments/[^/]+/service-type")) {

                UUID appointmentId;

                try {
                    String[] parts = path.split("/");
                    appointmentId = UUID.fromString(parts[3]);
                } catch (Exception e) {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    response.getWriter().write("Invalid appointment ID");
                    return;
                }

                // CUSTOMER can update own appointment service type
                if (hasRole(request, userId, "CUSTOMER")) {

                    if (authorizationService.isAppointmentCustomer(
                            userId,
                            appointmentId
                    )) {
                        filterChain.doFilter(request, response);
                        return;
                    }

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write(
                            "Access denied: appointment does not belong to customer"
                    );
                    return;
                }

                // DEALER can update their dealer appointment service type
                if (hasRole(request, userId, "DEALER")) {

                    if (authorizationService.isAppointmentDealer(
                            userId,
                            appointmentId
                    )) {
                        filterChain.doFilter(request, response);
                        return;
                    }

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write(
                            "Access denied: appointment does not belong to dealer"
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write("Access denied");
                return;
            }

            // PATCH STATUS - DEALER only
            if (method.equals("PATCH")
                    && path.matches("/api/appointments/[^/]+/status")) {

                UUID appointmentId;

                try {
                    String[] parts = path.split("/");
                    appointmentId = UUID.fromString(parts[3]);
                } catch (Exception e) {
                    response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
                    response.getWriter().write("Invalid appointment ID");
                    return;
                }

                // DEALER can update status for their dealer appointment
                if (hasRole(request, userId, "DEALER")) {

                    if (authorizationService.isAppointmentDealer(
                            userId,
                            appointmentId
                    )) {
                        UUID dealerId = authorizationService.getDealerId(userId);
                        filterChain.doFilter(new UserIdRequestWrapper(request, userId, "DEALER", dealerId), response);
                        return;
                    }

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.getWriter().write(
                            "Access denied: appointment does not belong to dealer"
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: DEALER role required"
                );
                return;
            }

            // DELETE APPOINTMENT - ADMIN only
            if (method.equals("DELETE")
                    && path.matches("/api/appointments/[^/]+")) {

                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }

            // Any other appointment API is denied
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write("Access denied");
            return;
        }

        /*
         * Messaging Service
         *
         * Any authenticated ADMIN, DEALER or CUSTOMER may use the messaging
         * APIs. Participant membership, ownership and IDOR protection are
         * enforced inside the messaging-service itself from the passed
         * X-User-Id / X-User-Role headers.
         */
        if (path.startsWith("/api/messages")) {

            UserAuthorizationClient.AuthorizationResponse authorization =
                    authorizationFor(request, userId);

            String role = authorization.role();

            // Deleting a conversation is the one messaging operation that is not
            // a participant operation: a thread is a shared record, so erasing it
            // must not be at the discretion of either side. Enforced here as well
            // as in the messaging service, so the rule is visible at the edge
            // and does not depend on a downstream check holding.
            boolean isConversationDelete =
                    "DELETE".equalsIgnoreCase(request.getMethod())
                            && path.startsWith("/api/messages/conversations");

            if (isConversationDelete && !"ADMIN".equals(role)) {
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                        "Access denied: ADMIN role required"
                );
                return;
            }

            if ("ADMIN".equals(role)
                    || "DEALER".equals(role)
                    || "CUSTOMER".equals(role)) {

                filterChain.doFilter(
                        new UserIdRequestWrapper(request, userId, role),
                        response
                );
                return;
            }

            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.getWriter().write(
                    "Access denied: ADMIN, DEALER or CUSTOMER role required"
            );
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Cached per request so a single call does not hit user-role-service once
     * for every role that is tested. A request like
     * {@code PATCH /dealers/appointments/{id}/status} checks the role and then
     * asks twice more, which used to mean four identical database round-trips.
     */
    private static final String AUTHORIZATION_CACHE_ATTRIBUTE =
            "gateway.resolvedUserAuthorization";

    private boolean hasRole(
            HttpServletRequest request,
            UUID userId,
            String requiredRole
    ) {

        UserAuthorizationClient.AuthorizationResponse authorization =
                authorizationFor(request, userId);

        return requiredRole.equals(
                authorization.role()
        );
    }

    private UserAuthorizationClient.AuthorizationResponse authorizationFor(
            HttpServletRequest request,
            UUID userId
    ) {

        Object cached = request.getAttribute(
                AUTHORIZATION_CACHE_ATTRIBUTE
        );

        if (cached instanceof
                UserAuthorizationClient.AuthorizationResponse response) {
            return response;
        }

        UserAuthorizationClient.AuthorizationResponse resolved =
                authorizationService.getUserAuthorization(userId);

        request.setAttribute(
                AUTHORIZATION_CACHE_ATTRIBUTE,
                resolved
        );

        return resolved;
    }
}