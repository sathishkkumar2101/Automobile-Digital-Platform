# Automobile Digital Platform — Testing Strategy & Verification Report

## 1. Testing Philosophy & Multi-Tier Strategy

The platform employs a multi-tiered verification strategy designed to ensure contract integrity between the React 19 frontend and Spring Boot microservices, enforce data isolation between tenants, and prevent security regressions.

```
       +---------------------------------------------+
       |           End-to-End API Integration        |
       |  (test_phase4, test_phase5, test_crossrole) |
       +----------------------+----------------------+
                              |
       +----------------------+----------------------+
       |           Security & IDOR Regression        |
       |  (Tenant Isolation & Header Spoofing Tests) |
       +----------------------+----------------------+
                              |
       +----------------------+----------------------+
       |        Real-Time WebSocket Protocol         |
       |     (test_messaging.cjs via STOMP / WS)     |
       +----------------------+----------------------+
                              |
       +----------------------+----------------------+
       |          Static Typecheck & Build           |
       |   (TypeScript tsc --noEmit & Vite Build)    |
       +---------------------------------------------+
```

---

## 2. Test Suite Inventory

All automated integration test suites are written in Node.js (CommonJS) and located in `Frontend-main/`:

| Test Script | Target Interface | Primary Verification Focus |
| :--- | :--- | :--- |
| `test_phase4.cjs` | Port 3000 (Nginx) | Frontend SPA routes, authentication, basic IDOR regression, user profiles |
| `test_phase5.cjs` | Port 3000 (Nginx) | Self-registration, role escalation block, order creation, customer update, cascade cleanup |
| `test_crossrole.cjs` | Port 8080 (Gateway) | Cross-role data consistency (Customer &rarr; Dealer &rarr; Admin), appointment account ID vs profile ID |
| `test_messaging.cjs` | Port 8080 & Port 8101 | WebSocket STOMP handshake, thread creation, real-time message delivery, read receipts, teardown |
| `test_onboarding.cjs` | Port 8080 (Gateway) | Customer profile creation workflow, duplicate profile handling, address persistence |
| `purge_test_conversations.cjs`| Port 8080 (Gateway) | Maintenance utility to clean throwaway test threads and prevent DB bloat |

---

## 3. How to Run the Tests

Ensure the full stack is running (`docker compose up -d`).

### 3.1 Run All Integration & Security Tests
From the `Frontend-main` directory:
```bash
npm run test:api
```
*Executes sequentially: `test_messaging.cjs`, `test_crossrole.cjs`, `test_phase4.cjs`, `test_phase5.cjs`, and `test_onboarding.cjs`.*

### 3.2 Run Real-Time Messaging Suite Only
```bash
npm run test:api:messaging
```

### 3.3 TypeScript Static Type Check
```bash
npm run typecheck
```
*(Executes `tsc --noEmit` to verify type safety across all 30 React pages, components, and contexts).*

### 3.4 Production Frontend Build Verification
```bash
npm run build
```
*(Executes `vite build` into `dist/` to verify bundling without errors).*

---

## 4. Test Verification Matrix

The following test matrix documents actual automated verification scenarios executed across the platform:

| Category | Test Scenario | Execution Details | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Routing** | Nginx SPA Fallback | `GET /`, `GET /login`, `GET /customer/dashboard` | 200 OK returning `index.html` | 200 OK with `<div id="root">` | **PASS** |
| **Auth** | Admin Login | `POST /api/auth/login` (`admin@bmwtechworks.com`) | 200 OK + JWT Token | 200 OK + Valid Bearer JWT | **PASS** |
| **Auth** | Customer Login | `POST /api/auth/login` (`customer1@bmwtechworks.com`) | 200 OK + JWT Token | 200 OK + Valid Bearer JWT | **PASS** |
| **Auth** | Dealer Login | `POST /api/auth/login` (`dealer1@bmwtechworks.com`) | 200 OK + JWT Token | 200 OK + Valid Bearer JWT | **PASS** |
| **Auth** | Bad Credentials | `POST /api/auth/login` with bad password | 401 Unauthorized | 401 Unauthorized | **PASS** |
| **Security** | Privilege Escalation | `POST /api/users` with `"role": "ADMIN"` (Anonymous) | 403 Forbidden / No Admin created | 403 Forbidden | **PASS** |
| **Security** | Header Spoofing | Client sends `X-User-Id` / `X-Internal-Secret` | Gateway strips headers | Stripped by `IdentityHeaderStrippingFilter` | **PASS** |
| **IDOR** | Order Scoping | Dealer calls `GET /api/v1/orders` directly | 403 Forbidden | 403 Forbidden | **PASS** |
| **IDOR** | Cross-Customer Order | Customer A calls `GET /api/v1/orders/{order_B}` | 403 Forbidden | 403 Forbidden | **PASS** |
| **IDOR** | Cross-Customer Appt | Customer A calls `GET /api/appointments/{appt_B}` | 403 Forbidden | 403 Forbidden | **PASS** |
| **IDOR** | Cross-Dealer Orders | Dealer A calls `GET /dealers/orders/{dealer_B}` | 403 Forbidden | 403 Forbidden | **PASS** |
| **Domain** | Dealer Identity | Dealer calls `GET /dealers/me` | Returns Dealer with matching `userId` | Resolves dealer object | **PASS** |
| **Catalog** | Public Catalog | `GET /api/vehicles` | Returns 25 BMW vehicles | 200 OK with 25 records | **PASS** |
| **Orders** | Place Order | `POST /api/v1/orders` (Valid Customer Profile) | 200 OK + Order created | Order placed in `CREATED` status | **PASS** |
| **Messaging**| STOMP Connection | Connect to `/ws?token=<JWT>` | STOMP CONNECTED frame | Successfully connected | **PASS** |
| **Messaging**| Message Delivery | Send message to `/app/chat.send` | Delivered to `/user/queue/messages` | Message delivered and persisted | **PASS** |
| **Messaging**| Read Receipt | Send read frame to `/app/chat.read` | Delivered to `/user/queue/read` | Read receipt received by sender | **PASS** |
| **Cleanup** | Cascade Account Delete| Admin deletes test user | Deletes account & cascades customer | No orphaned profile left | **PASS** |

---

## 5. Performance & Load Benchmark Statement

> **Formal Benchmark Notice**:
> No formal load/performance benchmark or stress testing (such as Apache JMeter, Gatling, or k6 load simulations) was conducted on this platform during this training phase.
>
> Architectural scalability is analyzed based on:
> - Stateless microservice instances capable of horizontal scaling behind Spring Cloud Gateway.
> - PostgreSQL database connection pooling and independent I/O isolation.
> - Asynchronous event dispatch for WebSocket STOMP messaging.
