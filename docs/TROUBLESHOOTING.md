# Automobile Digital Platform — Troubleshooting & Known Issues Guide

This document captures real technical issues encountered during the engineering and integration of the platform, along with the root causes, diagnostic commands, and permanent resolutions.

---

## 1. Missing `.env` Variables on `docker compose up`

### Symptom:
Running `docker compose up -d --build` immediately aborts with:
```
error while interpolating services.api-gateway.environment.INTERNAL_SERVICE_SECRET: required variable INTERNAL_SERVICE_SECRET is missing a value: set INTERNAL_SERVICE_SECRET in .env - see .env.example
error while interpolating services.api-gateway.environment.JWT_SECRET: required variable JWT_SECRET is missing a value: set JWT_SECRET in .env - see .env.example
```

### Root Cause:
`docker-compose.yml` uses strict interpolation syntax (`${JWT_SECRET:?error}`) to prevent launching the platform with insecure empty keys. If `.env` does not exist or has empty keys, Compose refuses to start.

### Solution:
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
2. Populate `JWT_SECRET` and `INTERNAL_SERVICE_SECRET` with at least 32 random characters:
   ```ini
   JWT_SECRET=supersecretjwtkey12345678901234567890
   INTERNAL_SERVICE_SECRET=supersecretinternalkey12345678901234
   ```
3. Re-run `docker compose up -d`.

---

## 2. Docker Container Name Conflict

### Symptom:
```
Error response from daemon: Conflict. The container name "/postgres-messaging" is already in use by container "9fd6...". You have to remove (or rename) that container to be able to reuse that name.
```

### Root Cause:
An orphaned or pre-existing container created outside Compose is retaining the static container name.

### Solution:
Force-remove the conflicting container:
```bash
docker rm -f postgres-messaging
```
Then restart the stack:
```bash
docker compose up -d
```

---

## 3. Nginx 502 Bad Gateway on Container Recreation

### Symptom:
After restarting `api-gateway` or `messaging-service`, frontend API calls fail with `502 Bad Gateway`.

### Root Cause:
By default, Nginx resolves domain names once at startup and caches the IP address indefinitely. When Docker recreates a container, it assigns a new IP address, and Nginx continues attempting to connect to the stale address.

### Permanent Solution (`Frontend-main/nginx.conf`):
1. Configure Docker's internal DNS resolver with a 10-second TTL:
   ```nginx
   resolver 127.0.0.11 valid=10s ipv6=off;
   ```
2. Assign the upstream to a dynamic variable:
   ```nginx
   location /api/ {
       set $gateway_upstream http://api-gateway:8080;
       proxy_pass $gateway_upstream$request_uri;
   }
   ```
This forces Nginx to dynamically re-resolve the IP through Docker DNS.

---

## 4. Eureka Stale Instance Routing Failure

### Symptom:
The API Gateway returns `500 Internal Server Error` or `Service Unavailable` even though microservice containers show `Up`.

### Root Cause:
1. By default, Eureka clients register using their transient container hostnames. When a container restarts, Docker DNS only knows the current ID, causing routing to fail until the old entry expires.
2. Spring Cloud Gateway load balancer caches instance lists for 35 seconds.

### Permanent Solution:
1. Force registration via IP address:
   ```yaml
   EUREKA_INSTANCE_PREFER_IP_ADDRESS: "true"
   ```
2. Shorten lease renewal and expiration intervals in `docker-compose.yml`:
   ```yaml
   EUREKA_INSTANCE_LEASE_RENEWAL_INTERVAL_IN_SECONDS: "10"
   EUREKA_INSTANCE_LEASE_EXPIRATION_DURATION_IN_SECONDS: "30"
   ```
3. Lower Gateway load balancer cache TTL in `api-gateway/src/main/resources/application.properties`:
   ```properties
   spring.cloud.loadbalancer.cache.ttl=5s
   ```

---

## 5. WebSocket Handshake Failure Through API Gateway

### Symptom:
STOMP client cannot establish a WebSocket connection when connecting through `/api/messages/ws`.

### Root Cause:
The Spring Cloud Gateway Server WebMVC dependency used in `api-gateway` does not support raw WebSocket connection upgrade handshakes.

### Permanent Solution:
In `Frontend-main/nginx.conf`, route `/ws` directly to `messaging-service:8101`, bypassing the Gateway:
```nginx
location /ws {
    set $messaging_upstream http://messaging-service:8101;
    proxy_pass $messaging_upstream$request_uri;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

---

## 6. Frontend `id: number` vs Backend `id: UUID` Mismatch

### Symptom:
Frontend forms sent integer IDs to backend endpoints expecting `UUID`, resulting in `400 Bad Request` or JSON deserialization errors.

### Root Cause:
Original frontend mock data typed IDs as integers (`id: 1`). The Spring Boot backend used `java.util.UUID`.

### Permanent Solution:
Updated `Frontend-main/src/types/index.ts` so that all identifiers (`id`, `userId`, `customerId`, `dealerId`, `vehicleId`) are explicitly typed as `string`.

---

## 7. Customer Profile ID vs User ID in Appointments

### Symptom:
A customer booked a service appointment, but could not see it in their appointment list, or the dealer saw an unnamed customer.

### Root Cause:
Appointments were created using `users.id` (the account ID), whereas the database and queries expected `customers.id` (the customer profile ID). Since `users.id != customers.id`, queries filtering by profile ID found no rows.

### Permanent Solution:
Customer appointment booking flows now query `/api/v1/customers/me` to obtain the true `customers.id` before dispatching the booking payload to `service-appointment`.
