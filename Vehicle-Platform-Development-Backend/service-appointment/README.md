# Service Appointment

## Overview

`service-appointment` is a Spring Boot microservice responsible for managing vehicle service appointments.

The service provides REST APIs to create, retrieve, update, and delete service appointments. Appointment data is persisted in PostgreSQL using Spring Data JPA.

The service is designed as an independent microservice and can be integrated with other services in the BMW TechWorks vehicle platform.

---

## Responsibilities

The Appointment Service is responsible for:

* Creating service appointments
* Retrieving a single appointment by ID
* Retrieving all appointments
* Updating existing appointments
* Deleting appointments
* Persisting appointment information in PostgreSQL
* Handling appointment-not-found errors through centralized exception handling
* Assigning `REQUESTED` as the default appointment status when no status is provided

---

## Technology Stack

| Technology      | Purpose                         |
| --------------- | ------------------------------- |
| Java 21         | Application development         |
| Spring Boot     | Backend application framework   |
| Spring Web      | REST API development            |
| Spring Data JPA | Database persistence            |
| Hibernate       | ORM                             |
| PostgreSQL      | Relational database             |
| Maven           | Build and dependency management |

---

## Project Structure

```text
service-appointment/
│
├── README.md
├── pom.xml
│
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/bmwtechworks/serviceappointment/
│   │   │       │
│   │   │       ├── ServiceAppointmentApplication.java
│   │   │       │
│   │   │       ├── controller/
│   │   │       │   └── AppointmentController.java
│   │   │       │
│   │   │       ├── service/
│   │   │       │   ├── AppointmentService.java
│   │   │       │   └── AppointmentServiceImpl.java
│   │   │       │
│   │   │       ├── repository/
│   │   │       │   └── AppointmentRepository.java
│   │   │       │
│   │   │       ├── model/
│   │   │       │   └── Appointment.java
│   │   │       │
│   │   │       └── exception/
│   │   │           ├── AppointmentNotFoundException.java
│   │   │           └── GlobalExceptionHandler.java
│   │   │
│   │   └── resources/
│   │       └── application.properties
│   │
│   └── test/
│       └── java/
│           └── com/bmwtechworks/serviceappointment/
│               └── ServiceAppointmentApplicationTests.java
│
└── .mvn/
    └── wrapper/
```

### Package Responsibilities

#### `model`

Contains the JPA entity representing an appointment.

**Class:**

* `Appointment`

The appointment contains:

* `id`
* `customerId`
* `vehicleId`
* `dealerId`
* `appointmentDate`
* `serviceType`
* `status`

---

#### `repository`

Provides database access using Spring Data JPA.

**Interface:**

* `AppointmentRepository`

The repository extends:

```text
JpaRepository<Appointment, Long>
```

This provides standard CRUD operations without requiring manual SQL queries.

---

#### `service`

Contains the application's business logic.

**Classes:**

* `AppointmentService`
* `AppointmentServiceImpl`

The service layer handles:

* Appointment creation
* Appointment retrieval
* Appointment updates
* Appointment deletion
* Appointment-not-found validation
* Default appointment status assignment

---

#### `controller`

Exposes REST endpoints for appointment management.

**Class:**

* `AppointmentController`

Base URL:

```text
/api/appointments
```

---

#### `exception`

Contains custom exception handling.

**Classes:**

* `AppointmentNotFoundException`
* `GlobalExceptionHandler`

When an appointment cannot be found, the service throws `AppointmentNotFoundException`, which is converted into a standardized HTTP `404 Not Found` response.

---

## Application Configuration

The application runs on port:

```text
8100
```

Example `application.properties`:

```properties
spring.application.name=service-appointment

server.port=8100

spring.datasource.url=jdbc:postgresql://localhost:5432/service_appointment
spring.datasource.username=abhivesh
spring.datasource.password=
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

> Database credentials should be externalized for shared, staging, and production environments rather than committing sensitive credentials to source control.

---

# Database

## PostgreSQL

The service uses PostgreSQL for persistent appointment storage.

### Database

```text
service_appointment
```

### Default Port

```text
5432
```

### Table

Hibernate automatically creates/updates the following table based on the JPA entity:

```text
appointments
```

The table contains the appointment information defined in `Appointment.java`.

---

# API Documentation

Base URL:

```text
http://localhost:8100/api/appointments
```

## 1. Create Appointment

### Request

```http
POST /api/appointments
```

### Request Body

```json
{
  "customerId": "C001",
  "vehicleId": "V001",
  "dealerId": "D001",
  "appointmentDate": "2026-09-20T10:00:00",
  "serviceType": "General Service"
}
```

The `status` field is optional during creation.

If no status is provided, the service assigns:

```text
REQUESTED
```

### Example Response

```json
{
  "customerId": "C001",
  "vehicleId": "V001",
  "dealerId": "D001",
  "appointmentDate": "2026-09-20T10:00:00",
  "serviceType": "General Service",
  "status": "REQUESTED",
  "id": 1
}
```

### HTTP Status

```text
201 Created
```

---

## 2. Get All Appointments

### Request

```http
GET /api/appointments
```

### Example Response

```json
[
  {
    "customerId": "C001",
    "vehicleId": "V001",
    "dealerId": "D001",
    "appointmentDate": "2026-09-20T10:00:00",
    "serviceType": "General Service",
    "status": "REQUESTED",
    "id": 1
  }
]
```

### HTTP Status

```text
200 OK
```

If no appointments exist:

```json
[]
```

---

## 3. Get Appointment by ID

### Request

```http
GET /api/appointments/{id}
```

### Example

```http
GET /api/appointments/1
```

### Example Response

```json
{
  "customerId": "C001",
  "vehicleId": "V001",
  "dealerId": "D001",
  "appointmentDate": "2026-09-20T10:00:00",
  "serviceType": "General Service",
  "status": "REQUESTED",
  "id": 1
}
```

### HTTP Status

```text
200 OK
```

---

## 4. Update Appointment

### Request

```http
PUT /api/appointments/{id}
```

### Example

```http
PUT /api/appointments/1
```

### Request Body

```json
{
  "customerId": "C001",
  "vehicleId": "V001",
  "dealerId": "D002",
  "appointmentDate": "2026-09-21T11:00:00",
  "serviceType": "Oil Change",
  "status": "CONFIRMED"
}
```

### Example Response

```json
{
  "customerId": "C001",
  "vehicleId": "V001",
  "dealerId": "D002",
  "appointmentDate": "2026-09-21T11:00:00",
  "serviceType": "Oil Change",
  "status": "CONFIRMED",
  "id": 1
}
```

### HTTP Status

```text
200 OK
```

---

## 5. Delete Appointment

### Request

```http
DELETE /api/appointments/{id}
```

### Example

```http
DELETE /api/appointments/1
```

### HTTP Status

```text
204 No Content
```

No response body is returned after successful deletion.

---

# Error Handling

The service uses centralized exception handling through `GlobalExceptionHandler`.

## Appointment Not Found

If an appointment ID does not exist:

```http
GET /api/appointments/999
```

The service returns:

```json
{
  "error": "Appointment Not Found",
  "message": "Appointment not found with id: 999",
  "timestamp": "2026-09-15T15:03:19.146197",
  "status": 404
}
```

### HTTP Status

```text
404 Not Found
```

---

# Running the Application

## Prerequisites

Ensure the following are installed:

* Java 21
* Maven Wrapper
* PostgreSQL

Verify PostgreSQL:

```bash
pg_isready
```

Expected:

```text
accepting connections
```

---

## Start PostgreSQL

Using Homebrew:

```bash
brew services start postgresql
```

---

## Create Database

Open PostgreSQL:

```bash
psql -d postgres
```

Create the database:

```sql
CREATE DATABASE service_appointment;
```

Connect to it:

```sql
\c service_appointment
```

Exit:

```sql
\q
```

---

## Start the Service

From the project root:

```bash
./mvnw spring-boot:run
```

The application starts on:

```text
http://localhost:8100
```

---

# Testing

The service can be tested using:

* cURL
* Postman
* IntelliJ HTTP Client

### Example

```bash
curl http://localhost:8100/api/appointments
```

Expected response when the database is empty:

```json
[]
```

---

# Build

To compile the project:

```bash
./mvnw clean compile
```

To run tests:

```bash
./mvnw test
```

To package the application:

```bash
./mvnw clean package
```

---

# Current Functional Scope

The current implementation provides:

* REST-based appointment management
* PostgreSQL persistence
* Spring Data JPA integration
* CRUD operations
* Default appointment status
* Appointment-not-found exception handling
* Centralized REST error response

The service currently operates independently and does not require the complete platform environment to perform its core CRUD operations.

---

# Service Endpoint Summary

| Method   | Endpoint                 | Purpose              | Response                           |
| -------- | ------------------------ | -------------------- | ---------------------------------- |
| `POST`   | `/api/appointments`      | Create appointment   | `201 Created`                      |
| `GET`    | `/api/appointments`      | Get all appointments | `200 OK`                           |
| `GET`    | `/api/appointments/{id}` | Get appointment      | `200 OK` / `404 Not Found`         |
| `PUT`    | `/api/appointments/{id}` | Update appointment   | `200 OK` / `404 Not Found`         |
| `DELETE` | `/api/appointments/{id}` | Delete appointment   | `204 No Content` / `404 Not Found` |

---

# Development Status

**Status:** Functional standalone service

The core appointment CRUD APIs, PostgreSQL persistence, and exception handling have been implemented and manually verified.
