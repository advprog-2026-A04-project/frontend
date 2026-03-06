import axios from 'axios';

// Base URLs for each microservice
// In production (Docker/nginx), use '' for services proxied via nginx
// In development, use localhost with specific ports
const SERVICES = {
  AUTH_PROFILE: import.meta.env.VITE_AUTH_PROFILE_URL || 'http://localhost:8081',
  ORDER: import.meta.env.VITE_ORDER_URL || 'http://localhost:8082',
  VOUCHER_PROMO: import.meta.env.VITE_VOUCHER_PROMO_URL || 'http://localhost:8083',
  WALLET: import.meta.env.VITE_WALLET_URL || 'http://localhost:8084',
  INVENTORY: import.meta.env.VITE_INVENTORY_URL || 'http://localhost:8085',
};

function createApiInstance(baseURL) {
  const instance = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - attach JWT token if available
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle common errors
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export const authProfileApi = createApiInstance(SERVICES.AUTH_PROFILE);
export const orderApi = createApiInstance(SERVICES.ORDER);
export const voucherPromoApi = createApiInstance(SERVICES.VOUCHER_PROMO);
export const walletApi = createApiInstance(SERVICES.WALLET);
export const inventoryApi = createApiInstance(SERVICES.INVENTORY);

export default SERVICES;
