import { render } from '@testing-library/react';
import { vi } from 'vitest';
import App from '../App';

export function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

export function textResponse(payload, status = 200, headers = {}) {
  return new Response(payload, {
    status,
    headers,
  });
}

export function installFetchMock(routes) {
  const calls = [];

  global.fetch = vi.fn(async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const parsed = new URL(url, 'http://localhost');
    const method = (init.method || 'GET').toUpperCase();
    const fullKey = `${method} ${parsed.pathname}${parsed.search}`;
    const simpleKey = `${method} ${parsed.pathname}`;
    const handler = routes[fullKey] || routes[simpleKey] || routes['*'];

    calls.push({ method, path: parsed.pathname, search: parsed.search, body: init.body, headers: init.headers || {} });

    if (!handler) {
      throw new Error(`Unhandled fetch ${fullKey}`);
    }

    const body = init.body ? JSON.parse(init.body) : undefined;
    const result = typeof handler === 'function'
      ? await handler({ body, headers: init.headers || {}, parsed, init, calls })
      : handler;

    if (result instanceof Response) {
      return result;
    }

    return jsonResponse(result.body ?? result, result.status ?? 200, result.headers ?? {});
  });

  return calls;
}

export function seedSession(overrides = {}) {
  const user = {
    id: 1000,
    email: 'demo@json.app',
    username: 'demo-buyer',
    fullName: 'Demo Buyer',
    role: 'TITIPER',
    ...overrides,
  };
  localStorage.setItem('json.sessionToken', 'session-token');
  localStorage.setItem('json.sessionUser', JSON.stringify(user));
  return user;
}

export function renderAppAt(path, routes, session = null) {
  window.history.pushState({}, '', path);
  if (session) {
    seedSession(session);
  }
  const calls = installFetchMock(routes);
  const view = render(<App />);
  return { calls, view };
}

export const sampleProduct = {
  id: '66666666-6666-6666-6666-666666666666',
  name: 'Rare Sonny Angel Winter Wonderland',
  description: 'Collectible with milestone checkout coverage.',
  price: 780000,
  stock: 15,
  originLocation: 'South Korea',
  purchaseDate: '2026-04-05',
  returnDate: '2026-04-12',
  imageUrl: 'https://example.com/sonny.jpg',
  jastiperId: 2003,
};

export const sampleOrder = {
  id: 1001,
  buyerId: 1000,
  jastiperId: 2003,
  status: 'PAID',
  shippingAddress: 'Jl. Mawar No. 1, Jakarta',
  voucherCode: 'MILESTONE10',
  subtotal: 780000,
  discountTotal: 78000,
  totalPaid: 702000,
  createdAt: '2026-04-14T12:00:00Z',
  updatedAt: '2026-04-14T12:05:00Z',
  refundDone: false,
  items: [
    {
      productId: sampleProduct.id,
      productNameSnapshot: sampleProduct.name,
      qty: 1,
      unitPriceSnapshot: 780000,
      lineTotal: 780000,
    },
  ],
};

export function authenticatedRoutes(profile = {}) {
  const user = {
    id: 1000,
    email: 'demo@json.app',
    username: 'demo-buyer',
    fullName: 'Demo Buyer',
    role: 'TITIPER',
    ...profile,
  };

  return {
    'GET /auth/me': { body: user },
  };
}
