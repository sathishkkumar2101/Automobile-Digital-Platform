# Automobile Digital Platform — User Guide

This user guide walks reviewers and trainers through the workflows implemented in the Automobile Digital Platform across its three primary personas: **Customer**, **Dealer**, and **Administrator**.

---

## 1. Quick Reference: Seed Test Credentials

Use these pre-seeded local credentials to log into `http://localhost:3000/login`:

| Role | Username / Location | Email | Password |
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

## 2. Customer Portal Workflow

### Step 1: Registration & Login
1. Navigate to `http://localhost:3000/register`.
2. Enter your Name, Username, Email, and Password.
3. Upon registration, you are automatically assigned the `CUSTOMER` role.
4. Log into `http://localhost:3000/login` with your credentials. You will land on the **Customer Dashboard**.

### Step 2: Customer Onboarding & Profile Setup
1. Click **Profile** in the sidebar navigation (`/customer/profile`).
2. Verify or update your contact phone number and residential delivery address.
3. Click **Save Profile**. This initializes your profile in `postgres-customer`.

### Step 3: Browse Vehicle Catalog
1. Click **Vehicles** (`/customer/vehicles`).
2. Browse the 25 pre-seeded BMW models (e.g. M3 Competition, M5 CS, i4 Gran Coupe, X5 M).
3. Use the filter controls:
   - Filter by **Model** or **Fuel Type** (Petrol, Diesel, Electric).
   - Filter by **Price Range** (in INR).
   - Filter by **Dealership Location**.
4. Click on any vehicle card to view the **Vehicle Details** page (`/customer/vehicles/:id`).

### Step 4: Purchase / Place an Order
1. On the Vehicle Details page, select your preferred regional dealership (e.g., *BMW Chennai*).
2. Click **Reserve & Purchase**.
3. Review total INR pricing and down payment details, then confirm the purchase.
4. Your order is dispatched to `order-service` with status `CREATED`.

### Step 5: Track Your Order
1. Click **My Orders** in the sidebar (`/customer/orders`).
2. View the status lifecycle pill:
   - `CREATED` &rarr; `CONFIRMED` &rarr; `IN_PRODUCTION` &rarr; `SHIPPED` &rarr; `DELIVERED`
3. Click an order to open the **Order Detail** page (`/customer/orders/:id`).

### Step 6: Book a Service Appointment
1. Click **Appointments** (`/customer/appointments`).
2. Click **Book Service** (`/customer/appointments/book`).
3. Select your vehicle, preferred dealership, service type (e.g. `INSPECTION`, `OIL_CHANGE`, `BRAKE_SERVICE`), and date.
4. Submit the booking. The status will initially read `REQUESTED`.

### Step 7: Real-Time Messaging with Dealership
1. Click **Messages** (`/customer/messages`) or click the **Chat with Dealer** button on an order/vehicle card.
2. A WebSocket connection is established to `/ws`.
3. Type a message regarding your vehicle or order delivery timeline. The dealer receives the notification instantly.

---

## 3. Dealer Portal Workflow

### Step 1: Login & Dealer Context Resolution
1. Log in with `dealer1@bmwtechworks.com` and `Dealer@123`.
2. The platform automatically calls `/dealers/me`, mapping your account to **BMW Chennai**.

### Step 2: Dealership Dashboard
1. The **Dealer Dashboard** (`/dealer`) displays live KPIs:
   - Total Vehicles in Chennai Inventory
   - Active Customer Orders
   - Scheduled Service Appointments
   - Real-Time Unread Chat Inquiries

### Step 3: Manage Dealership Inventory
1. Click **Inventory** (`/dealer/inventory`).
2. View vehicles currently allocated to your dealership.
3. Update vehicle availability status (`AVAILABLE`, `RESERVED`, `SOLD`).

### Step 4: Process Customer Orders
1. Click **Orders** (`/dealer/orders`).
2. Review orders placed by customers at your dealership. *(Note: Cross-dealer isolation ensures you never see orders placed at other dealerships).*
3. Advance the order lifecycle:
   - Move from `CREATED` &rarr; `CONFIRMED`.
   - Update to `IN_PRODUCTION` or `SHIPPED` once delivery commences.
   - Mark as `DELIVERED` upon customer handover.

### Step 5: Workshop Service Appointments
1. Click **Appointments** (`/dealer/appointments`).
2. Review customer service bookings.
3. Accept and transition appointment status:
   - `REQUESTED` &rarr; `CONFIRMED`
   - `CONFIRMED` &rarr; `IN_PROGRESS`
   - `IN_PROGRESS` &rarr; `COMPLETED`
4. Enter workshop repair notes or estimated cost updates.

### Step 6: Customer CRM & Chat
1. Click **Customers** (`/dealer/customers`) to view customers associated with your dealership's orders.
2. Click **Messages** (`/dealer/messages`) to respond to customer inquiries in real time.

---

## 4. Administrator Portal Workflow

### Step 1: Admin Login
1. Log in with `admin@bmwtechworks.com` and `Admin@123`.
2. You will be routed to `/admin` (enforced by `RoleGuard(ADMIN)`).

### Step 2: Platform Master Dashboard
1. The **Admin Dashboard** (`/admin`) aggregates system-wide metrics across all 5 dealerships:
   - Total System Users & Active Roles
   - Global Vehicle Inventory & Availability Rate
   - Total Platform Orders & Gross Merchandise Value
   - Total Workshop Appointments

### Step 3: User & Access Management
1. Click **Users** (`/admin/users`) to inspect all platform user accounts.
2. Add new dealer staff or administrative accounts.
3. Click **Roles & Permissions** (`/admin/roles-permissions`) to inspect assigned granular permission sets.

### Step 4: Dealership & Vehicle Catalog Management
1. Click **Dealers** (`/admin/dealers`) to manage the 5 regional facilities.
2. Click **Vehicles** (`/admin/vehicles`) to add new BMW models, adjust base retail pricing, update specifications, or allocate inventory across dealers.

### Step 5: Global Orders & Appointments Oversight
1. Click **Orders** (`/admin/orders`) to audit any order across all dealerships.
2. Click **Appointments** (`/admin/appointments`) to monitor workshop workload.
3. Click **Inbox** (`/admin/inbox`) to audit system communications.
