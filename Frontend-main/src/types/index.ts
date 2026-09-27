export type Role = 'CUSTOMER' | 'DEALER' | 'ADMIN';

export interface User {
  id: string;
  username?: string;
  email: string;
  name: string;
  role: Role;
  roleId?: string;
  phone?: string;
  createdAt?: string;
}

export interface AuthTokens {
  token: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message?: string;
  token: string;
  refreshToken?: string;
  user?: User;
}

export type VehicleStatus = 'AVAILABLE' | 'SOLD' | 'RESERVED';
export type OrderStatus = 'CREATED' | 'CONFIRMED' | 'IN_PRODUCTION' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type AppointmentStatus = 'REQUESTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ServiceType = 'MAINTENANCE' | 'REPAIR' | 'INSPECTION' | 'WARRANTY' | 'DETAILING' | string;

export interface Vehicle {
  vehicleId: string;
  model: string;
  trim?: string;
  color?: string;
  vin?: string;
  price: number;
  status: VehicleStatus;
  dealerId?: string;
  image?: string;
  images?: string[];
  bodyType?: string;
  description?: string;
  engine?: string;
  transmission?: string;
  fuelType?: string;
  mileage?: number;
  features?: string[];
}

export interface Dealer {
  dealerId: string;
  userId?: string;
  name: string;
  location?: string;
}

export interface DealerInput {
  username?: string;
  name: string;
  location?: string;
}

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string[];
  createdAt?: string;
}

export interface Order {
  id: string;
  customerId: string;
  vehicleId: string;
  dealerId?: string;
  status: OrderStatus;
  totalAmount: number;
  createdAt?: string;
  customer?: Customer;
  vehicle?: Vehicle;
  downPayment?: number;
  notes?: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  vehicleId?: string;
  dealerId?: string;
  serviceType: ServiceType;
  status: AppointmentStatus;
  appointmentDate: string;
  customer?: Customer;
  vehicle?: Vehicle;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedCost?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  timestamp?: string;
}

export interface DashboardStats {
  totalVehicles?: number;
  availableVehicles?: number;
  totalOrders?: number;
  pendingOrders?: number;
  totalCustomers?: number;
  totalRevenue?: number;
  totalAppointments?: number;
  scheduledAppointments?: number;
}

export interface Permission {
  id: string;
  name: string;
  description?: string;
}

export interface RoleDetail {
  id: string;
  name: string;
  description?: string;
  permissions?: Permission[];
}

