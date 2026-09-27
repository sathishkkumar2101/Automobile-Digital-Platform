# Automobile Digital Platform — Team Handoff

## Current Status

| Area | Status |
|---|---|
| Customer authentication | ✅ Complete |
| Customer portal | ✅ Complete |
| Customer purchase/orders | ✅ Complete |
| Customer appointments/profile | ✅ Complete |
| Dealer authentication | ✅ Complete |
| Dealer dashboard/inventory | ✅ Complete |
| Dealer orders/customers/appointments | ✅ Complete |
| Dealer data isolation / IDOR testing | ✅ Verified |
| Dockerized full stack | ✅ Working |
| Admin portal | 🚧 Next |
| Final integration | ⏳ Pending |
| Production hardening | ⏳ Pending |

**Customer and Dealer modules are frozen.** Do not rewrite them while implementing Admin unless a genuine regression/shared-infrastructure issue is found.

## Stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, React Router, Nginx
- Backend: Java, Spring Boot, Spring Security, JPA, Maven, microservices
- Database: PostgreSQL
- Infrastructure: Docker, Docker Compose, Eureka, API Gateway, Feign

## Services

| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 8080 | Entry point/routing/security context |
| Eureka | 8761 | Service discovery |
| Customer | 8081 | Customer domain |
| Order | 8082 | Orders |
| Dealer | 8083 | Dealers/dealer operations |
| Vehicle | 8084 | Vehicles |
| Permission | 8091 | Permissions |
| User/Role | 8092 | Users and roles |
| Appointment | 8100 | Appointments |

Frontend: `http://localhost:3000`

## Run

```bash
docker compose up -d --build
```

Fresh reset:

```bash
docker compose down -v
docker compose up -d --build
```

## Authentication

Login:

```text
POST /api/auth/login
```

Authenticated requests use:

```text
Authorization: Bearer <JWT>
```

Important: **userId is not dealerId**. Dealer flows must resolve the dealer using `/dealers/me` rather than assuming the IDs match.

## Customer — Completed

- Registration/login
- JWT authentication
- Customer dashboard
- 25-vehicle catalog with filters
- Vehicle details
- Dealer selection
- Purchase/order creation
- My Orders
- Appointments
- Profile
- Real API data
- INR pricing
- Local BMW vehicle images

Customer workflow is working and should be regression-tested after shared changes.

## Dealer — Completed

Exactly five dealers:

| Dealer | Email | Password |
|---|---|---|
| Chennai | dealer1@bmwtechworks.com | Dealer@123 |
| Bangalore | dealer2@bmwtechworks.com | Dealer@123 |
| Hyderabad | dealer3@bmwtechworks.com | Dealer@123 |
| Mumbai | dealer4@bmwtechworks.com | Dealer@123 |
| Delhi | dealer5@bmwtechworks.com | Dealer@123 |

Development/test credentials only.

Dealer pages:

- Dashboard
- Inventory
- Orders
- Customers
- Appointments/Service
- Profile

Each dealer can access only their own inventory, orders, customers and appointments.

Final verification included **7/7 IDOR scenarios blocked with 403**, cross-dealer order update protection, cross-dealer appointment protection, self-registration protection, and invalid-login handling.

## Important Status Values

Orders:

```text
CREATED
CONFIRMED
IN_PRODUCTION
SHIPPED
DELIVERED
CANCELLED
```

Appointments:

```text
REQUESTED
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

Do not create inconsistent frontend-only status names.

## Main API Inventory

### Users

```text
GET    /api/users
GET    /api/users/me
GET    /api/users/{id}
GET    /api/users/username/{username}
POST   /api/users
PUT    /api/users/{id}
DELETE /api/users/{id}
```

### Roles

```text
GET    /api/roles
GET    /api/roles/{id}
POST   /api/roles
PUT    /api/roles/{id}
DELETE /api/roles/{id}
```

### Permissions

```text
GET    /api/permissions
GET    /api/permissions/{id}
POST   /api/permissions
PUT    /api/permissions/{id}
DELETE /api/permissions/{id}
```

### Vehicles

```text
POST   /api/vehicles
GET    /api/vehicles
GET    /api/vehicles/{vehicleId}
GET    /api/vehicles/dealer/{dealerId}
GET    /api/vehicles/available
PUT    /api/vehicles/{vehicleId}
PATCH  /api/vehicles/{vehicleId}/status
DELETE /api/vehicles/{vehicleId}
```

### Customers

```text
GET    /api/v1/customers
GET    /api/v1/customers/{id}
POST   /api/v1/customers
PUT    /api/v1/customers/{id}
DELETE /api/v1/customers/{id}
```

### Orders

```text
GET    /api/v1/orders
GET    /api/v1/orders/{id}
GET    /api/v1/orders/dealers/{dealerId}
POST   /api/v1/orders
PUT    /api/v1/orders/{id}
DELETE /api/v1/orders/{id}
GET    /api/v1/orders/customers/{customerId}
```

### Appointments

```text
POST   /api/appointments
GET    /api/appointments
GET    /api/appointments/{id}
PATCH  /api/appointments/{id}/service-type
PATCH  /api/appointments/{id}/status
DELETE /api/appointments/{id}
GET    /api/appointments/customers/{customerId}
GET    /api/appointments/dealers/{dealerId}
```

Also inspect the current gateway/controllers before relying on exact authorization semantics or adding duplicate endpoints.

## Admin — Remaining Work

Expected Admin areas:

1. Admin authentication
2. Dashboard
3. User management
4. Customer management
5. Dealer management
6. Vehicle management
7. Order management
8. Appointment management
9. Role management
10. Permission management
11. Admin profile

Admin must use real backend data. Avoid fake metrics/mock fallbacks.

### Admin security

- Backend must enforce ADMIN authorization.
- CUSTOMER/DEALER must not access Admin APIs.
- Prevent role escalation.
- Never trust `userId`, `dealerId`, `customerId`, `orderId`, etc. from the frontend without server-side authorization.
- Preserve existing Dealer and Customer isolation.

### Dealer rules

Dealers do not self-register. Admin manages dealers.

### Admin dashboard

Use real metrics such as users, customers, dealers, vehicles, orders, appointments, etc. Only show revenue if calculated from trustworthy backend data.

## Recommended First Steps for Admin Developer

Do not immediately code.

First inspect:

```text
docker-compose.yml
Frontend/
services/
gateway configuration
security configuration
User/Role service
Permission service
database migrations
seed data
existing Admin routes/components
```

Answer:

1. How is ADMIN represented?
2. How is ADMIN determined during login?
3. Where is role authorization enforced?
4. Which Admin APIs already exist?
5. Which APIs are missing?
6. What entities/relationships already support Admin?
7. Which Admin UI is already present?
8. Which parts are mock-only?
9. Which shared components can be reused?
10. What changes could regress Customer/Dealer?

## Parallel Git Workflow

Do not work directly on `main`.

```bash
git pull
git checkout -b feature/admin-<name>
```

Commit focused changes:

```bash
git add .
git commit -m "Implement admin user management"
git push origin feature/admin-<name>
```

When comparing two parallel Admin implementations, evaluate functional completeness, backend authorization, IDOR protection, real API integration, UI consistency, error handling, type safety, tests/build, and Customer/Dealer regression.

## Final Acceptance

Admin is complete only when:

- Admin login works
- unauthorized roles cannot access Admin
- dashboard uses real data
- user/customer/dealer/vehicle/order/appointment/permission management works
- role escalation is prevented
- Customer workflow still works
- all five Dealer logins still work
- Dealer isolation still works
- frontend build and TypeScript checks pass
- backend compilation/tests pass
- clean Docker rebuild passes

## Golden Rule

**Build Admin around the existing application. Do not rebuild the application around Admin.**
