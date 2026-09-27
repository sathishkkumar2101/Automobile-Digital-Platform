# Automobile Digital Platform — Deployment & Operations Guide

## 1. Overview & Architecture

The entire platform is packaged into 19 Docker containers orchestrated via a single Docker Compose specification located in `Vehicle-Platform-Development-Backend/docker-compose.yml`.

```
                    +---------------------------+
                    |    Docker Compose Host    |
                    |                           |
                    |   [ Frontend :3000 ]      |
                    |            |              |
                    |   [ API Gateway :8080 ]   |
                    |            |              |
                    |   [ Eureka Server :8761 ] |
                    |            |              |
                    |   [ 8 Microservices ]     |
                    |            |              |
                    |   [ 8 PostgreSQL 17 DBs ] |
                    +---------------------------+
```

---

## 2. Prerequisites

| Software | Minimum Version | Verified Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Docker Desktop / Engine** | 24.0+ | 27.x+ | Container runtime |
| **Docker Compose** | v2.20+ | v2.30+ | Multi-container orchestration |
| **Node.js** (Optional for local dev) | 20.x LTS | 22.x | Frontend build and API test execution |
| **JDK** (Optional for local dev) | 21 LTS | OpenJDK 21 | Spring Boot compilation |
| **PowerShell / Bash** | 5.1+ / 5.x | Native | Command-line execution |

---

## 3. Environment Configuration

The application requires two cryptographic secrets configured in `Vehicle-Platform-Development-Backend/.env`.

### Step 1: Create `.env` from template
```bash
cd Vehicle-Platform-Development-Backend
cp .env.example .env
```
*(On Windows PowerShell)*:
```powershell
Copy-Item .env.example .env
```

### Step 2: Configure Environment Variables
Edit `.env` and supply 32+ character secrets (do not commit `.env` to git):
```ini
# HMAC-SHA256 signing key for JWT tokens (minimum 32 characters)
JWT_SECRET=supersecretjwtkey12345678901234567890

# Pin issuer and audience
JWT_ISSUER=bmw-vehicle-platform
JWT_AUDIENCE=bmw-vehicle-platform-api

# Shared secret for internal inter-service endpoints (minimum 32 characters)
INTERNAL_SERVICE_SECRET=supersecretinternalkey12345678901234
```

---

## 4. Build and Startup Procedures

### 4.1 Cold Startup (First-time / Clean Build)
Run the following command from `Vehicle-Platform-Development-Backend`:
```bash
docker compose up -d --build
```
This performs:
1. Multi-stage Docker builds for all 8 Spring Boot services, Eureka, and API Gateway.
2. Production build (`pnpm run build` / `vite build`) of the React frontend into static Nginx distribution.
3. Spawns 8 PostgreSQL 17 database containers with isolated named volumes.
4. Waits for DB health checks (`pg_isready`) before launching dependent microservices.
5. Registers all services dynamically with Netflix Eureka.

---

## 5. Port Mapping & Container Inventory

The 19 containers expose the following host ports:

| Container Name | Service Name | Host Port | Internal Port | Healthcheck |
| :--- | :--- | :--- | :--- | :--- |
| `frontend` | Frontend SPA / Nginx | **3000** | 80 | None (HTTP ready) |
| `api-gateway` | Spring Cloud Gateway | **8080** | 8080 | None (HTTP ready) |
| `eureka-server` | Service Discovery | **8761** | 8761 | None (HTTP ready) |
| `customer-service` | Customer Service | - | 8081 | Registered in Eureka |
| `order-service` | Order Service | - | 8082 | Registered in Eureka |
| `dealer-service` | Dealer Service | - | 8083 | Registered in Eureka |
| `vehicle-service` | Vehicle Service | - | 8084 | Registered in Eureka |
| `permission-service`| Permission Service | - | 8091 | Registered in Eureka |
| `user-role-service`| User & Role Service | - | 8092 | Registered in Eureka |
| `service-appointment`| Service Appt Service | - | 8100 | Registered in Eureka |
| `messaging-service`| Messaging & Chat | - | 8101 | Registered in Eureka |
| `postgres-order` | Order Database | **5433** | 5432 | `pg_isready -d order` |
| `postgres-customer`| Customer Database | **5434** | 5432 | `pg_isready -d customer` |
| `postgres-dealer` | Dealer Database | **5435** | 5432 | `pg_isready -d dealer_db` |
| `postgres-vehicle` | Vehicle Database | **5436** | 5432 | `pg_isready -d vehicle_db` |
| `postgres-service-appointment` | Appointment Database | **5437** | 5432 | `pg_isready -d service_appointment` |
| `postgres-permission` | Permission Database | **5438** | 5432 | `pg_isready -d permission_db` |
| `postgres-user-role` | User & Role Database| **5439** | 5432 | `pg_isready -d user_role_db` |
| `postgres-messaging` | Messaging Database | **5440** | 5432 | `pg_isready -d messaging` |

---

## 6. Verification & Health Monitoring

### 6.1 Check Container Status
```bash
docker compose ps
```
*Expected*: All 19 containers show state `Up` or `Up (healthy)`.

### 6.2 Verify Eureka Service Registry
Open your browser and navigate to:
```
http://localhost:8761
```
All 8 backend microservices should be listed under **Instances currently registered with Eureka**:
- `API-GATEWAY`
- `CUSTOMER`
- `DEALER-SERVICE`
- `MESSAGING-SERVICE`
- `ORDER-SERVICE`
- `PERMISSION-SERVICE`
- `SERVICE-APPOINTMENT`
- `USER-ROLE-SERVICE`
- `VEHICLE-SERVICE`

### 6.3 Verify Frontend
Navigate to:
```
http://localhost:3000
```
Should display the BMW Automobile Digital Platform login interface.

---

## 7. Operational Runbook

### 7.1 Viewing Logs
To stream logs across all containers:
```bash
docker compose logs -f
```
To stream logs for a specific service:
```bash
docker compose logs -f api-gateway
docker compose logs -f messaging-service
docker compose logs -f frontend
```

### 7.2 Rebuilding a Single Microservice
If you modify code in a single service (e.g., `dealer`):
```bash
docker compose up -d --build dealer
```

### 7.3 Stopping the Platform
To halt running containers without deleting database state:
```bash
docker compose stop
```

### 7.4 Complete System Reset (Factory Reset)
To erase all volumes, purge seed changes, and test from a clean state:
```bash
docker compose down -v
docker compose up -d --build
```
*(All 8 databases will automatically re-run their `seed.sql` on startup).*
