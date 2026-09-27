# Automobile Digital Platform — Chronological Changelog

All notable changes to the Automobile Digital Platform are documented here based on codebase audit reports, engineering phases, and verification records.

---

## [Phase 5] — Full-Stack Containerization, Admin Integration & Real-Time Messaging

### Added
- **Real-Time Messaging Service**: Implemented `messaging-service` (Port 8101) with WebSocket STOMP protocol at `/ws`.
- **Chat UI Components**: Added `ChatPanel`, `MessageThread`, `ChatComposer`, `ConversationList`, and unread count badges.
- **Admin Portal Expansion**: Implemented 10 administrative management screens (`/admin/*`) for global oversight over users, roles, permissions, vehicles, dealers, orders, and appointments.
- **Dockerized Frontend Container**: Added multi-stage `Dockerfile` and integrated `frontend` into `docker-compose.yml` on port 3000.
- **Automated Verification Suites**: Added `test_phase5.cjs`, `test_messaging.cjs`, `test_crossrole.cjs`, and `test_onboarding.cjs`.

### Fixed
- **Nginx Stale DNS Resolution**: Configured Docker internal DNS resolver `127.0.0.11` with dynamic variables in `nginx.conf` to eliminate 502 errors when containers restart.
- **WebSocket Gateway Bypass**: Routed `/ws` directly through Nginx to `messaging-service:8101` to overcome WebMVC gateway limitations.
- **Cross-Role Profile Cascading**: Fixed user account deletion to cascade to the customer profile across database boundaries.

---

## [Phase 4] — API Contract Verification & IDOR Security Hardening

### Added
- **Ownership Verification**: Enforced caller tenancy checks on `GET /api/v1/orders/{id}` and `GET /api/appointments/{id}`.
- **Implicit Role Filtering**: Updated `OrdersController.findAllOrders()` and `AppointmentController.findAllAppointments()` to automatically filter records based on injected `X-User-Id` and `X-User-Role`.

### Fixed
- **Order IDOR Vulnerability**: Resolved vulnerability where Customer A could query Customer B's order by ID. Customer lookups now verify customer profile ownership.
- **Cross-Dealer Order Tampering**: Blocked dealers from modifying orders or viewing order lists belonging to other dealerships (`403 Forbidden`).
- **Customer CRM Privacy**: Blocked `CUSTOMER` role from calling bulk `GET /api/v1/customers` with `403 Forbidden`.

### Security
- **Identity Header Stripping**: Implemented `IdentityHeaderStrippingFilter` with highest precedence in `api-gateway` to strip incoming `X-User-Id`, `X-User-Role`, `X-Dealer-Id`, and `X-Internal-Secret`.

---

## [Phase 3] — Backend Capability Alignment & Database Seed Hardening

### Added
- **Customer Order Query Endpoints**: Added `/api/v1/orders/customers/{customerId}` and `/api/appointments/customers/{customerId}`.
- **Dealer Order Query Endpoints**: Added `/api/appointments/dealers/{dealerId}`.
- **Service Types Master Table**: Added `service_types` table in `service_appointment` database to ensure valid workshop booking types.

### Changed
- **Database Seed Scripts**: Updated all `seed.sql` files with verified `$2b$10$` and `$2a$10$` BCrypt hashes compatible with Spring Security's `BCryptPasswordEncoder`. Added `ON CONFLICT DO NOTHING` to ensure persistence across container resets.

### Testing
- **API Matrix Verification**: Successfully verified 200 OK for authorized role calls and 403 Forbidden for unauthorized tenant calls.

---

## [Phase 2] — Frontend-Backend Contract Alignment & UUID Refactoring

### Changed
- **Identifier Type Refactoring**: Converted all identifier types in `Frontend-main/src/types/index.ts` from `number` to `string` (UUID).
- **Mock Data Elimination**: Removed hardcoded `DEMO_USERS` and mock authentication bypasses in `auth.ts`, replacing them with real REST calls to `/api/auth/login`.
- **API Error Handling**: Replaced silent `.catch(() => fallbackToMock)` handlers across pages with genuine error states and notifications.

### Fixed
- **Dealer Route Alignment**: Fixed frontend calling `/api/dealers` to route through Gateway's `/dealers/**` mapping.
- **Dealer Context Resolution**: Resolved `userId != dealerId` by having dealer interfaces query `/dealers/me`.

---

## [Phase 1] — Full-Stack Integration Audit

### Added
- Initial architectural audit documented in [`FULL_STACK_INTEGRATION_AUDIT.md`](FULL_STACK_INTEGRATION_AUDIT.md).
- Identified 8 microservices, Eureka registry, API Gateway, and 8 separate PostgreSQL database containers.
- Identified critical P0 blockers: numeric IDs vs UUIDs, mock data masks, and missing frontend Dockerization.
