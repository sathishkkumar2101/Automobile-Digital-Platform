# PHASE 4 — API CONTRACT VERIFICATION

## 1. Verified API count
All provided APIs in the inventory exist in the codebase.

## 2. Missing API count
**0 APIs missing** from the provided inventory. (Though I did note that some *additional* endpoints exist which were added during Phase 3A, such as `/api/v1/orders/customers/{id}`).

## 3. Mismatched API count
**4 frontend integrations are mismatched** because the frontend attempts to call admin-level bulk endpoints (`GET /api/v1/orders` and `GET /api/appointments`) instead of tenant-specific endpoints.

---

## OUTPUT 1 — API VERIFICATION TABLE

| Method | Endpoint | Exists? | Controller | Service | Gateway Route | Auth | Roles |
| ------ | -------- | ------- | ---------- | ------- | ------------- | ---- | ----- |
| POST | `/api/auth/login` | 🟢 | `AuthController` | `AuthService` | `user-role-service` | PUBLIC | ALL |
| GET | `/api/users` | 🟢 | `UserController` | `UserService` | `user-role-service` | SECURED | ADMIN |
| GET | `/api/users/me` | 🟢 | `UserController` | `UserService` | `user-role-service` | SECURED | ALL |
| GET | `/api/users/{id}` | 🟢 | `UserController` | `UserService` | `user-role-service` | SECURED | ADMIN |
| GET | `/api/users/username/{username}` | 🟢 | `UserController` | `UserService` | `user-role-service` | SECURED | ADMIN |
| POST | `/api/users` | 🟢 | `UserController` | `UserService` | `user-role-service` | PUBLIC | ALL |
| PUT | `/api/users/{id}` | 🟢 | `UserController` | `UserService` | `user-role-service` | SECURED | ALL (Own) |
| DELETE | `/api/users/{id}` | 🟢 | `UserController` | `UserService` | `user-role-service` | SECURED | ADMIN |
| GET | `/api/roles` | 🟢 | `RoleController` | `RoleService` | `user-role-service` | SECURED | ADMIN |
| GET | `/api/roles/{id}` | 🟢 | `RoleController` | `RoleService` | `user-role-service` | SECURED | ADMIN |
| POST | `/api/roles` | 🟢 | `RoleController` | `RoleService` | `user-role-service` | SECURED | ADMIN |
| PUT | `/api/roles/{id}` | 🟢 | `RoleController` | `RoleService` | `user-role-service` | SECURED | ADMIN |
| DELETE | `/api/roles/{id}` | 🟢 | `RoleController` | `RoleService` | `user-role-service` | SECURED | ADMIN |
| GET | `/api/internal/users/{userId}/authorization`| 🟢 | `AuthorizationController`| `AuthZ Service` | N/A (Internal) | INTERNAL | N/A |
| POST | `/dealers` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | ADMIN |
| GET | `/dealers` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | ADMIN |
| GET | `/dealers/me` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | DEALER |
| GET | `/dealers/{dealerId}` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | ALL |
| PUT | `/dealers/{dealerId}` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | DEALER (Own)|
| DELETE | `/dealers/{dealerId}` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | ADMIN |
| GET | `/dealers/{dealerId}/vehicles` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | ALL |
| GET | `/dealers/location/{location}` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | ALL |
| GET | `/dealers/orders/{dealerId}` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | DEALER |
| GET | `/dealers/customer/{customerId}` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | DEALER |
| PUT | `/dealers/orders/{orderId}` | 🟢 | `DealerController` | `DealerService` | `dealer-service` | SECURED | DEALER |
| GET | `/api/permissions` | 🟢 | `PermissionController`| `PermService` | `permission-service` | SECURED | ADMIN |
| GET | `/api/permissions/{id}` | 🟢 | `PermissionController`| `PermService` | `permission-service` | SECURED | ADMIN |
| POST | `/api/permissions` | 🟢 | `PermissionController`| `PermService` | `permission-service` | SECURED | ADMIN |
| PUT | `/api/permissions/{id}` | 🟢 | `PermissionController`| `PermService` | `permission-service` | SECURED | ADMIN |
| DELETE | `/api/permissions/{id}`| 🟢 | `PermissionController`| `PermService` | `permission-service` | SECURED | ADMIN |
| POST | `/api/vehicles` | 🟢 | `VehicleController` | `VehicleService` | `vehicle-service` | SECURED | ADMIN, DEALER |
| GET | `/api/vehicles` | 🟢 | `VehicleController` | `VehicleService` | `vehicle-service` | SECURED | ALL |
| GET | `/api/vehicles/{vehicleId}` | 🟢 | `VehicleController` | `VehicleService` | `vehicle-service` | SECURED | ALL |
| GET | `/api/vehicles/dealer/{dealerId}` | 🟢 | `VehicleController` | `VehicleService` | `vehicle-service` | SECURED | ALL |
| GET | `/api/vehicles/available` | 🟢 | `VehicleController` | `VehicleService` | `vehicle-service` | SECURED | ALL |
| PUT | `/api/vehicles/{vehicleId}` | 🟢 | `VehicleController` | `VehicleService` | `vehicle-service` | SECURED | ADMIN, DEALER |
| PATCH| `/api/vehicles/{vehicleId}/status` | 🟢 | `VehicleController` | `VehicleService` | `vehicle-service` | SECURED | ADMIN, DEALER |
| DELETE| `/api/vehicles/{vehicleId}` | 🟢 | `VehicleController` | `VehicleService` | `vehicle-service` | SECURED | ADMIN, DEALER |
| GET | `/api/v1/customers` | 🟢 | `CustomerController` | `CustService` | `customer` | SECURED | ADMIN, DEALER |
| GET | `/api/v1/customers/{id}` | 🟢 | `CustomerController` | `CustService` | `customer` | SECURED | ALL (Own) |
| POST | `/api/v1/customers` | 🟢 | `CustomerController` | `CustService` | `customer` | SECURED | ADMIN |
| PUT | `/api/v1/customers/{id}` | 🟢 | `CustomerController` | `CustService` | `customer` | SECURED | ADMIN, CUST(Own)|
| DELETE| `/api/v1/customers/{id}` | 🟢 | `CustomerController` | `CustService` | `customer` | SECURED | ADMIN |
| GET | `/api/v1/orders` | 🟢 | `OrdersController` | `OrdersService` | `order-service` | SECURED | ADMIN |
| GET | `/api/v1/orders/{id}` | 🟢 | `OrdersController` | `OrdersService` | `order-service` | SECURED | ADMIN, CUST, DLR|
| GET | `/api/v1/orders/dealers/{dealerId}` | 🟢 | `OrdersController` | `OrdersService` | `order-service` | SECURED | ADMIN, DEALER |
| POST | `/api/v1/orders` | 🟢 | `OrdersController` | `OrdersService` | `order-service` | SECURED | CUSTOMER |
| PUT | `/api/v1/orders/{id}` | 🟢 | `OrdersController` | `OrdersService` | `order-service` | SECURED | ADMIN |
| DELETE| `/api/v1/orders/{id}` | 🟢 | `OrdersController` | `OrdersService` | `order-service` | SECURED | ADMIN |

---

## OUTPUT 2 — FRONTEND API COMPARISON

| Frontend File | Method | Frontend Endpoint | Actual Backend Endpoint | Match | Required Action |
| ------------- | ------ | ----------------- | ----------------------- | ----- | --------------- |
| `customer/Orders.tsx` | GET | `/api/v1/orders` | `/api/v1/orders` | 🟡 | Frontend receives 403 because it expects its own orders, but Gateway restricts this to ADMIN. Backend must implicitly filter `GET /api/v1/orders` by tenant. |
| `customer/Dashboard.tsx`| GET | `/api/v1/orders` | `/api/v1/orders` | 🟡 | Same as above. |
| `customer/Appointments.tsx`| GET | `/api/appointments` | `/api/appointments` | 🟡 | Frontend receives 403. Backend must implicitly filter `GET /api/appointments`. |
| `customer/Dashboard.tsx`| GET | `/api/appointments` | `/api/appointments` | 🟡 | Same as above. |
| `dealer/Appointments.tsx`| GET | `/api/appointments` | `/api/appointments` | 🟡 | Same as above. |
| `dealer/Dashboard.tsx` | GET | `/api/appointments` | `/api/appointments` | 🟡 | Same as above. |
| `dealer/Orders.tsx` | GET | `/dealers/orders/${user.id}`| `/dealers/orders/{dealerId}` | 🟢 | Matches. |
| `dealer/Dashboard.tsx` | GET | `/dealers/orders/${user.id}`| `/dealers/orders/{dealerId}` | 🟢 | Matches. |
| `admin/Orders.tsx` | GET | `/api/v1/orders` | `/api/v1/orders` | 🟢 | Matches (Admin is allowed). |
| `admin/Appointments.tsx`| GET | `/api/appointments` | `/api/appointments` | 🟢 | Matches (Admin is allowed). |

---

## OUTPUT 3 — ORDER ANALYSIS

1. **Can CUSTOMER call GET /api/v1/orders?**
   No. The API Gateway blocks this with a 403 Forbidden because it is treated as a global data fetch restricted to ADMIN.
2. **Can CUSTOMER call GET /api/v1/orders/{id}?**
   Yes. The Gateway permits this.
3. **Is there customer ownership validation?**
   **No.** For `GET /api/v1/orders/{id}`, the Gateway permits the request and routes it to `OrderService`. The `OrderService` `findById()` method blindly returns the order without validating if the JWT identity matches the `customerId` on the Order. This is an IDOR vulnerability.
4. **Is there already an implicit customer filtering mechanism?**
   No. The `findAllOrders()` method blindly returns `ordersRepository.findAll()`.
5. **Is a customer-specific endpoint genuinely missing?**
   *Note: In Phase 3A I added `/customers/{customerId}`, but the frontend was never updated to use it.* Since the prompt restricts modifying the frontend, the frontend expects `GET /api/v1/orders` to dynamically act as a customer-specific endpoint. In that sense, implicit filtering is genuinely missing.
6. **What is the safest minimal solution?**
   Modify the `OrdersController.findAllOrders()` endpoint to read the `X-User-Id` and `X-User-Role` headers injected by the Gateway. If the role is CUSTOMER, delegate to `ordersService.findByCustomerId(userId)`. Do the equivalent for DEALER. Allow Gateway to pass `GET /api/v1/orders` through for CUSTOMER and DEALER. Add ownership validation inside `OrderService.findById()`.

---

## OUTPUT 4 — APPOINTMENT ANALYSIS

| Method | Endpoint | Exists | Roles | Ownership |
| ------ | -------- | ------ | ----- | --------- |
| POST | `/api/appointments` | Yes | CUST | Validated in Controller/Service |
| GET | `/api/appointments/{id}` | Yes | CUST,DLR | Gateway validates via `authorizationService` |
| GET | `/api/appointments` | Yes | ADMIN | None (Admin sees all) |
| PUT | `/api/appointments/{id}` | Yes | ADMIN | None |
| PATCH | `/api/appointments/{id}/service-type` | Yes | CUST,DLR | Gateway validates |
| PATCH | `/api/appointments/{id}/status` | Yes | DEALER | Gateway validates |
| DELETE| `/api/appointments/{id}` | Yes | ADMIN | None |

* `GET /api/appointments` and `POST /api/appointments` actually exist.
* The customer/dealer-specific endpoints (`/customers/{customerId}`) exist because I added them in Phase 3A, but just like Orders, the frontend is actively calling the bulk `GET /api/appointments` endpoint instead.

---

## OUTPUT 5 — AUTHORIZATION MATRIX

| Endpoint | CUSTOMER | DEALER | ADMIN |
| -------- | -------- | ------ | ----- |
| `GET /api/vehicles` | ✅ | ✅ | ✅ |
| `GET /api/v1/customers` | ❌ | ✅ | ✅ |
| `GET /api/v1/orders` | ❌ | ❌ | ✅ |
| `GET /api/v1/orders/{id}` | ⚠️ | ⚠️ | ✅ |
| `GET /api/v1/orders/dealers/{dealerId}`| ❌ | ⚠️ | ✅ |
| `GET /dealers/orders/{dealerId}` | ❌ | ⚠️ | ✅ |

*(⚠️ = Allowed by Gateway, but relies on downstream Controller validation)*

---

## OUTPUT 6 — OWNERSHIP SECURITY

* **Customer A → Customer B's orders**: 🔴 **VULNERABLE**. Customer A can call `GET /api/v1/orders/{OrderB_ID}` and the backend will blindly return it because `OrdersController.findById()` does not check if `X-User-Id` matches the order's `customerId`.
* **Customer A → Customer B's appointments**: ✅ **SECURE**. The Gateway `AuthorizationFilter` has a hardcoded check `authorizationService.isAppointmentCustomer(userId, appointmentId)` before routing `GET /api/appointments/{id}`.
* **Dealer A → Dealer B's data**: 🔴 **VULNERABLE**. `GET /api/v1/orders/dealers/{dealerId}` does not verify that the authenticated `userId` matches the requested `dealerId` in the path. (Gateway has a comment: `We still need to verify that dealerId belongs to the logged-in dealer`).

---

## OUTPUT 7 — REQUIRED BACKEND CHANGES

### REQUIRED

**1. Fix implicit filtering for Orders**
* File: `AuthorizationFilter.java` & `OrdersController.java`
* Problem: Frontend uses `GET /api/v1/orders` expecting their own orders, but Gateway blocks it and controller returns all.
* Minimal fix: Update Gateway to permit `GET /api/v1/orders` for ALL roles. Update `OrdersController` to accept `@RequestHeader("X-User-Id")` and `@RequestHeader("X-User-Role")` and return `findByCustomerId`, `findByDealerId`, or `findAll` depending on the role.
* Security impact: Solves 403 errors and prevents data leaks.
* Risk: Low.

**2. Fix implicit filtering for Appointments**
* File: `AuthorizationFilter.java` & `AppointmentController.java`
* Problem: Frontend uses `GET /api/appointments` expecting their own appointments.
* Minimal fix: Update Gateway to permit `GET /api/appointments` for ALL roles. Update `AppointmentController` to perform header-based role filtering.
* Security impact: Solves 403 errors and prevents data leaks.
* Risk: Low.

**3. Secure Order IDOR Vulnerability**
* File: `OrdersController.java`
* Problem: `GET /api/v1/orders/{id}` does not validate ownership.
* Minimal fix: Inside `findById`, compare the `X-User-Id` with the retrieved order's `customerId` or `dealerId` (unless role is ADMIN).
* Security impact: Prevents cross-tenant data access.
* Risk: Low.

### OPTIONAL

* **Remove redundant endpoints**: Remove the explicit `/customers/{id}` and `/dealers/{id}` endpoints from `OrdersController` and `AppointmentController` that were added in Phase 3A, since they are unused by the frontend.

---

## Recommended next implementation step
Execute the REQUIRED backend changes to implement implicit JWT-based data filtering in `OrdersController` and `AppointmentController`, and add the missing IDOR validation for single-item Order lookups.
