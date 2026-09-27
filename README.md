# Automobile Digital Platform

[![Java](https://img.shields.io/badge/Java-21-orange.svg)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.1-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2025.1.3-blue.svg)](https://spring.io/projects/spring-cloud)
[![React](https://img.shields.io/badge/React-19.0.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-19%20Containers-2496ed.svg)](https://www.docker.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791.svg)](https://www.postgresql.org/)

An enterprise-grade, cloud-native digital automotive retail, dealership operations, vehicle ordering, service appointment scheduling, and real-time customer messaging platform built for **BMW TechWorks India**.

---

## 📖 Detailed Project Documentation

The repository contains an exhaustive, trainer-submission-ready technical documentation package located in the [`docs/`](docs/) directory:

- 📘 **[Comprehensive Project Report](docs/PROJECT_REPORT.md)** — Complete 43-section enterprise project report with full academic and technical details.
- 🏛️ **[System Architecture](docs/ARCHITECTURE.md)** — Microservices decomposition, C4 diagrams, network topologies, and request flows.
- 📡 **[API Documentation](docs/API_DOCUMENTATION.md)** — Complete inventory of 40+ REST and WebSocket STOMP endpoints.
- 💾 **[Database Design](docs/DATABASE_DESIGN.md)** — Schemas, entity-relationship diagrams, and tables across all 8 isolated PostgreSQL databases.
- 🔒 **[Security Architecture](docs/SECURITY.md)** — JWT validation, header sanitization, role-based authorization, and IDOR defenses.
- 🚀 **[Deployment Runbook](docs/DEPLOYMENT.md)** — Step-by-step operations guide, Docker Compose configurations, and healthchecks.
- 🧪 **[Testing Strategy](docs/TESTING.md)** — Test execution matrices, E2E suites, and verification scripts.
- 👤 **[User Guide](docs/USER_GUIDE.md)** — Walkthroughs for Customer, Dealer, and Administrator workflows.
- 💻 **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** — Guide for onboarding new engineers and extending services.
- 🛠️ **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** — Solutions for Docker, Nginx, Eureka, and network challenges.
- 📜 **[Changelog](docs/CHANGELOG.md)** — Chronological Phase 1 to Phase 5 evolutionary history.
- 📋 **[Documentation Audit](docs/DOCUMENTATION_AUDIT.md)** — Audit and verification summary report.

---

## 1. Project Overview

The **Automobile Digital Platform** unifies automotive commerce across five major regional dealerships in India:
- **BMW Chennai**
- **BMW Bangalore**
- **BMW Hyderabad**
- **BMW Mumbai**
- **BMW Delhi**

The platform connects three core user personas into an integrated workflow:
1. **Retail Customers**: Browse catalog, place orders, book workshop service appointments, and chat with dealers.
2. **Dealership Staff**: Manage regional vehicle inventory, fulfill customer orders, manage workshop appointments, and message buyers.
3. **Platform Administrators**: Maintain centralized oversight over identity accounts, roles, permissions, master catalogs, and operational audits.

---

## 2. Key Features

- **Master Vehicle Catalog**: 25 pre-seeded BMW performance models with specifications, VIN tracking, and multi-attribute filtering.
- **Order Lifecycle Management**: Complete purchase order workflow tracked across states: `CREATED` &rarr; `CONFIRMED` &rarr; `IN_PRODUCTION` &rarr; `SHIPPED` &rarr; `DELIVERED`.
- **Workshop Service Appointments**: Scheduled maintenance and repair bookings backed by dynamic `service_types` validation (`REQUESTED` &rarr; `CONFIRMED` &rarr; `IN_PROGRESS` &rarr; `COMPLETED`).
- **Real-Time STOMP Messaging**: Sub-second customer-to-dealer chat over WebSockets with per-message read receipts and typing indicators.
- **Multi-Tenant Data Isolation**: Complete IDOR protection ensuring dealers can only access their own dealership's data, and customers can only access their own orders and appointments.
- **Enterprise Edge Gateway**: Spring Cloud Gateway with custom `IdentityHeaderStrippingFilter` to block spoofed identity headers.

---

## 3. Architecture & Topology

The platform adheres to a **Database-per-Service Microservices Architecture**:

```
[ Client Browser: React 19 SPA ]
              |
              v (Port 3000)
    [ Nginx Reverse Proxy ]
              |
       +------+-----------------------------------+
       | HTTP (:8080)                             | WS (:8101)
       v                                          v
[ Spring Cloud Gateway ]                 [ messaging-service ]
       |                                          |
       +--> [ user-role-service :8092 ] <---------+
       +--> [ customer-service  :8081 ]
       +--> [ dealer-service    :8083 ]
       +--> [ vehicle-service   :8084 ]
       +--> [ order-service     :8082 ]
       +--> [ service-appointment :8100 ]
       +--> [ permission-service:8091 ]
       |
[ Netflix Eureka Service Discovery :8761 ]
       |
[ 8 Isolated PostgreSQL 17 Databases (Ports 5433 - 5440) ]
```

---

## 4. Microservice Inventory

| Service | Port | Database | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **API Gateway** | 8080 | None | Edge routing, JWT validation, header sanitization |
| **Eureka Server** | 8761 | None | Netflix Eureka service discovery registry |
| **user-role-service** | 8092 | `user_role_db` (5439) | Identity, BCrypt credentials, RBAC roles, JWT minting |
| **customer-service** | 8081 | `customer` (5434) | Customer profile management, customer onboarding, addresses |
| **dealer-service** | 8083 | `dealer_db` (5435) | Regional dealership profiles, dealer-scoped inventory and orders |
| **vehicle-service** | 8084 | `vehicle_db` (5436) | Master vehicle catalog, VIN tracking, inventory availability |
| **order-service** | 8082 | `order` (5433) | Vehicle purchase workflows and order lifecycle state machine |
| **service-appointment** | 8100 | `service_appointment` (5437) | Workshop service bookings, service types, repair status |
| **permission-service** | 8091 | `permission_db` (5438) | Granular permission tokens and functional privilege mapping |
| **messaging-service** | 8101 | `messaging` (5440) | Real-time STOMP chat, thread management, unread counts |
| **frontend** | 3000 | None | React 19 SPA served via Nginx with dynamic DNS resolver |

---

## 5. Local Test Accounts

Use these local development credentials to test each role:

| Role | Username / Hub | Email | Password |
| :--- | :--- | :--- | :--- |
| **Administrator** | Master Admin | `admin@bmwtechworks.com` | `Admin@123` |
| **Dealer** | BMW Chennai | `dealer1@bmwtechworks.com` | `Dealer@123` |
| **Dealer** | BMW Bangalore | `dealer2@bmwtechworks.com` | `Dealer@123` |
| **Dealer** | BMW Hyderabad | `dealer3@bmwtechworks.com` | `Dealer@123` |
| **Dealer** | BMW Mumbai | `dealer4@bmwtechworks.com` | `Dealer@123` |
| **Dealer** | BMW Delhi | `dealer5@bmwtechworks.com` | `Dealer@123` |
| **Customer** | Customer 1 | `customer1@bmwtechworks.com` | `Customer@123` |
| **Customer** | Customer 2 | `customer2@bmwtechworks.com` | `Customer@123` |

---

## 6. Quickstart: Running with Docker

### Prerequisites
- Docker Desktop / Engine 24+
- Docker Compose v2.20+

### Step 1: Clone and Configure Environment
```bash
cd Vehicle-Platform-Development-Backend
cp .env.example .env
```
*(On Windows PowerShell)*:
```powershell
Copy-Item .env.example .env
```
Ensure `JWT_SECRET` and `INTERNAL_SERVICE_SECRET` have at least 32 characters in `.env`.

### Step 2: Build and Start Stack
```bash
docker compose up -d --build
```

### Step 3: Access Platform
- **Frontend Portal**: `http://localhost:3000`
- **API Gateway**: `http://localhost:8080`
- **Eureka Dashboard**: `http://localhost:8761`

### Step 4: Verify System Status
```bash
docker compose ps
```
All 19 containers should display state `Up` or `Up (healthy)`.

---

## 7. Automated Testing & Verification

Integration and security test suites are located in `Frontend-main/`:

```bash
cd Frontend-main

# Run all E2E integration, security, and messaging tests
npm run test:api

# Run TypeScript static type check
npm run typecheck

# Verify frontend production build
npm run build
```

---

## 8. License

This project was developed for enterprise training at **BMW TechWorks India**. All rights reserved.
