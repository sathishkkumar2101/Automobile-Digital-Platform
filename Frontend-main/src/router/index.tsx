import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';

// Lazy-load pages
const Login = React.lazy(() => import('../pages/auth/Login'));
const Register = React.lazy(() => import('../pages/auth/Register'));
const CustomerLayout = React.lazy(() => import('../components/layout/CustomerLayout'));
const DealerLayout = React.lazy(() => import('../components/layout/DealerLayout'));
const AdminLayout = React.lazy(() => import('../components/layout/AdminLayout'));

// Customer
const CustomerDashboard = React.lazy(() => import('../pages/customer/Dashboard'));
const CustomerVehicles = React.lazy(() => import('../pages/customer/Vehicles'));
const VehicleDetail = React.lazy(() => import('../pages/customer/VehicleDetail'));
const CustomerDealers = React.lazy(() => import('../pages/customer/Dealers'));
const CustomerOrders = React.lazy(() => import('../pages/customer/Orders'));
const OrderDetail = React.lazy(() => import('../pages/customer/OrderDetail'));
const DealerDetail = React.lazy(() => import('../pages/customer/DealerDetail'));
const CustomerAppointments = React.lazy(() => import('../pages/customer/Appointments'));
const BookService = React.lazy(() => import('../pages/customer/BookService'));
const CustomerProfile = React.lazy(() => import('../pages/customer/Profile'));
const CustomerMessages = React.lazy(() => import('../pages/customer/Messages'));

// Dealer
const DealerDashboard = React.lazy(() => import('../pages/dealer/Dashboard'));
const DealerInventory = React.lazy(() => import('../pages/dealer/Inventory'));
const DealerOrders = React.lazy(() => import('../pages/dealer/Orders'));
const DealerCustomers = React.lazy(() => import('../pages/dealer/Customers'));
const DealerAppointments = React.lazy(() => import('../pages/dealer/Appointments'));
const DealerProfile = React.lazy(() => import('../pages/dealer/Profile'));
const DealerMessages = React.lazy(() => import('../pages/dealer/Messages'));

// Admin
const AdminDashboard = React.lazy(() => import('../pages/admin/Dashboard'));
const AdminUsers = React.lazy(() => import('../pages/admin/Users'));
const AdminVehicles = React.lazy(() => import('../pages/admin/Vehicles'));
const AdminDealers = React.lazy(() => import('../pages/admin/Dealers'));
const AdminCustomers = React.lazy(() => import('../pages/admin/Customers'));
const AdminOrders = React.lazy(() => import('../pages/admin/Orders'));
const AdminAppointments = React.lazy(() => import('../pages/admin/Appointments'));
const AdminRolesPermissions = React.lazy(() => import('../pages/admin/RolesPermissions'));
const AdminProfile = React.lazy(() => import('../pages/admin/Profile'));
const AdminInbox = React.lazy(() => import('../pages/admin/Inbox'));


function LoadingScreen() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono">Loading</p>
      </div>
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RoleGuard({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeFor(user.role)} replace />;
}

/**
 * Where each role's inbox lives.
 *
 * <p>The admin inbox is at `/admin/inbox` rather than `/admin/messages`, so the
 * mapping is not a uniform suffix and any code that assumes it is will send
 * admins to a 404.
 */
function inboxFor(role: Role): string {
  if (role === 'ADMIN') return '/admin/inbox';
  if (role === 'DEALER') return '/dealer/messages';
  return '/customer/messages';
}

function homeFor(role: Role): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'DEALER') return '/dealer';
  return '/customer';
}

/**
 * `/messages` for whoever is signed in.
 *
 * <p>`ChatStartButton` defaults `redirectTo` to `/messages`, and there was no
 * such route, so the catch-all turned it into `/` and `RootRedirect` put the
 * user on their dashboard. The click registered, the UI did nothing visibly
 * wrong, and the user landed somewhere they had not asked for. Components
 * needing a messaging destination can pass a role-specific path, but the shared
 * default now resolves instead of silently redirecting.
 */
function MessagesRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={inboxFor(user.role)} replace />;
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<LoadingScreen />}>{children}</React.Suspense>;
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/login',
    element: <SuspenseWrapper><Login /></SuspenseWrapper>,
  },
  {
    path: '/register',
    element: <SuspenseWrapper><Register /></SuspenseWrapper>,
  },
  {
    path: '/messages',
    element: <MessagesRedirect />,
  },
  {
    path: '/customer',
    element: (
      <AuthGuard>
        <RoleGuard role="CUSTOMER">
          <SuspenseWrapper><CustomerLayout /></SuspenseWrapper>
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><CustomerDashboard /></SuspenseWrapper> },
      { path: 'vehicles', element: <SuspenseWrapper><CustomerVehicles /></SuspenseWrapper> },
      { path: 'vehicles/:id', element: <SuspenseWrapper><VehicleDetail /></SuspenseWrapper> },
      { path: 'dealers', element: <SuspenseWrapper><CustomerDealers /></SuspenseWrapper> },
      { path: 'orders', element: <SuspenseWrapper><CustomerOrders /></SuspenseWrapper> },
      { path: 'orders/:id', element: <SuspenseWrapper><OrderDetail /></SuspenseWrapper> },
      { path: 'dealers/:id', element: <SuspenseWrapper><DealerDetail /></SuspenseWrapper> },
      { path: 'appointments', element: <SuspenseWrapper><CustomerAppointments /></SuspenseWrapper> },
      { path: 'appointments/book', element: <SuspenseWrapper><BookService /></SuspenseWrapper> },
      { path: 'messages', element: <SuspenseWrapper><CustomerMessages /></SuspenseWrapper> },
      { path: 'profile', element: <SuspenseWrapper><CustomerProfile /></SuspenseWrapper> },
    ],
  },
  {
    path: '/dealer',
    element: (
      <AuthGuard>
        <RoleGuard role="DEALER">
          <SuspenseWrapper><DealerLayout /></SuspenseWrapper>
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><DealerDashboard /></SuspenseWrapper> },
      { path: 'inventory', element: <SuspenseWrapper><DealerInventory /></SuspenseWrapper> },
      { path: 'orders', element: <SuspenseWrapper><DealerOrders /></SuspenseWrapper> },
      { path: 'customers', element: <SuspenseWrapper><DealerCustomers /></SuspenseWrapper> },
      { path: 'appointments', element: <SuspenseWrapper><DealerAppointments /></SuspenseWrapper> },
      { path: 'messages', element: <SuspenseWrapper><DealerMessages /></SuspenseWrapper> },
      { path: 'profile', element: <SuspenseWrapper><DealerProfile /></SuspenseWrapper> },
    ],
  },
  {
    path: '/admin',
    element: (
      <AuthGuard>
        <RoleGuard role="ADMIN">
          <SuspenseWrapper><AdminLayout /></SuspenseWrapper>
        </RoleGuard>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <SuspenseWrapper><AdminDashboard /></SuspenseWrapper> },
      { path: 'users', element: <SuspenseWrapper><AdminUsers /></SuspenseWrapper> },
      { path: 'vehicles', element: <SuspenseWrapper><AdminVehicles /></SuspenseWrapper> },
      { path: 'dealers', element: <SuspenseWrapper><AdminDealers /></SuspenseWrapper> },
      { path: 'customers', element: <SuspenseWrapper><AdminCustomers /></SuspenseWrapper> },
      { path: 'orders', element: <SuspenseWrapper><AdminOrders /></SuspenseWrapper> },
      { path: 'appointments', element: <SuspenseWrapper><AdminAppointments /></SuspenseWrapper> },
      { path: 'roles-permissions', element: <SuspenseWrapper><AdminRolesPermissions /></SuspenseWrapper> },
      { path: 'inbox', element: <SuspenseWrapper><AdminInbox /></SuspenseWrapper> },
      { path: 'profile', element: <SuspenseWrapper><AdminProfile /></SuspenseWrapper> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

