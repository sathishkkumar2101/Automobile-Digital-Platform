# Automobile Digital Platform — Runbook

Operational guide for running the full stack locally (Docker) and verifying the
Communication & Messaging System end-to-end.

**Status: verified — messaging E2E passes 24/24 (REST + realtime STOMP).**

## 1. Overview

| Directory | Contains |
|---|---|
| `Frontend-V/Vehicle-Platform-Development-Backend` | Docker Compose + all Spring Boot services |
| `Frontend-V/Frontend-main` | React 19 / Vite / Tailwind frontend + `test_messaging.cjs` |
| `Frontend-V/docs` | Architecture, handoff, and this runbook |

## 2. Prerequisites

- Docker Desktop running (Linux engine).
- Ports free on the host: `3000`, `8080`, `8101`, `8761` (plus per-service ports below).
- Node.js 18+ if you run the E2E test on the host (uses native `WebSocket`; Node 24 works).

## 3. Start the stack

```
cd "Frontend-V/Vehicle-Platform-Development-Backend"
docker compose up -d --build        # first time / after backend changes
docker compose up -d                # plain start when images already exist
```

Wait until all services are `Up` / `(healthy)`:

```
docker ps --format "{{.Names}} {{.Status}}"
```

Expect 9 application containers (`api-gateway`, `eureka-server`, `customer-service`,
`dealer-service`, `messaging-service`, `order-service`, `permission-service`,
`service-appointment`, `user-role-service`, `vehicle-service`) plus 8 `postgres-*`
databases.

## 4. Verify service discovery

Open http://localhost:8761 and confirm all apps registered:

`API-GATEWAY, CUSTOMER, DEALER-SERVICE, MESSAGING-SERVICE, ORDER-SERVICE, PERMISSION-SERVICE, SERVICE-APPOINTMENT, USER-ROLE-SERVICE, VEHICLE-SERVICE`

## 5. Warm up the gateway (important after any restart)

After a restart the gateway's Eureka load-balancer cache is briefly empty, which
surfaces as `401` (or `000`) on login and `503`/`500` on proxied routes. Probe
until it returns `200`, retrying every ~8s (takes up to ~1–2 min):

```
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bmwtechworks.com","password":"Admin@123"}'
```

## 6. Run the end-to-end messaging test

```
cd "Frontend-V/Frontend-main"
node test_messaging.cjs
```

Expected result: `24 passed, 0 failed`:

- Login via gateway for admin / dealer / customer
- Create conversation (customer → dealer) with auto-participants
- Per-role conversation lists
- REST send, history order, unread count, mark-thread-read
- Realtime STOMP over nginx `:3000/ws`: bidirectional message push, typing
  indicator, read event, read-ack

## 7. Use it in the browser

Open http://localhost:3000 and log in:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@bmwtechworks.com` | `Admin@123` |
| Dealer | `dealer1@bmwtechworks.com` | `Dealer@123` |
| Customer | `customer1@bmwtechworks.com` | `Customer@123` |

What to try:

- **Customer / Dealer** → **Messages** page (sidebar). Start a chat from an Order,
  Vehicle, Dealer, or Appointment context (Chat button) or create one manually.
- **Admin** → **Inbox** page with context filters.
- Open two browsers as different roles and chat live: message delivery,
  unread badge, typing indicator, and read receipts update in real time.

## 8. Rebuilding a service after code changes

```
docker compose up -d --build <service>   # e.g. messaging, customer, dealer, api-gateway
docker restart frontend                  # ALWAYS after rebuilding any backend service
```

`docker restart frontend` is required: nginx caches the backend container's IP at
startup, so after a service is recreated `/ws` and proxied routes would fail
(`502`) until nginx re-resolves.

Notes:

- `messaging` (and other Java services) run an online Maven build inside Docker —
  the first build downloads dependencies and can take a few minutes.
- The frontend image runs `pnpm install` + a TypeScript build inside Docker.

## 9. Troubleshooting cheatsheet

| Symptom | Cause / fix |
|---|---|
| Login `401` / `000` right after start | Gateway LB cache not warm — repeat step 5 |
| `/dealers` → `401`, or REST returns `503`/`500` | Same as above; re-probe until `200` |
| Chat works but no live updates | Run `docker restart frontend` after a messaging rebuild |
| `/ws` → `502` | nginx DNS cache — `docker restart frontend` |
| `service-appointment` missing from Eureka | Known quirk; unrelated to messaging |
| Full reset (volumes persist) | `docker compose down` then `docker compose up -d` |

## 10. Ports / endpoints quick reference

| Service | Port | Notes |
|---|---:|---|
| Frontend (nginx) | 3000 | SPA + `/ws` WebSocket proxy |
| API Gateway | 8080 | `POST /api/auth/login`, routes `/api/messages/**` etc. |
| Eureka | 8761 | Service discovery dashboard |
| Customer | 8081 | `GET /dealers` |
| Dealer | 8083 | Dealer data |
| User/Role | 8092 | Auth + `/api/users/me` |
| Messaging | 8101 | REST + STOMP `/ws` (handshake auth via `?token=`) |
| Order | 8082 | Orders |
| Vehicle | 8084 | Vehicles |
| Permission | 8091 | Permissions |
| Appointment | — | `service-appointment` |