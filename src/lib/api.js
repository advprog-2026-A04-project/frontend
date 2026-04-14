const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

function getSessionToken() {
  return localStorage.getItem('json.sessionToken') || '';
}

async function request(path, options = {}) {
  const token = options.token ?? getSessionToken();
  const headers = {
    Accept: 'application/json',
    ...(options.body ? JSON_HEADERS : {}),
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response
    .json()
    .catch(async () => ({ message: await response.text().catch(() => 'Unexpected response.') }));

  if (!response.ok) {
    const error = new Error(data.message || 'Request failed.');
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export const api = {
  getHealth() {
    return request('/api/health');
  },
  register(payload) {
    return request('/api/auth/register', { method: 'POST', body: payload });
  },
  login(payload) {
    return request('/api/auth/login', { method: 'POST', body: payload });
  },
  logout() {
    return request('/api/auth/logout', { method: 'POST' });
  },
  getSession() {
    return request('/api/session');
  },
  listProducts(query = '') {
    const url = query ? `/api/products?q=${encodeURIComponent(query)}` : '/api/products';
    return request(url);
  },
  getProduct(productId) {
    return request(`/api/products/${productId}`);
  },
  getWallet() {
    return request('/api/wallet');
  },
  topUpWallet(amount) {
    return request('/api/wallet/topup', {
      method: 'POST',
      body: { amount },
    });
  },
  listOrders() {
    return request('/api/orders');
  },
  getOrder(orderId) {
    return request(`/api/orders/${orderId}`);
  },
  listActiveVouchers() {
    return request('/api/vouchers/active');
  },
  validateVoucher(payload) {
    return request('/api/vouchers/validate', {
      method: 'POST',
      body: payload,
    });
  },
  checkout(payload) {
    return request('/api/checkout', {
      method: 'POST',
      body: payload,
    });
  },
};
