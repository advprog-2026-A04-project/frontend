const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const DEPLOYED_SERVICE_URLS = {
  auth: 'https://auth-profile-api-383620816191.us-central1.run.app',
  inventory: 'https://inventory-api-383620816191.us-central1.run.app',
  wallet: 'https://wallet-api-383620816191.us-central1.run.app',
  order: 'https://order-api-383620816191.us-central1.run.app',
  voucher: 'https://voucher-promo-api-383620816191.us-central1.run.app',
};

const LOCAL_SERVICE_URLS = {
  auth: 'http://localhost:8081',
  inventory: 'http://localhost:8082',
  wallet: 'http://localhost:8083',
  order: 'http://localhost:8084',
  voucher: 'http://localhost:8085',
};

function isLocalBrowserOrigin() {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveDefaultBaseUrl(serviceKey, envValue) {
  if (envValue) {
    return envValue;
  }

  return isLocalBrowserOrigin() ? LOCAL_SERVICE_URLS[serviceKey] : DEPLOYED_SERVICE_URLS[serviceKey];
}

const SERVICE_DEFINITIONS = [
  {
    key: 'auth',
    name: 'Auth/Profile',
    baseUrl: resolveDefaultBaseUrl('auth', import.meta.env.VITE_AUTH_BASE_URL),
    healthPath: '/actuator/health',
    note: 'Register, login, and bearer-token session lookup.',
  },
  {
    key: 'inventory',
    name: 'Inventory',
    baseUrl: resolveDefaultBaseUrl('inventory', import.meta.env.VITE_INVENTORY_BASE_URL),
    healthPath: '/actuator/health',
    note: 'Browse products and validate stock before payment.',
  },
  {
    key: 'wallet',
    name: 'Wallet',
    baseUrl: resolveDefaultBaseUrl('wallet', import.meta.env.VITE_WALLET_BASE_URL),
    healthPath: '/actuator/health',
    note: 'Balance, top-up, transaction history, deduct, and refund.',
  },
  {
    key: 'order',
    name: 'Order',
    baseUrl: resolveDefaultBaseUrl('order', import.meta.env.VITE_ORDER_BASE_URL),
    healthPath: '/actuator/health',
    note: 'Checkout orchestration and order lifecycle.',
  },
  {
    key: 'voucher',
    name: 'Voucher/Promo',
    baseUrl: resolveDefaultBaseUrl('voucher', import.meta.env.VITE_VOUCHER_BASE_URL),
    healthPath: '/health',
    note: 'Public voucher listing plus admin voucher management.',
  },
];

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function getServiceBaseUrl(serviceKey) {
  const service = SERVICE_DEFINITIONS.find((entry) => entry.key === serviceKey);
  if (!service) {
    throw new Error(`Unknown service "${serviceKey}".`);
  }

  return trimTrailingSlash(service.baseUrl);
}

function getSessionToken() {
  return localStorage.getItem('json.sessionToken') || '';
}

function toUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function parsePayload(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text().catch(() => '');
  return text ? { message: text } : null;
}

function getErrorMessage(payload) {
  if (!payload) {
    return 'Request failed.';
  }

  if (typeof payload === 'string') {
    return payload;
  }

  if (payload.error?.message) {
    return payload.error.message;
  }

  if (Array.isArray(payload.error?.details) && payload.error.details.length > 0) {
    return payload.error.details.join(', ');
  }

  if (payload.message) {
    return payload.message;
  }

  return 'Request failed.';
}

function unwrapEnvelope(payload) {
  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    if (!payload.success) {
      const error = new Error(getErrorMessage(payload));
      error.payload = payload;
      throw error;
    }

    return payload.data;
  }

  return payload;
}

async function request(serviceKey, path, options = {}) {
  const token = options.token ?? getSessionToken();
  const headers = {
    Accept: 'application/json',
    ...(options.body ? JSON_HEADERS : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(toUrl(getServiceBaseUrl(serviceKey), path), {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await parsePayload(response);

  if (!response.ok) {
    const error = new Error(getErrorMessage(payload));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return unwrapEnvelope(payload);
}

async function fetchHealth(definition) {
  try {
    const response = await fetch(toUrl(trimTrailingSlash(definition.baseUrl), definition.healthPath), {
      headers: { Accept: 'application/json' },
    });
    const payload = await parsePayload(response);
    const healthy = response.ok && String(payload?.status || '').toUpperCase() === 'UP';

    return {
      ...definition,
      status: healthy ? 'UP' : 'DOWN',
      detail: healthy ? 'Reachable' : getErrorMessage(payload),
    };
  } catch (error) {
    return {
      ...definition,
      status: 'DOWN',
      detail: error.message || 'Request failed.',
    };
  }
}

function adminHeaders(adminToken) {
  if (!adminToken || !String(adminToken).trim()) {
    throw new Error('Admin voucher token is required.');
  }

  return {
    'X-Admin-Token': String(adminToken).trim(),
  };
}

export const api = {
  async getHealth() {
    const services = await Promise.all(SERVICE_DEFINITIONS.map(fetchHealth));
    return { services };
  },
  register(payload) {
    return request('auth', '/auth/register', { method: 'POST', body: payload });
  },
  login(payload) {
    return request('auth', '/auth/login', { method: 'POST', body: payload });
  },
  getCurrentUser(token) {
    return request('auth', '/auth/me', { token });
  },
  updateProfile(payload) {
    return request('auth', '/profile', {
      method: 'PUT',
      body: payload,
    });
  },
  listProducts(query = '') {
    const suffix = query ? `?keyword=${encodeURIComponent(query)}` : '';
    return request('inventory', `/api/products/search${suffix}`);
  },
  getProduct(productId) {
    return request('inventory', `/api/products/${productId}`);
  },
  getWallet(userId) {
    return request('wallet', '/wallet/balance', {
      method: 'POST',
      body: { userId },
    });
  },
  listWalletTransactions(userId) {
    return request('wallet', '/wallet/transactions', {
      method: 'POST',
      body: { userId },
    });
  },
  async topUpWallet(userId, amount) {
    const topUpRequest = await request('wallet', '/wallet/topup', {
      method: 'POST',
      body: { userId, amount },
    });

    await request('wallet', `/wallet/topup/${topUpRequest.requestId}/mark-success`, {
      method: 'POST',
    });

    const [wallet, transactions] = await Promise.all([
      this.getWallet(userId),
      this.listWalletTransactions(userId),
    ]);

    return {
      wallet,
      transactions,
      requestId: topUpRequest.requestId,
    };
  },
  listOrders() {
    return request('order', '/orders/my');
  },
  listActiveOrders() {
    return request('order', '/orders/my/active');
  },
  listJastiperOrders() {
    return request('order', '/orders/jastiper');
  },
  listAdminOrders() {
    return request('order', '/orders/admin');
  },
  getOrder(orderId) {
    return request('order', `/orders/${orderId}`);
  },
  checkout({ productId, quantity, shippingAddress, voucherCode, idempotencyKey }) {
    return request('order', '/orders/checkout', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
      body: {
        address: shippingAddress,
        voucherCode: voucherCode?.trim() || null,
        items: [
          {
            productId,
            qty: quantity,
          },
        ],
      },
    });
  },
  cancelOrder(orderId) {
    return request('order', `/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },
  updateOrderStatus(orderId, nextStatus) {
    return request('order', `/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { nextStatus },
    });
  },
  submitOrderRating(orderId, payload) {
    return request('order', `/orders/${orderId}/rating`, {
      method: 'POST',
      body: payload,
    });
  },
  listActiveVouchers() {
    return request('voucher', '/vouchers/active', { token: '' });
  },
  listAdminVouchers(adminToken, status = '') {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : '';
    return request('voucher', `/admin/vouchers${suffix}`, {
      headers: adminHeaders(adminToken),
      token: '',
    });
  },
  createAdminVoucher(adminToken, payload) {
    return request('voucher', '/admin/vouchers', {
      method: 'POST',
      body: payload,
      headers: adminHeaders(adminToken),
      token: '',
    });
  },
  updateAdminVoucher(adminToken, voucherId, payload) {
    return request('voucher', `/admin/vouchers/${voucherId}`, {
      method: 'PUT',
      body: payload,
      headers: adminHeaders(adminToken),
      token: '',
    });
  },
  disableAdminVoucher(adminToken, voucherId) {
    return request('voucher', `/admin/vouchers/${voucherId}/disable`, {
      method: 'POST',
      headers: adminHeaders(adminToken),
      token: '',
    });
  },
};
