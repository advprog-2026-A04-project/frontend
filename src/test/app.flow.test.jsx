import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from '../App';
import { jsonResponse } from './testUtils.jsx';

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
    const result = typeof handler === 'function'
      ? await handler({ body, headers: init.headers || {}, parsed })
      : handler;

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
          token: 'session-registered',
          id: 2004,
          email: 'new@json.app',
          username: 'new-user',
          fullName: 'new-user',
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

    expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('new@json.app')).toBeInTheDocument();
  });

  it('logs in, browses products, and completes checkout with a voucher code', async () => {
    window.history.pushState({}, '', '/login');

    const product = {
      id: '66666666-6666-6666-6666-666666666666',
      name: 'Rare Sonny Angel Winter Wonderland',
      description: 'Collectible dengan harga aman untuk milestone 25% browse and checkout.',
      price: 780000,
      stock: 15,
      originLocation: 'South Korea',
      purchaseDate: '2026-04-05T09:00:00Z',
      imageUrl: 'https://example.com/sonny.jpg',
    };

    const order = {
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
          email: 'demo@json.app',
          username: 'Demo Buyer',
          fullName: 'Demo Buyer',
          role: 'TITIPER',
        },
      },
      'GET /auth/me': {
        body: {
          id: 1000,
          email: 'demo@json.app',
          username: 'Demo Buyer',
          fullName: 'Demo Buyer',
          role: 'TITIPER',
        },
      },
      'GET /api/products/search': {
        body: [product],
      },
      'GET /api/products/66666666-6666-6666-6666-666666666666': {
        body: product,
      },
      'POST /wallet/balance': ({ body }) => {
        expect(body).toEqual({ userId: 1000 });
        return {
          body: {
            userId: 1000,
            balance: 2000000,
            currency: 'IDR',
          },
        };
      },
      'GET /vouchers/active': {
        body: [
          {
            code: 'MILESTONE10',
            discountType: 'PERCENT',
            discountValue: 10,
            minSpend: 100000,
          },
        ],
      },
      'POST /orders/checkout': ({ body, headers }) => {
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
        expect(headers['Idempotency-Key']).toContain(`checkout:1000:${product.id}:`);
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

    await user.type(screen.getByLabelText(/email/i), 'demo@json.app');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /log in/i }));

    expect(await screen.findByRole('heading', { name: /browse the newest limited drops/i })).toBeInTheDocument();

    await user.click(await screen.findByRole('link', { name: /view details/i }));
    expect(await screen.findByRole('heading', { name: product.name })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /checkout now/i }));
    expect(await screen.findByRole('heading', { name: /complete your order/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/voucher code/i), 'MILESTONE10');
    expect(await screen.findByText(/code milestone10 is currently active/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /checkout now/i }));

    expect(await screen.findByRole('heading', { name: /order created/i })).toBeInTheDocument();
    expect(screen.getByText(/checkout completed successfully and the order is now paid/i)).toBeInTheDocument();
    expect(screen.getAllByText(/milestone10/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8084/orders/1001',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer session-1',
          }),
        }),
      );
    });
  });

  it('updates the profile and keeps the refreshed session in local storage', async () => {
    window.history.pushState({}, '', '/profile');
    localStorage.setItem('json.sessionToken', 'session-2');
    localStorage.setItem(
      'json.sessionUser',
      JSON.stringify({
        id: 1000,
        email: 'demo@json.app',
        username: 'Demo Buyer',
        fullName: 'Demo Buyer',
        role: 'TITIPER',
      }),
    );

    installFetchMock({
      'GET /auth/me': {
        body: {
          id: 1000,
          email: 'demo@json.app',
          username: 'Demo Buyer',
          fullName: 'Demo Buyer',
          role: 'TITIPER',
        },
      },
      'PUT /profile': ({ body }) => {
        expect(body).toEqual({
          username: 'demo-refined',
          fullName: 'Demo Buyer Refined',
        });
        return {
          body: {
            id: 1000,
            email: 'demo@json.app',
            username: 'demo-refined',
            fullName: 'Demo Buyer Refined',
            role: 'TITIPER',
          },
        };
      },
    });

    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Demo Buyer' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/username/i));
    await user.type(screen.getByLabelText(/username/i), 'demo-refined');
    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), 'Demo Buyer Refined');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(await screen.findByText(/profile updated successfully/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Demo Buyer Refined' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('json.sessionUser'))).toMatchObject({
      username: 'demo-refined',
      fullName: 'Demo Buyer Refined',
    });
  });
});
