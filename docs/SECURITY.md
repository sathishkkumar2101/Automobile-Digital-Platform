# Automobile Digital Platform — Security Architecture & Hardening Report

## 1. Security Overview

The **Automobile Digital Platform** implements defense-in-depth across the ingress, gateway, microservice, and database layers. Security controls are enforced programmatically rather than relying purely on perimeter firewalls.

```
       [ External Untrusted Traffic ]
                     |
                     v
   [ 1. Ingress Header Sanitization ]  <-- IdentityHeaderStrippingFilter
                     |
                     v
   [ 2. Edge Authentication & RBAC ]  <-- AuthorizationFilter & JWT Validator
                     |
                     v
   [ 3. Downstream Identity Context ] <-- Injected X-User-Id, X-User-Role, X-Dealer-Id
                     |
                     v
   [ 4. Domain & IDOR Verification ]  <-- Microservice Ownership Checks
```

---

## 2. Authentication Architecture

### 2.1 Password Hashing
- **Algorithm**: BCrypt (`$2a$10$` and `$2b$10$` standard variants) with a cost factor of 10.
- Implemented via Spring Security's `BCryptPasswordEncoder`. Plaintext passwords are never logged, stored, or returned in API responses.

### 2.2 JWT (JSON Web Token) Token Minting & Verification
- **Signing Algorithm**: HMAC-SHA256 using a minimum 32-character secret (`JWT_SECRET`).
- **Token Claims**:
  - `sub`: User UUID string (e.g. `6683e0c9-cf0e-4963-acae-12020540b8ba`)
  - `iss`: Issuer pinned to `bmw-vehicle-platform`
  - `aud`: Audience pinned to `bmw-vehicle-platform-api`
  - `exp`: Token expiration timestamp
- **Secret Distribution**: `JWT_SECRET` is passed exclusively through environment variables (`docker-compose.yml` reading from `.env`). It is not committed to source control.
- **Microservices Verification**: Both the API Gateway and resource servers (`user-role-service`, `messaging`) independently validate the cryptographic signature, expiration, and issuer/audience claims.

---

## 3. Defense Against Identity Forgery: Header Stripping

The platform uses trusted HTTP headers (`X-User-Id`, `X-User-Role`, `X-Dealer-Id`, and `X-Internal-Secret`) for high-performance downstream identity propagation between the Gateway and microservices.

### The Attack Vector:
If an external client sends `X-User-Id: <victim-uuid>` directly in their HTTP request, naive gateway implementations might forward that header downstream, allowing full identity spoofing.

### The Implementation (`IdentityHeaderStrippingFilter.java`):
The gateway registers an `IdentityHeaderStrippingFilter` with `@Order(Ordered.HIGHEST_PRECEDENCE)`.
```java
private static final List<String> TRUSTED_HEADERS = List.of(
        "x-user-id",
        "x-user-role",
        "x-dealer-id",
        "x-internal-secret"
);
```
- Every incoming HTTP request is wrapped in a `HeaderHidingRequestWrapper`.
- Any external occurrence of these headers is suppressed before any downstream filter, router, or gateway logic executes.
- Only the Gateway's own `AuthorizationFilter` can append genuine `X-User-*` headers based on a verified JWT.

---

## 4. Insecure Direct Object Reference (IDOR) Hardening

### 4.1 Customer Ownership Verification
- **Vulnerability Scenario**: An attacker signs in as Customer A and executes `GET /api/v1/orders/{orderId_of_customer_B}`.
- **Platform Defense**:
  - The Gateway injects the authenticated `X-User-Id` and `X-User-Role`.
  - The `order-service` retrieves the order and verifies that `order.getCustomerId()` matches the caller's customer profile ID associated with that `X-User-Id`.
  - If they do not match, the service aborts and returns `403 Forbidden`.
  - Verified across 7 test suites: Customer A attempting to inspect Customer B's order or appointment always receives `403 Forbidden`.

### 4.2 Cross-Dealer Isolation
- **Vulnerability Scenario**: Dealer 1 (Chennai) attempts to view or modify Dealer 2's (Bangalore) orders via `GET /dealers/orders/{dealer2_id}` or `PUT /dealers/orders/{dealer2_orderId}`.
- **Platform Defense**:
  - The Gateway and `dealer-service` enforce that requests to `/dealers/orders/{dealerId}` match the dealer ID resolved for that authenticated user.
  - Cross-dealer access is refused with `403 Forbidden`.
  - Inventory updates and appointment status updates check dealership tenancy before writing changes to the database.

---

## 5. Privilege Escalation Prevention

### Public Self-Registration Protection (`POST /api/users`):
- Any user can register an account through the public portal.
- If a malicious actor sends:
  ```json
  {
    "username": "attacker",
    "email": "attacker@example.com",
    "password": "Password@123",
    "role": "ADMIN"
  }
  ```
- **Defense Mechanism**: The registration endpoint verifies the security context. If the request is unauthenticated, the system rejects requests requesting `ADMIN` or `DEALER` with `403 Forbidden`, or forces the persisted role to `CUSTOMER`.
- Only authenticated `ADMIN` users can create new `DEALER` or `ADMIN` accounts.

---

## 6. Internal Service Communication Security

Microservices expose internal management endpoints (e.g. `GET /api/internal/users/{userId}`) required for inter-service coordination.
- **Defense Mechanism**:
  1. Internal paths are not mapped in Spring Cloud Gateway routes, making them completely unreachable from the external Internet.
  2. Services that call these routes (`messaging-service` &rarr; `user-role-service`) present the header `X-Internal-Secret: ${INTERNAL_SERVICE_SECRET}`.
  3. The `IdentityHeaderStrippingFilter` ensures no external client can smuggle `X-Internal-Secret` through the Gateway.

---

## 7. Concrete Attack Scenarios & Resolution Matrix

| Attack Scenario | Attacker Action | System Defense | Observed Status |
| :--- | :--- | :--- | :--- |
| **Spoofed User Header** | Sends `X-User-Id: admin-id` from Postman | `IdentityHeaderStrippingFilter` strips header at gateway entry | **Blocked (Stripped)** |
| **Tampered JWT Payload** | Modifies JWT payload role to `ADMIN` | Gateway signature verification fails HMAC-SHA256 check | **401 Unauthorized** |
| **Customer IDOR on Order** | Customer A queries `GET /api/v1/orders/{order_B}` | `OrdersController` validates caller ownership against order `customerId` | **403 Forbidden** |
| **Customer IDOR on Appt** | Customer A queries `GET /api/appointments/{appt_B}` | Gateway `AuthorizationFilter` verifies `isAppointmentCustomer` | **403 Forbidden** |
| **Cross-Dealer Order Tampering** | Dealer 1 attempts `PUT /dealers/orders/{dealer2_order}` | `DealerService` verifies order tenancy against caller's dealer ID | **403 Forbidden** |
| **Admin Escalation on Signup** | Anonymous sends `POST /api/users` with `"role": "ADMIN"` | User service rejects unauthenticated non-customer role creation | **403 Forbidden** |
| **Unauthorized CRM Harvest** | Customer calls `GET /api/v1/customers` | Gateway blocks with `403 Forbidden` (`DEALER` or `ADMIN` required) | **403 Forbidden** |

---

## 8. Security Limitations & Production Hardening Roadmap

| Area | Current Implementation (Development/Training) | Production Hardening Recommendation |
| :--- | :--- | :--- |
| **Transport Layer** | HTTP between client and Nginx, plain HTTP internally | Enforce HTTPS/TLS at Ingress with Let's Encrypt / ACM certificates |
| **Secrets Storage** | Stored in local `.env` and injected via Docker Compose | Migrate to AWS Secrets Manager, HashiCorp Vault, or Kubernetes Secrets |
| **Rate Limiting** | Gateway filters permit standard traffic | Implement Redis-backed token bucket rate limiting at API Gateway |
| **Token Invalidation** | Stateless JWT expiry | Introduce Redis-based token revocation / blacklist for instant logout |
| **Network Isolation** | Single Docker bridge network (`vehicle-platform-network`) | Implement dual-tier networks: DMZ for Ingress, private tier for DBs |
