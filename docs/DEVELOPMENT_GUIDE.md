# Automobile Digital Platform — Developer Guide

This guide is intended for new engineers joining the team to understand the codebase structure, setup workflows, coding standards, and procedures for extending the platform.

---

## 1. Repository Structure

```
vechicle-platform-feature-frontend-backend-integration/
├── docs/                                  # Complete Technical & Architectural Documentation
│   ├── ARCHITECTURE.md                    # Detailed microservices & security architecture
│   ├── API_DOCUMENTATION.md               # Complete REST & WebSocket API specification
│   ├── DATABASE_DESIGN.md                 # Schemas for all 8 PostgreSQL databases
│   ├── SECURITY.md                        # IDOR hardening, header sanitization, JWT rules
│   ├── DEPLOYMENT.md                      # Docker Compose runbook & healthchecks
│   ├── TESTING.md                         # Test suites, matrices, verification commands
│   ├── USER_GUIDE.md                      # End-to-end workflows for Customer, Dealer, Admin
│   ├── DEVELOPMENT_GUIDE.md               # Developer onboarding and extension guide
│   ├── TROUBLESHOOTING.md                 # Real solutions for Docker, Nginx, Eureka issues
│   ├── CHANGELOG.md                       # Phase 1 to Phase 5 chronological history
│   └── PROJECT_REPORT.md                  # Comprehensive academic/trainer project report
│
├── Frontend-main/                         # React 19 Frontend Application
│   ├── src/
│   │   ├── components/                    # Reusable UI & chat components (ChatPanel, MessageThread)
│   │   ├── contexts/                      # React Context (AuthContext for JWT state)
│   │   ├── hooks/                         # Custom hooks (e.g. useLoadFailures)
│   │   ├── lib/                           # API clients, axios/fetch wrappers, WebSocket client
│   │   ├── pages/                         # Role-scoped views (admin/, customer/, dealer/, auth/)
│   │   ├── router/                        # React Router 7 config with AuthGuard & RoleGuard
│   │   └── types/                         # TypeScript interfaces (UUID string IDs, DTO mappings)
│   ├── nginx.conf                         # Ingress proxy, dynamic Docker DNS, SPA rewrite, WS
│   ├── Dockerfile                         # Multi-stage production build (Node 22 -> Nginx alpine)
│   ├── test_crossrole.cjs                 # E2E cross-role test suite
│   ├── test_messaging.cjs                 # WebSocket STOMP test suite
│   ├── test_phase4.cjs                    # Integration contract test suite
│   ├── test_phase5.cjs                    # Regression & IDOR test suite
│   ├── test_onboarding.cjs                # Customer profile creation test suite
│   └── package.json                       # Scripts, dependencies (React 19, Tailwind v4, Vite 8)
│
└── Vehicle-Platform-Development-Backend/  # Java 21 / Spring Boot Microservices
    ├── api-gateway/                       # Spring Cloud Gateway WebMVC (:8080)
    ├── eureka-server/                     # Netflix Eureka Service Discovery (:8761)
    ├── customer/                          # Customer domain service (:8081)
    ├── order/                             # Order processing & state machine (:8082)
    ├── dealer/                            # Dealership & inventory operations (:8083)
    ├── vehicle/                           # Master vehicle catalog & VIN tracking (:8084)
    ├── permission-service/                # Fine-grained RBAC permissions (:8091)
    ├── user-role-service/                 # Identity, BCrypt auth, JWT minting (:8092)
    ├── service-appointment/               # Workshop service scheduling (:8100)
    ├── messaging/                         # Real-time STOMP messaging & threads (:8101)
    ├── docker-compose.yml                 # 19 containers, 8 DB volumes, bridge network
    └── .env.example                       # Environment secret templates
```

---

## 2. Core Architectural Principles

When writing or modifying code in this repository, observe the following non-negotiable principles:

1. **UUID Identifier Standard**: All primary keys, foreign keys, and identifier references in backend models and frontend TypeScript types must be `UUID` strings (`java.util.UUID` in Java, `string` in TypeScript). Never use numeric IDs.
2. **`userId != dealerId != customerId`**:
   - `users.id`: The login account identifier.
   - `customers.id`: The customer profile entity identifier.
   - `dealer.dealerId`: The regional dealership facility identifier.
   - Always resolve profiles via dedicated endpoints (e.g. `/dealers/me`, `/api/v1/customers/me`) rather than assuming IDs match.
3. **Never Trust Client-Supplied Identity**: Always inspect the Gateway-injected headers (`X-User-Id`, `X-User-Role`, `X-Dealer-Id`) to authenticate ownership and enforce tenant isolation.
4. **Never Log Sensitive Credentials**: Do not log raw JWT tokens, user passwords, or internal secret keys to console or log aggregators.
5. **Idempotent Database Seeds**: Database seed scripts (`seed.sql`) must use `ON CONFLICT (id) DO NOTHING` or `ON CONFLICT DO UPDATE` so that container restarts remain idempotent.

---

## 3. How-To Guides for Common Development Tasks

### 3.1 Adding a New Backend Microservice

1. **Initialize Spring Boot Project**:
   - Create a new directory under `Vehicle-Platform-Development-Backend/<service-name>`.
   - Configure `pom.xml` with `java.version` 21, Spring Boot parent `4.1.1` (or `3.x`), `spring-cloud-starter-netflix-eureka-client`, and `spring-boot-starter-data-jpa`.
2. **Configure Database & Eureka in `application.properties`**:
   ```properties
   spring.application.name=<service-name>
   server.port=<port>
   spring.datasource.url=jdbc:postgresql://postgres-<service-name>:5432/<db_name>
   spring.datasource.username=postgres
   spring.datasource.password=postgres
   spring.jpa.hibernate.ddl-auto=update
   eureka.client.service-url.defaultZone=http://eureka-server:8761/eureka/
   ```
3. **Add Database and Service to `docker-compose.yml`**:
   - Define `postgres-<service-name>` with port and named volume.
   - Define `<service-name>` with `depends_on: postgres-<service-name>`.
4. **Register Route in `api-gateway`**:
   - Add route definition to `api-gateway/src/main/resources/application.properties`.
   - Update `AuthorizationFilter.java` if the endpoint requires specific RBAC rules.

---

### 3.2 Adding a New Frontend Page

1. **Create Page Component**:
   - Add `src/pages/<role>/<PageName>.tsx`.
2. **Register in `src/router/index.tsx`**:
   - Use `React.lazy()` to lazy-load the page.
   - Add child route under the appropriate `<RoleGuard>` block (`/customer`, `/dealer`, or `/admin`).
3. **Add Navigation Link**:
   - Update the respective layout sidebar (`CustomerLayout.tsx`, `DealerLayout.tsx`, or `AdminLayout.tsx`).
4. **Type-Check**:
   - Run `npm run typecheck` (`tsc --noEmit`) to verify zero TypeScript errors.

---

### 3.3 Adding a Database Field Migration

1. Add the field to the JPA `@Entity` class with appropriate JPA annotations.
2. Because `spring.jpa.hibernate.ddl-auto=update` is enabled, Hibernate will alter the table on container start.
3. If the field is required for seeded records, add the field to `src/main/resources/seed.sql` with an idempotent fallback.
4. Verify by running `docker compose up -d --build <service-name>`.
