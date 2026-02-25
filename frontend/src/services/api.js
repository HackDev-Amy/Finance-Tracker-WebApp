/**
 * api.js — Central Axios instance and all API service functions.
 * JWT token is injected automatically via request interceptor.
 * Token refresh on 401 is handled automatically.
 */

import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// ─── Axios Instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-refresh access token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  getProfile: () => api.get('/auth/profile/'),
};

// ─── Dashboard API ────────────────────────────────────────────────────────────

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/'),
};

// ─── Income API ───────────────────────────────────────────────────────────────

export const incomeAPI = {
  list: (params) => api.get('/income/', { params }),
  create: (data) => api.post('/income/', data),
  update: (id, data) => api.put(`/income/${id}/`, data),
  delete: (id) => api.delete(`/income/${id}/`),
  monthlyTotal: () => api.get('/income/monthly_total/'),
};

// ─── Expense API ──────────────────────────────────────────────────────────────

export const expenseAPI = {
  list: (params) => api.get('/expenses/', { params }),
  create: (data) => api.post('/expenses/', data),
  update: (id, data) => api.put(`/expenses/${id}/`, data),
  delete: (id) => api.delete(`/expenses/${id}/`),
  monthlyTotal: () => api.get('/expenses/monthly_total/'),
  byCategory: () => api.get('/expenses/by_category/'),
};

// ─── Savings Goals API ────────────────────────────────────────────────────────

export const savingsAPI = {
  list: () => api.get('/savings-goals/'),
  create: (data) => api.post('/savings-goals/', data),
  update: (id, data) => api.put(`/savings-goals/${id}/`, data),
  delete: (id) => api.delete(`/savings-goals/${id}/`),
  addFunds: (id, amount) => api.patch(`/savings-goals/${id}/add_funds/`, { amount }),
};

export default api;
