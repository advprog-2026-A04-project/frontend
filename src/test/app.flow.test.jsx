import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function installFetchMock(routes) {
  global.fetch = vi.fn(async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const parsed = new URL(url, 'http://localhost');
    const method = (init.method || 'GET').toUpperCase();
    const fullKey = `${method} ${parsed.pathname}${parsed.search}`;
    const simpleKey = `${method} ${parsed.pathname}`;
    const handler = routes[fullKey] || routes[simpleKey];

    if (!handler) {
      throw new Error(`Unhandled fetch ${fullKey}`);
    }

    const body = init.body ? JSON.parse(init.body) : undefined;
    const result = typeof handler === 'function' ? await handler({ body, parsed }) : handler;

    return jsonResponse(result.body ?? result, result.status ?? 200);
  });
}

describe('frontend milestone flow', () => {
  it('registers a user and redirects to login with a success message', async () => {
    window.history.pushState({}, '', '/register');

    installFetchMock({
      'POST /api/auth/register': {
        status: 201,
        body: {
          message: 'Registration successful. You can log in immediately.',
          user: {
            id: 2001,
            email: 'new@json.app',
            username: 'new-user',
            role: 'TITIPER',
          },
        },
      },
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/email/i), 'new@json.app');
    await user.type(screen.getByLabelText(/username/i), 'new-user');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(await screen.findByRole('heading', { name: /log in to continue/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('new@json.app')).toBeInTheDocument();
  });

  it('logs in, browses products, validates voucher, and completes checkout', async () => {
    window.history.pushState({}, '', '/login');

    const product = {
      id: 6,
      name: 'Rare Sonny Angel Winter Wonderland',
      description: 'Collectible dengan harga aman untuk milestone 25% browse and checkout.',
      category: 'Collectible',
      price: 780000,
      stock: 15,
      originLocation: 'South Korea',
      purchaseDate: '2026-04-05T09:00:00Z',
      imageUrl: 'https://example.com/sonny.jpg',
    };

    const order = {
      id: 'ORD-1001',
      status: 'PAID',
      paymentStatus: 'SUCCESS',
      shippingAddress: 'Jl. Mawar No. 1, Jakarta',
      voucherCode: 'MILESTONE10',
      voucherMessage: 'Voucher claimed successfully.',
      subtotal: 780000,
      discountTotal: 78000,
      totalPaid: 702000,
      createdAt: '2026-04-14T12:00:00Z',
      items: [
        {
          productId: 6,
          productName: product.name,
          quantity: 1,
          unitPrice: 780000,
          lineTotal: 780000,
        },
      ],
    };

    installFetchMock({
      'POST /api/auth/login': {
        body: {
          token: 'session-1',
          user: {
            id: 1000,
            email: 'demo@json.app',
            username: 'Demo Buyer',
            role: 'TITIPER',
            walletBalance: 2000000,
          },
        },
      },
      'GET /api/session': {
        body: {
          user: {
            id: 1000,
            email: 'demo@json.app',
            username: 'Demo Buyer',
            role: 'TITIPER',
            walletBalance: 2000000,
          },
        },
      },
      'GET /api/products': {
        body: {
          items: [product],
        },
      },
      'GET /api/products/6': {
        body: {
          product,
        },
      },
      'GET /api/wallet': {
        body: {
          balance: 2000000,
          currency: 'IDR',
        },
      },
      'GET /api/vouchers/active': {
        body: {
          items: [
            {
              code: 'MILESTONE10',
              discountType: 'PERCENT',
              discountValue: 10,
              minSpend: 100000,
            },
          ],
        },
      },
      'POST /api/vouchers/validate': {
        body: {
          valid: true,
          discountAmount: 78000,
          code: 'MILESTONE10',
          message: 'ok',
        },
      },
      'POST /api/checkout': {
        status: 201,
        body: {
          success: true,
          message: 'Checkout completed and payment recorded.',
          order,
        },
      },
      'GET /api/orders/ORD-1001': {
        body: {
          order,
        },
      },
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByRole('heading', { name: /browse demo-ready products/i })).toBeInTheDocument();

    await user.click(await screen.findByRole('link', { name: /view details/i }));
    expect(await screen.findByRole('heading', { name: product.name })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /buy now/i }));
    expect(await screen.findByRole('heading', { name: /finish milestone 50% flow/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /validate voucher/i }));
    expect(await screen.findByText(/voucher valid\. discount/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create order and pay/i }));

    expect(await screen.findByRole('heading', { name: 'ORD-1001' })).toBeInTheDocument();
    expect(screen.getByText(/checkout completed and payment recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/voucher claimed successfully/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/orders/ORD-1001',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer session-1',
          }),
        }),
      );
    });
  });
});
