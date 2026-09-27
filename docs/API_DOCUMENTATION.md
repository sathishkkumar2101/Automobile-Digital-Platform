# Automobile Digital Platform — API Documentation

This document provides a comprehensive, verified reference of all REST and WebSocket endpoints exposed by the Automobile Digital Platform microservices mesh. All endpoints (except public authentication and health checks) require a valid JWT Bearer token in the `Authorization` header.

---

## 1. Domain Group Summary

| Domain | Base Path | Microservice | Database | Primary Consumers |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Users** | `/api/auth/**`, `/api/users/**` | `user-role-service` (8092) | `user_role_db` | All users, Admins |
| **Roles & Permissions** | `/api/roles/**`, `/api/permissions/**` | `user-role-service`, `permission-service` | `user_role_db`, `permission_db` | Admins |
| **Customers** | `/api/v1/customers/**` | `customer` (8081) | `customer` | Customers, Dealers, Admins |
| **Dealers** | `/dealers/**` | `dealer` (8083) | `dealer_db` | Customers, Dealers, Admins |
| **Vehicles** | `/api/vehicles/**` | `vehicle` (8084) | `vehicle_db` | Public, Dealers, Admins |
| **Orders** | `/api/v1/orders/**` | `order` (8082) | `order` | Customers, Dealers, Admins |
| **Appointments** | `/api/appointments/**` | `service-appointment` (8100) | `service_appointment` | Customers, Dealers, Admins |
| **Messaging** | `/api/messages/**`, `/ws` | `messaging` (8101) | `messaging` | Customers, Dealers, Admins |

---

## 2. Authentication & User Management

### `POST /api/auth/login`
- **Service**: `user-role-service`
- **Auth**: Public (No JWT required)
- **Role**: All
- **Description**: Authenticates user credentials with BCrypt verification and mints a signed HMAC-SHA256 JWT token.
- **Request Body**:
  ```json
  {
    "email": "customer1@bmwtechworks.com",
    "password": "Customer@123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Login successful",
    "user": {
      "id": "6683e0c9-cf0e-4963-acae-12020540b8ba",
      "username": "customer1",
      "name": "Customer1",
      "email": "customer1@bmwtechworks.com",
      "role": "CUSTOMER"
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Invalid email or password.
  - `400 Bad Request`: Malformed payload or missing required fields.

---

### `GET /api/users/me`
- **Service**: `user-role-service`
- **Auth**: JWT Bearer
- **Role**: `CUSTOMER`, `DEALER`, `ADMIN`
- **Description**: Retrieves the authenticated user's profile based on the JWT subject claim.
- **Response `200 OK`**:
  ```json
  {
    "id": "6683e0c9-cf0e-4963-acae-12020540b8ba",
    "username": "customer1",
    "name": "Customer1",
    "email": "customer1@bmwtechworks.com",
    "role": "CUSTOMER",
    "roleId": "f2f947ac-465b-4ec2-9c59-3d1f3a0e75f2",
    "createdAt": "2026-09-01T08:30:00"
  }
  ```

---

### `POST /api/users`
- **Service**: `user-role-service`
- **Auth**: Public
- **Role**: Public self-registration (enforces `CUSTOMER` role); Admin can create users of other roles.
- **Security Control**: Prevents role escalation. An unauthenticated registration requesting `ADMIN` or `DEALER` is refused with `403 Forbidden` or coerced strictly to `CUSTOMER`.
- **Request Body**:
  ```json
  {
    "username": "johndoe",
    "name": "John Doe",
    "email": "johndoe@example.com",
    "password": "Password@123",
    "role": "CUSTOMER"
  }
  ```
- **Response `201 Created`**: Returns created `User` object.

---

### `GET /api/users`
- **Service**: `user-role-service`
- **Auth**: JWT Bearer
- **Role**: `ADMIN` only
- **Response `200 OK`**: Array of all platform users.

---

### `GET /api/users/{id}`
- **Service**: `user-role-service`
- **Auth**: JWT Bearer
- **Role**: `ADMIN`
- **Response `200 OK`**: User profile matching `{id}`.

---

### `PUT /api/users/{id}`
- **Service**: `user-role-service`
- **Auth**: JWT Bearer
- **Role**: `ADMIN` or own user account.

---

### `DELETE /api/users/{id}`
- **Service**: `user-role-service`
- **Auth**: JWT Bearer
- **Role**: `ADMIN`
- **Description**: Deletes account. Cascades across domain services to prevent orphan profiles.

---

## 3. Roles & Permissions Management

### `GET /api/roles`
- **Service**: `user-role-service`
- **Auth**: JWT Bearer
- **Role**: `ADMIN`
- **Response `200 OK`**: List of defined platform roles (`CUSTOMER`, `DEALER`, `ADMIN`).

---

### `POST /api/roles` | `PUT /api/roles/{id}` | `DELETE /api/roles/{id}`
- **Service**: `user-role-service`
- **Auth**: JWT Bearer
- **Role**: `ADMIN`

---

### `GET /api/permissions`
- **Service**: `permission-service`
- **Auth**: JWT Bearer
- **Role**: `ADMIN`
- **Response `200 OK`**: List of granular permission entities.

---

## 4. Customer Module

### `GET /api/v1/customers/me`
- **Service**: `customer`
- **Auth**: JWT Bearer
- **Role**: `CUSTOMER`
- **Description**: Resolves customer profile mapped to the authenticated user ID (`userId`).
- **Response `200 OK`**:
  ```json
  {
    "id": "b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043",
    "userId": "6683e0c9-cf0e-4963-acae-12020540b8ba",
    "name": "Customer1",
    "email": "customer1@bmwtechworks.com",
    "phone": "9876543210",
    "address": [
      "Chennai, Tamil Nadu",
      "India"
    ],
    "createdAt": "2026-09-01T08:30:00"
  }
  ```

---

### `POST /api/v1/customers`
- **Service**: `customer`
- **Auth**: JWT Bearer
- **Role**: `CUSTOMER` (self-onboarding), `ADMIN`
- **Description**: Creates initial customer profile with address lines.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+91 98765 43210",
    "address": ["123 BMW Expressway", "Bangalore, KA"]
  }
  ```
- **Response `201 Created`**

---

### `GET /api/v1/customers`
- **Service**: `customer`
- **Auth**: JWT Bearer
- **Role**: `DEALER`, `ADMIN` (Blocked for `CUSTOMER` with `403 Forbidden`)
- **Description**: Returns all customer profiles for CRM drilldown and order resolution.

---

### `PUT /api/v1/customers/{id}`
- **Service**: `customer`
- **Auth**: JWT Bearer
- **Role**: `ADMIN` or the owning `CUSTOMER`
- **Security Check**: IDOR check ensures a customer cannot modify another customer's profile.

---

## 5. Dealership Module

### `GET /dealers`
- **Service**: `dealer`
- **Auth**: JWT Bearer
- **Role**: All (`CUSTOMER`, `DEALER`, `ADMIN`)
- **Description**: Lists all 5 regional dealerships (Chennai, Bangalore, Hyderabad, Mumbai, Delhi).
- **Response `200 OK`**:
  ```json
  [
    {
      "dealerId": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
      "userId": "00f89c8f-34e1-4dad-bbb4-8857ddd155e1",
      "name": "BMW Chennai",
      "location": "Chennai"
    },
    {
      "dealerId": "b2c3d4e5-f6a7-4890-b123-456789abcdef",
      "userId": "40b238b1-6960-40af-b2dd-3dbfc8996e09",
      "name": "BMW Bangalore",
      "location": "Bangalore"
    }
  ]
  ```

---

### `GET /dealers/me`
- **Service**: `dealer`
- **Auth**: JWT Bearer
- **Role**: `DEALER`
- **Description**: Resolves the specific dealership entity belonging to the logged-in dealer user.
- **Note**: Reconciles the architectural reality: `userId != dealerId`.

---

### `GET /dealers/orders/{dealerId}`
- **Service**: `dealer`
- **Auth**: JWT Bearer
- **Role**: `DEALER`, `ADMIN`
- **Security Rule**: Dealer A cannot view Dealer B's orders (`403 Forbidden`).

---

### `PUT /dealers/orders/{orderId}`
- **Service**: `dealer`
- **Auth**: JWT Bearer
- **Role**: `DEALER`, `ADMIN`
- **Description**: Updates order status (`CONFIRMED`, `IN_PRODUCTION`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
- **Security Rule**: Verifies that the order belongs to the calling dealer before executing status change.

---

## 6. Vehicle Inventory & Catalog

### `GET /api/vehicles`
- **Service**: `vehicle`
- **Auth**: JWT Bearer
- **Role**: `CUSTOMER`, `DEALER`, `ADMIN`
- **Query Parameters**:
  - `model` (String, optional)
  - `minPrice` (Decimal, optional)
  - `maxPrice` (Decimal, optional)
  - `status` (`AVAILABLE`, `SOLD`, `RESERVED`)
  - `dealerId` (UUID, optional)
- **Response `200 OK`**: Array of 25 seeded BMW vehicles with pricing, specs, images, and status.

---

### `GET /api/vehicles/{vehicleId}`
- **Service**: `vehicle`
- **Auth**: JWT Bearer
- **Role**: All
- **Response `200 OK`**: Complete vehicle specification and features.

---

### `PATCH /api/vehicles/{vehicleId}/status`
- **Service**: `vehicle`
- **Auth**: JWT Bearer
- **Role**: `DEALER`, `ADMIN`
- **Description**: Transitions inventory state (`AVAILABLE` &rarr; `RESERVED` &rarr; `SOLD`).

---

## 7. Order & Purchase Workflows

### `POST /api/v1/orders`
- **Service**: `order`
- **Auth**: JWT Bearer
- **Role**: `CUSTOMER`
- **Description**: Places purchase request for a vehicle.
- **Request Body**:
  ```json
  {
    "customerId": "b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043",
    "vehicleId": "f1a2b3c4-d5e6-4789-a012-111111111111",
    "dealerId": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
    "status": "CREATED",
    "totalAmount": 5500000
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "e4f5a6b7-c8d9-4012-e345-6789abcdef01",
    "customerId": "b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043",
    "vehicleId": "f1a2b3c4-d5e6-4789-a012-111111111111",
    "dealerId": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
    "status": "CREATED",
    "createdAt": "2026-09-27T16:15:00",
    "totalAmount": 5500000
  }
  ```

---

### `GET /api/v1/orders`
- **Service**: `order`
- **Auth**: JWT Bearer
- **Role**: Context-dependent (Implicit Filtering)
  - `ADMIN`: Returns all platform orders across all dealerships.
  - `CUSTOMER`: Automatically scoped via `X-User-Id` to caller's own orders.
  - `DEALER`: Blocked at Gateway (must call `/dealers/orders/{dealerId}`).

---

### `GET /api/v1/orders/{id}`
- **Service**: `order`
- **Auth**: JWT Bearer
- **Role**: `ADMIN`, `CUSTOMER` (Own order), `DEALER` (Own dealership)
- **IDOR Security Protection**: Customer A requesting Customer B's order ID returns `403 Forbidden`.

---

## 8. Service Appointment Management

### `POST /api/appointments`
- **Service**: `service-appointment`
- **Auth**: JWT Bearer
- **Role**: `CUSTOMER`
- **Request Body**:
  ```json
  {
    "customerId": "b7c4e6a1-3d52-4f8b-9c17-2a6e5d8f1043",
    "vehicleId": "f1a2b3c4-d5e6-4789-a012-111111111111",
    "dealerId": "a1b2c3d4-e5f6-4789-a012-3456789abcde",
    "serviceType": "INSPECTION",
    "estimatedCost": 15000
  }
  ```
- **Response `201 Created`**: Appointment with status `REQUESTED`.

---

### `GET /api/appointments`
- **Service**: `service-appointment`
- **Auth**: JWT Bearer
- **Role**: Implicitly filtered based on caller role.

---

### `GET /api/appointments/service-types`
- **Service**: `service-appointment`
- **Auth**: JWT Bearer
- **Role**: All
- **Description**: Returns dynamic list of valid workshop services (`OIL_CHANGE`, `INSPECTION`, `BRAKE_SERVICE`, etc.).

---

### `PATCH /api/appointments/{id}/status`
- **Service**: `service-appointment`
- **Auth**: JWT Bearer
- **Role**: `DEALER`, `ADMIN`
- **Description**: Updates appointment state (`REQUESTED` &rarr; `CONFIRMED` &rarr; `IN_PROGRESS` &rarr; `COMPLETED` / `CANCELLED`).

---

## 9. Real-Time Messaging & Chat

### WebSocket Endpoint: `ws://localhost:3000/ws?token=<JWT>`
- **Protocol**: STOMP over WebSocket
- **Auth**: Verified via JWT token in query parameter and STOMP `CONNECT` frame header `Authorization: Bearer <token>`.
- **Client Inbound Destinations**:
  - `/app/chat.send`: Sends a message payload.
  - `/app/chat.read`: Marks conversation messages as read.
  - `/app/chat.typing`: Emits typing indicator to participants.
- **Client Subscriptions**:
  - `/user/queue/messages`: Inbound new messages.
  - `/user/queue/read`: Inbound read receipts.
  - `/user/queue/typing`: Inbound typing status.

---

### `GET /api/messages/conversations`
- **Service**: `messaging`
- **Auth**: JWT Bearer
- **Role**: All
- **Description**: Returns all conversation threads where the authenticated user is a participant.

---

### `POST /api/messages/conversations`
- **Service**: `messaging`
- **Auth**: JWT Bearer
- **Role**: All
- **Request Body**:
  ```json
  {
    "participantIds": ["52d15021-93d4-4779-b17e-5ea3abd10028"],
    "contextType": "ORDER",
    "contextId": "e4f5a6b7-c8d9-4012-e345-6789abcdef01",
    "title": "Inquiry regarding BMW M3 Order"
  }
  ```

---

### `GET /api/messages/unread-count`
- **Service**: `messaging`
- **Auth**: JWT Bearer
- **Role**: All
- **Response `200 OK`**: `{ "count": 2 }`

---

## 10. Internal Inter-Service Endpoints (Non-Public)

The following endpoints are strictly blocked by the Gateway from public ingress and are accessible only across internal microservices with `X-Internal-Secret: ${INTERNAL_SERVICE_SECRET}`:

| Endpoint | Service | Purpose |
| :--- | :--- | :--- |
| `GET /api/internal/users/{userId}` | `user-role-service` | Retrieves user profile for messaging participants |
| `GET /api/internal/users/administrator` | `user-role-service` | Resolves administrator system account |
| `GET /api/internal/users/{userId}/authorization` | `user-role-service` | Resolves roles and permissions during Gateway filter evaluation |
