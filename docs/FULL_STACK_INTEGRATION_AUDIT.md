# Automobile Digital Platform
## Full-Stack Integration Audit

### 1. Executive Summary
The Automobile Digital Platform consists of a React/TypeScript frontend and a Spring Boot microservices backend. The backend architecture is robust, utilizing API Gateway, Eureka for service discovery, and separate PostgreSQL databases for each service. However, the system is currently disconnected, with the frontend relying heavily on mock data, hardcoded authentication bypasses, and type definitions that do not match the backend DTOs (specifically around UUIDs vs. numeric IDs). A comprehensive alignment phase is required to connect the two systems for a fully functional production application.

### 2. Current Architecture
- **Backend**: Spring Boot Microservices architecture. Services register with Eureka. API Gateway handles routing and JWT authorization. Each microservice has its own PostgreSQL database.
- **Frontend**: React SPA using Vite, TypeScript, Tailwind CSS, and React Router. State is managed via React Context (e.g., `AuthContext`).

### 3. Backend Services
| Service | Port | Database | Main Responsibility | Gateway Route | Authentication |
| ------- | ---: | -------- | ------------------- | ------------- | -------------- |
| customer | 8081 | postgres-customer (5434) | Customer profiles | `/api/v1/customers/**` | Required (JWT) |
| order | 8082 | postgres-order (5433) | Order processing | `/api/v1/orders/**` | Required (JWT) |
| dealer | 8083 | postgres-dealer (5435) | Dealer info/inventory | `/dealers/**` | Required (JWT) |
| vehicle | 8084 | postgres-vehicle (5436) | Vehicle catalog | `/api/vehicles/**` | Required (JWT) |
| permission-service | 8091 | postgres-permission (5438) | Permission management | `/api/permissions/**` | Required (JWT, Admin) |
| user-role-service | 8092 | postgres-user-role (5439) | User/Role auth | `/api/users/**`, `/api/roles/**`, `/api/auth/**` | Required / Public |
| service-appointment | 8100 | postgres-service-appointment (5437) | Appointment booking | `/api/appointments/**` | Required (JWT) |

### 4. Frontend Architecture
The frontend is divided into Role-based layouts:
- Customer (Dashboard, Vehicles, Appointments, Orders, Dealers, Profile)
- Dealer (Dashboard, Inventory, Orders, Customers, Appointments, Profile)
- Admin (Dashboard, Users, Vehicles, Dealers, Customers, Orders, Appointments)
It uses `axios`/`fetch` wrappers in `api.ts` and `auth.ts`, with hardcoded `.catch()` fallbacks returning dummy data.

### 5. API Inventory
Key Backend Endpoints Discovered:
- **Auth**: `POST /api/auth/login`
- **Users**: `GET /api/users/me`, `GET /api/users/{id}`, `POST /api/users`
- **Vehicles**: `GET /api/vehicles`, `POST /api/vehicles`, `GET /api/vehicles/{id}`, `PATCH /api/vehicles/{id}/status`
- **Dealers**: `GET /dealers`, `POST /dealers`, `GET /dealers/me`, `GET /dealers/{id}`, `GET /dealers/orders/{dealerId}`
- **Customers**: `GET /api/v1/customers/me`, `POST /api/v1/customers`, `GET /api/v1/customers/{id}`
- **Orders**: `GET /api/v1/orders`, `POST /api/v1/orders`, `GET /api/v1/orders/dealers/{dealerId}`
- **Appointments**: `GET /api/appointments`, `POST /api/appointments`

### 6. API Gateway Mapping
```text
Frontend -> API Gateway -> Service
```
- `/api/auth/**` -> `user-role-service`
- `/api/users/**` -> `user-role-service`
- `/api/v1/customers/**` -> `customer-service`
- `/api/v1/orders/**` -> `order-service`
- `/api/vehicles/**` -> `vehicle-service`
- `/dealers/**` -> `dealer-service`
- `/api/appointments/**` -> `service-appointment`

**Inconsistencies:** The Frontend expects `/api/dealers` but the Gateway maps `/dealers/**` (no `/api` prefix) to the dealer service.

### 7. Database Architecture
Databases are managed in PostgreSQL containers: `order`, `customer`, `dealer_db`, `vehicle_db`, `service_appointment`, `permission_db`, `user_role_db`.
**Critical Finding:** ALL primary and foreign keys in the backend databases are `UUID` strings. The frontend currently types all identifiers as `number`.

### 8. Authentication Architecture
```text
Browser -> Frontend Login -> (API Gateway) -> /api/auth/login (User/Role Service) -> JWT Token -> Browser LocalStorage
```
JWT includes a `sub` claim (User UUID). Gateway filters validate the JWT and forward requests with `X-User-Id` header.

### 9. Authorization Architecture
The API Gateway uses `AuthorizationFilter.java` to enforce role-based access.
| Role | Allowed Operations (Examples) |
| ---- | ------------------ |
| ADMIN | All operations globally across users, roles, permissions, vehicles, orders, etc. |
| DEALER | Access own dealer profile (`/dealers/me`), view own orders/vehicles, update vehicle status. |
| CUSTOMER | View available vehicles, create own orders, create appointments, view/update own customer profile. |

### 10. Frontend Route Inventory
| Route | Page | Role | API Dependency | Status |
| ----- | ---- | ---- | -------------- | ------ |
| `/login` | Login | Public | `/api/auth/login` | Active |
| `/customer/*` | Customer Views | CUSTOMER | Customers, Vehicles, Orders, Appointments | Active |
| `/dealer/*` | Dealer Views | DEALER | Vehicles, Orders, Appointments, Dealers | Active |
| `/admin/*` | Admin Views | ADMIN | All APIs | Active |

### 11. Frontend → Backend Integration Matrix
| Frontend File | Frontend API Call | Backend Endpoint | Match? | Problem |
| ------------- | ----------------- | ---------------- | ------ | ------- |
| `src/lib/auth.ts` | `POST /api/auth/login` | `POST /api/auth/login` | Yes | Uses hardcoded DEMO_USERS bypass |
| `src/pages/customer/Vehicles.tsx` | `GET /api/vehicles` | `GET /api/vehicles` | Yes | Pagination mismatch (Frontend appends `?page=x&size=10`, Backend doesn't support pagination and returns raw List) |
| `src/pages/dealer/Inventory.tsx` | `GET /api/vehicles` | `GET /api/vehicles` | Yes | Same as above |
| `src/pages/customer/Dealers.tsx` | `GET /api/dealers` | `GET /dealers` | **NO** | Gateway path mismatch (`/api/dealers` vs `/dealers`) |
| `src/pages/dealer/Orders.tsx` | `GET /api/v1/orders` | `GET /api/v1/orders` | **NO** | Gateway blocks `GET /api/v1/orders` for DEALER. Dealer should call `/dealers/orders/{dealerId}` or `/api/v1/orders/dealers/{id}` |

### 12. Frontend Model vs Backend DTO Matrix
| Domain | Frontend Model | Backend DTO | Match | Required Change |
| ------ | -------------- | ----------- | ----- | --------------- |
| General ID | `number` | `UUID` | **NO** | All `id`, `userId`, `dealerId`, `vehicleId`, etc. in Frontend must change to `string`. |
| User | `firstName`, `lastName` | `name` | **NO** | Update frontend User to use `name`. |
| Customer | `firstName`, `lastName`, `address: string` | `name`, `address: List<String>` | **NO** | Update frontend Customer properties. |
| Vehicle | `make`, `year` | N/A (Missing in DTO) | **NO** | Backend missing `make` & `year` OR Frontend needs to adapt. |
| Pagination | `PageResponse<T>` | `List<T>` | **NO** | Backend endpoints return raw lists instead of paginated data. |

### 13. Enum/Status Compatibility
- `OrderStatus`: Matches (`PENDING`, `CONFIRMED`, `PROCESSING`, `DELIVERED`, `CANCELLED`)
- `VehicleStatus`: Matches (`AVAILABLE`, `SOLD`, `RESERVED`)
- `AppointmentStatus`: Matches (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED` vs Backend adding `REQUESTED`)
- `Role`: Matches (`CUSTOMER`, `DEALER`, `ADMIN`)

### 14. Mock Data Inventory
| File | Mock Data | Used For | Should Become Real API? |
| ---- | --------- | -------- | ----------------------- |
| `src/lib/mock.ts` | All Mock Constants | Fallback Data | N/A |
| `src/pages/customer/Dashboard.tsx` | `MOCK_ORDERS`, `MOCK_VEHICLES`, `MOCK_APPOINTMENTS` | Dashboard KPIs and Lists | Yes |
| `src/pages/dealer/Dashboard.tsx` | Same as above | Dashboard KPIs and Lists | Yes |
| `src/pages/dealer/Inventory.tsx` | `.catch(() => setVehicles(MOCK_VEHICLES))` | Fallback | Yes |
| `src/pages/dealer/Orders.tsx` | `.catch(() => setOrders(MOCK_ORDERS))` | Fallback | Yes |
| `src/pages/customer/Vehicles.tsx` | `.catch(() => setVehicles(MOCK_VEHICLES))` | Fallback | Yes |
*(And 10+ other components doing `.catch(() => setMockData)`)*

### 15. Authentication Mock Inventory
`src/lib/auth.ts` intercepts the login credentials. If the email matches a hardcoded `DEMO_USERS` list, it immediately resolves using `demo-token` and mock user payloads without hitting the backend API.
**Action required:** Remove `DEMO_USERS` and mock tokens; enforce real JWT flows.

### 16. Customer Features
- Dashboard: 🟡 Partially supported (relies on mock)
- Vehicle browsing: 🟡 Partially supported (Pagination mismatch)
- Dealers: 🔴 Broken (API path mismatch `/api/dealers`)
- Orders: 🟡 Partially supported
- Appointments: 🟡 Partially supported

### 17. Dealer Features
- Dashboard: 🟡 Partially supported (relies on mock)
- Inventory: 🟡 Partially supported
- Orders: 🔴 Broken (Uses `GET /api/v1/orders` which is Admin-only; must use dealer-specific endpoint)
- Customers: 🟡 Partially supported

### 18. Admin Features
- Dashboard: 🟡 Partially supported
- CRUD operations for all entities: 🟡 Supported in backend, but frontend pagination and ID typing breaks integration.

### 19. Docker Architecture
- Backend is fully Dockerized with `docker-compose.yml` defining services, databases, Eureka, Gateway, and network.
- **Frontend is missing.** There is no `Dockerfile` for the frontend, and it is missing from `docker-compose.yml`. A complete `docker compose up -d` will not start the frontend.

### 20. Configuration Problems
- API Base URLs: Hardcoded API paths in frontend assume the gateway is listening on the same host/port or proxied by Vite.
- Vite Proxy: Vite configuration is likely missing a proxy to `http://localhost:8080`.
- Gateway CORS: Need to verify if API Gateway handles CORS for the frontend origin.

### 21. Build Problems
- TypeScript compilation will break heavily once `id` types are changed from `number` to `string` (UUID).
- No inherent backend build problems detected.

### 22. End-to-End Workflow Analysis
**Customer Workflow**: Login (mock) -> Dashboard (mock) -> Vehicles (real API but fails due to types/pagination, falls back to mock) -> Order (fails due to ID type mismatch).

### 23. P0 Blockers
- **ID Type Mismatch**: Frontend uses `number`, Backend uses `UUID`. (Will cause serialisation/deserialization failures globally).
- **Authentication Bypass**: Hardcoded mock users prevent true token issuance and role generation.
- **Gateway Route Mismatch**: `/api/dealers` in frontend vs `/dealers` in gateway.

### 24. P1 Critical Issues
- **Dealer Orders Route**: Frontend calls Admin-only `/api/v1/orders` instead of Dealer-specific route.
- **Pagination**: Frontend expects `PageResponse`, Backend returns `List`.
- **Docker Completeness**: Frontend missing from `docker-compose.yml`.

### 25. P2 Important Issues
- **Hidden Errors**: Frontend masks all API errors with `.catch(() => fallbackToMock)`, making debugging impossible.
- **Model Discrepancies**: `make`/`year` missing in Vehicle DTO; `firstName`/`lastName` vs `name` in User/Customer DTOs.

### 26. P3 Polish Issues
- Clean up unused imports after removing mock data.
- Standardize error state UI across components instead of silent mock fallbacks.

### 27. Recommended Implementation Order
1. **Frontend Types**: Update all IDs in frontend `types/index.ts` from `number` to `string`. Unify `firstName`/`lastName` to `name` where applicable.
2. **Remove Authentication Mocks**: Delete `DEMO_USERS` and enforce true `api.post('/api/auth/login')`.
3. **Remove Mock Data Fallbacks**: Remove all `.catch()` mock injections across pages.
4. **Fix API Paths**: Update frontend API calls (e.g., `/api/dealers` -> `/dealers`). Fix Dealer Orders endpoint.
5. **Handle Pagination Mismatch**: Temporarily adapt frontend to expect arrays, or wrap backend responses in a basic `PageResponse` adapter.
6. **Dockerize Frontend**: Create `Dockerfile` for Vite frontend and add to `docker-compose.yml`.

### 28. Files That Must Change
- `Frontend-main/src/types/index.ts`
- `Frontend-main/src/lib/auth.ts`
- `Frontend-main/src/lib/api.ts` (Proxy config or error handling)
- `Frontend-main/src/pages/**` (Removing mock data catches)
- `Vehicle-Platform-Development-Backend/docker-compose.yml` (Add frontend)
- `Frontend-main/Dockerfile` (To be created)

### 29. Files That Should NOT Change
- Backend application logic, databases, entities, migrations, and DTOs (Treat Backend as source of truth).
- Frontend UI components, layouts, Tailwind CSS (Preserve Figma design).

### 30. Final Definition of Done
The system is considered done when `docker compose up -d --build` successfully launches all backend services, databases, and the frontend container. A user must be able to log in using real backend credentials, browse real vehicles, and create an order with real UUIDs, passing successfully through the API Gateway without relying on any frontend mock fallbacks.
