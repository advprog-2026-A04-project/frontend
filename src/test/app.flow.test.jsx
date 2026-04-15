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
      'POST /auth/register': {
        status: 201,
        body: {
          token: 'register-token',
          id: 2001,
          email: 'new@json.app',
          username: 'new-user',
          fullName: null,
          role: 'TITIPER',
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
    expect(screen.getByText(/registration successful/i)).toBeInTheDocument();
  });

  it('logs in, browses products, and completes checkout with a voucher code', async () => {
    window.history.pushState({}, '', '/login');

    const product = {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'Rare Sonny Angel Winter Wonderland',
      description: 'Collectible for the milestone 25% and 50% flow.',
      category: 'Collectible',
      price: 780000,
      stock: 15,
      originLocation: 'South Korea',
      purchaseDate: '2026-04-05T09:00:00Z',
      imageUrl: 'https://example.com/sonny.jpg',
    };

    const order = {
      id: 1001,
      status: 'PAID',
      shippingAddress: 'Jl. Mawar No. 1, Jakarta',
      voucherCode: 'MILESTONE10',
      subtotal: 780000,
      discountTotal: 78000,
      totalPaid: 702000,
      createdAt: '2026-04-14T12:00:00Z',
      items: [
        {
          productId: product.id,
          productNameSnapshot: product.name,
          qty: 1,
          unitPriceSnapshot: 780000,
          lineTotal: 780000,
        },
      ],
    };

    installFetchMock({
      'POST /auth/login': {
        body: {
          token: 'session-1',
          id: 1000,
          email: 'buyer@json.app',
          username: 'Buyer',
          fullName: 'Demo Buyer',
          role: 'TITIPER',
        },
      },
      'GET /auth/me': {
        body: {
          id: 1000,
          email: 'buyer@json.app',
          username: 'Buyer',
          fullName: 'Demo Buyer',
          role: 'TITIPER',
        },
      },
      'GET /api/products/search': {
        body: [product],
      },
      [`GET /api/products/${product.id}`]: {
        body: product,
      },
      'POST /wallet/balance': ({ body }) => ({
        body: {
          userId: body.userId,
          balance: 2000000,
          currency: 'IDR',
        },
      }),
      'GET /vouchers/active': {
        body: [
          {
            code: 'MILESTONE10',
            discountType: 'PERCENT',
            discountValue: 10,
            minSpend: 100000,
            quotaRemaining: 20,
          },
        ],
      },
      'POST /orders/checkout': ({ body }) => {
        expect(body).toEqual({
          address: 'Jl. Mawar No. 1, Jakarta',
          voucherCode: 'MILESTONE10',
          items: [
            {
              productId: product.id,
              qty: 1,
            },
          ],
        });

        return {
          status: 201,
          body: {
            success: true,
            data: order,
          },
        };
      },
      'GET /orders/1001': {
        body: {
          success: true,
          data: order,
        },
      },
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText(/email/i), 'buyer@json.app');
    await user.type(screen.getByLabelText(/password/i), 'Demo123!');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));

    expect(await screen.findByRole('heading', { name: /browse demo-ready products/i })).toBeInTheDocument();

    await user.click(await screen.findByRole('link', { name: /view details/i }));
    expect(await screen.findByRole('heading', { name: product.name })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /buy now/i }));
    expect(await screen.findByRole('heading', { name: /finish milestone 50% flow/i })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/voucher code/i));
    await user.type(screen.getByLabelText(/voucher code/i), 'MILESTONE10');
    expect(await screen.findByText(/final validation and quota claim happen during checkout/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create order and pay/i }));

    expect(await screen.findByRole('heading', { name: '1001' })).toBeInTheDocument();
    expect(screen.getByText(/checkout completed successfully/i)).toBeInTheDocument();
    expect(screen.getByText('MILESTONE10')).toBeInTheDocument();

    await waitFor(() => {
      const orderDetailCall = global.fetch.mock.calls.find(([url]) => String(url).includes('/orders/1001'));
      expect(orderDetailCall).toBeTruthy();
      expect(orderDetailCall[1].headers.Authorization).toBe('Bearer session-1');
    });
  });
});
