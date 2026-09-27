import api from './api';
import type { LoginRequest, LoginResponse, User } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCachedUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function registerUser(credentials: LoginRequest & { name: string, username: string }): Promise<void> {
  try {
    await api.post('/api/users', {
      name: credentials.name,
      username: credentials.username,
      email: credentials.email,
      password: credentials.password,
      role: 'CUSTOMER' // Backend ignores this and forces CUSTOMER, but DTO requires it
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    throw new Error(message || 'Registration failed. Please try again.');
  }
}

export async function login(credentials: LoginRequest): Promise<User> {
  try {
    const response = await api.post<LoginResponse>('/api/auth/login', credentials);
    const token = response.token;
    if (!token) throw new Error('No token in response');
    saveToken(token);
    
    // Now that token is saved, api.ts will send it in Authorization header
    const user = await api.get<User>('/api/users/me');
    saveUser(user);
    return user;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    throw new Error(message || 'Login failed. Please try again.');
  }
}

export function roleBasedRedirect(role: string): string {
  switch (role) {
    case 'ADMIN': return '/admin';
    case 'DEALER': return '/dealer';
    case 'CUSTOMER': return '/customer';
    default: return '/login';
  }
}
