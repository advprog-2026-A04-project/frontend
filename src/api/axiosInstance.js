import axios from 'axios';

const SERVICES = {
  AUTH_PROFILE: import.meta.env.VITE_AUTH_PROFILE_URL || 'http://localhost:8081',
  ORDER: import.meta.env.VITE_ORDER_URL || 'https://order-n7mf.onrender.com',
  VOUCHER_PROMO: import.meta.env.VITE_VOUCHER_PROMO_URL || 'http://18.232.174.224',
  WALLET: import.meta.env.VITE_WALLET_URL || 'http://localhost:8084',
  INVENTORY: import.meta.env.VITE_INVENTORY_URL || 'http://localhost:8085',
};

function createApiInstance(baseURL) {
  const instance = axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
  });

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

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export const authProfileApi = createApiInstance(SERVICES.AUTH_PROFILE);
export const orderApi = createApiInstance(SERVICES.ORDER);
export const walletApi = createApiInstance(SERVICES.WALLET);

// Inventory uses HTTP Basic Auth
export const inventoryApi = createApiInstance(SERVICES.INVENTORY);
inventoryApi.interceptors.request.use((config) => {
  const user = localStorage.getItem('inventoryUser') || 'titiper1';
  const pass = localStorage.getItem('inventoryPass') || 'titiper123';
  config.headers.Authorization = 'Basic ' + btoa(`${user}:${pass}`);
  return config;
});

// Voucher-Promo API (uses CSRF tokens for POST)
export const voucherPromoApi = axios.create({
  baseURL: SERVICES.VOUCHER_PROMO,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Helper to get CSRF token before POST requests to Voucher-Promo
export async function voucherPromoPost(url, data) {
  const csrfRes = await voucherPromoApi.get('/csrf');
  const token = csrfRes.data?.token || csrfRes.data?.headerName;
  return voucherPromoApi.post(url, data, {
    headers: { 'X-XSRF-TOKEN': token },
  });
}

export default SERVICES;
