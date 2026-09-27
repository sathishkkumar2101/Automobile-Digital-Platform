# Admin Portal — Requirements

## Objective

Implement the Admin portal on top of the existing Automobile Digital Platform without breaking Customer or Dealer.

## Required Modules

- Authentication
- Dashboard
- Users
- Customers
- Dealers
- Vehicles
- Orders
- Appointments
- Roles
- Permissions
- Profile

## Pre-Implementation Audit

Inspect authentication, JWT handling, role lookup, gateway authorization, User/Role service, Permission service, existing Admin routes/components, seed data, database relationships and current APIs before coding.

## Authorization

Admin authorization must be enforced server-side. Frontend guards are not security.

Reject unauthorized CUSTOMER/DEALER access and prevent self role escalation.

## Dashboard

Use real backend data. Suggested metrics:

- Users
- Customers
- Dealers
- Vehicles
- Available vehicles
- Orders
- Active orders
- Delivered orders
- Appointments
- Pending appointments

No hardcoded business metrics.

## User Management

List/search/view users and manage supported fields/roles according to the existing APIs. Prevent role escalation.

## Customer Management

Global customer list, search, details, orders, appointments and relevant customer information.

## Dealer Management

Exactly five current dealers:

- Chennai
- Bangalore
- Hyderabad
- Mumbai
- Delhi

Dealers do not self-register. Admin manages them.

## Vehicle Management

Use the existing vehicle APIs for list/detail/create/update/delete/status/dealer filtering. Preserve Customer catalog behavior.

## Order Management

Respect:

```text
CREATED
CONFIRMED
IN_PRODUCTION
SHIPPED
DELIVERED
CANCELLED
```

## Appointment Management

Respect:

```text
REQUESTED
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

## Permission Management

Existing endpoints:

```text
GET    /api/permissions
GET    /api/permissions/{id}
POST   /api/permissions
PUT    /api/permissions/{id}
DELETE /api/permissions/{id}
```

Inspect the actual model before designing advanced RBAC UI.

## UI

Match the existing Figma-derived application. Reuse layouts, cards, tables, dialogs, typography, spacing and authentication patterns.

Every screen should have loading, empty, error and success states.

## Security Checklist

- [ ] Admin route guard
- [ ] Backend Admin authorization
- [ ] No client-trusted ownership IDs
- [ ] No role escalation
- [ ] Customer isolation preserved
- [ ] Dealer isolation preserved
- [ ] Cross-dealer access remains blocked
- [ ] Correct HTTP authorization errors
- [ ] No sensitive error leakage

## Completion

Run frontend build/type checks, backend compilation/tests, clean Docker rebuild, Admin tests, Customer regression and all five Dealer login/isolation tests.
