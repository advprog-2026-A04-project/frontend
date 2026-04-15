const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

const SERVICE_DEFINITIONS = [
  {
    key: 'auth',
    name: 'Auth/Profile',
    baseUrl: import.meta.env.VITE_AUTH_BASE_URL || 'http://localhost:8081',
    healthPath: '/actuator/health',
    note: 'Register, login, and bearer-token session lookup.',
  },
  {
    key: 'inventory',
    name: 'Inventory',
    baseUrl: import.meta.env.VITE_INVENTORY_BASE_URL || 'http://localhost:8082',
    healthPath: '/actuator/health',
    note: 'Browse products and validate stock before payment.',
  },
  {
    key: 'wallet',
    name: 'Wallet',
    baseUrl: import.meta.env.VITE_WALLET_BASE_URL || 'http://localhost:8083',
    healthPath: '/actuator/health',
    note: 'Read balance, top up for demos, and deduct during checkout.',
  },
  {
    key: 'order',
    name: 'Order',
    baseUrl: import.meta.env.VITE_ORDER_BASE_URL || 'http://localhost:8084',
    healthPath: '/actuator/health',
    note: 'Checkout orchestrator for milestone 50%.',
  },
  {
    key: 'voucher',
    name: 'Voucher/Promo',
    baseUrl: import.meta.env.VITE_VOUCHER_BASE_URL || 'http://localhost:8085',
    healthPath: '/health',
    note: 'Public voucher listing plus internal validation and claim by Order.',
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
  async topUpWallet(userId, amount) {
    const topUpRequest = await request('wallet', '/wallet/topup', {
      method: 'POST',
      body: { userId, amount },
    });

    await request('wallet', `/wallet/topup/${topUpRequest.requestId}/mark-success`, {
      method: 'POST',
    });

    const wallet = await this.getWallet(userId);
    return {
      ...wallet,
      requestId: topUpRequest.requestId,
    };
  },
  listOrders() {
    return request('order', '/orders/my');
  },
  getOrder(orderId) {
    return request('order', `/orders/${orderId}`);
  },
  listActiveVouchers() {
    return request('voucher', '/vouchers/active', { token: '' });
  },
  checkout({ productId, quantity, shippingAddress, voucherCode }) {
    return request('order', '/orders/checkout', {
      method: 'POST',
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
};
