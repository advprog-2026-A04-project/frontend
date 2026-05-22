import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authenticatedRoutes, renderAppAt, sampleOrder, sampleProduct } from './testUtils.jsx';

const buyerProfile = {
  id: 1000,
  email: 'demo@json.app',
  username: 'demo-buyer',
  fullName: 'Demo Buyer',
  role: 'TITIPER',
};

const jastiperProfile = {
  id: 2003,
  email: 'jastiper@json.app',
  username: 'jastiper-2003',
  fullName: 'Jastiper 2003',
  role: 'JASTIPER',
};

function walletRoutes(extra = {}) {
  return {
    ...authenticatedRoutes(buyerProfile),
    'POST /wallet/balance': {
      body: {
        userId: 1000,
        balance: 2000000,
        currency: 'IDR',
      },
    },
    'POST /wallet/transactions': {
      body: [
        {
          id: 1,
          userId: 1000,
          type: 'TOPUP',
          amount: 1000000,
          refType: 'TOPUP_REQUEST',
          refId: 10,
          status: 'SUCCESS',
          createdAt: '2026-05-20T10:00:00Z',
        },
        {
          id: 2,
          userId: 1000,
          type: 'PAYMENT',
          amount: 250000,
          refType: 'ORDER',
          refId: 1001,
          status: 'SUCCESS',
          createdAt: '2026-05-21T10:00:00Z',
        },
      ],
    },
    ...extra,
  };
}

describe('buyer and role pages', () => {
  it('renders home with health cards and featured products for guests', async () => {
    renderAppAt('/', {
      'GET /actuator/health': { body: { status: 'UP' } },
      'GET /health': { body: { status: 'UP', db: 'UP' } },
      'GET /api/products/search': { body: [sampleProduct, { ...sampleProduct, id: '2', name: 'Dior Lip Glow' }] },
    });

    expect(await screen.findByRole('heading', { name: /secure hype drops/i })).toBeInTheDocument();
    expect(await screen.findByText(sampleProduct.name)).toBeInTheDocument();
    expect(screen.getAllByText('UP')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /create account/i })).toHaveAttribute('href', '/register');
  });

  it('renders wallet, submits a top-up request, and refreshes transactions', async () => {
    const calls = [];
    renderAppAt(
      '/wallet',
      walletRoutes({
        'POST /wallet/topup': ({ body }) => {
          calls.push({ action: 'topup', body });
          return { body: { requestId: 8801, status: 'PENDING' } };
        },
      }),
      buyerProfile,
    );

    expect(await screen.findByText(/wallet balance/i)).toBeInTheDocument();
    expect(screen.getByText(/total top up/i)).toBeInTheDocument();
    expect(screen.getByText('PAYMENT')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /50.000/i }));
    await user.click(screen.getByRole('button', { name: /top up wallet/i }));

    expect(await screen.findByText(/top-up request 8801 was submitted/i)).toBeInTheDocument();
    expect(calls).toContainEqual({ action: 'topup', body: { userId: 1000, amount: 50000 } });
  });

  it('renders buyer order history and active lifecycle progress', async () => {
    renderAppAt(
      '/orders',
      {
        ...authenticatedRoutes(buyerProfile),
        'GET /orders/my': { body: { success: true, data: [sampleOrder, { ...sampleOrder, id: 1002, status: 'COMPLETED' }] } },
        'GET /orders/my/active': { body: { success: true, data: [sampleOrder] } },
      },
      buyerProfile,
    );

    expect(await screen.findByRole('heading', { name: /track your active and completed orders/i })).toBeInTheDocument();
    expect(screen.getAllByText(/rare sonny angel winter wonderland/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /open detail/i })).toHaveLength(3);
  });

  it('creates, edits, and deletes jastiper products', async () => {
    const calls = [];
    renderAppAt(
      '/jastiper/catalog',
      {
        ...authenticatedRoutes(jastiperProfile),
        'GET /api/products/me': { body: [sampleProduct] },
        'POST /api/products': ({ body }) => {
          calls.push({ action: 'create', body });
          return { body: { id: 'created-product', ...body } };
        },
        'PUT /api/products/66666666-6666-6666-6666-666666666666': ({ body }) => {
          calls.push({ action: 'update', body });
          return { body: { ...sampleProduct, ...body } };
        },
        'DELETE /api/products/66666666-6666-6666-6666-666666666666': () => {
          calls.push({ action: 'delete' });
          return { body: {} };
        },
      },
      jastiperProfile,
    );

    expect(await screen.findByRole('heading', { name: /manage products and stock/i })).toBeInTheDocument();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText(/^name$/i));
    await user.type(screen.getByLabelText(/^name$/i), 'New Drop');
    await user.clear(screen.getByLabelText(/^description$/i));
    await user.type(screen.getByLabelText(/^description$/i), 'New stock');
    await user.clear(screen.getByLabelText(/^origin location$/i));
    await user.type(screen.getByLabelText(/^origin location$/i), 'Japan');
    await user.type(screen.getByLabelText(/^purchase date$/i), '2026-06-01');
    await user.type(screen.getByLabelText(/^return date$/i), '2026-06-10');
    await user.click(screen.getByRole('button', { name: /create product/i }));
    expect(await screen.findByText(/product created/i)).toBeInTheDocument();

    const productPanel = screen.getByText(sampleProduct.name).closest('article');
    await user.click(within(productPanel).getByRole('button', { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/^stock$/i));
    await user.type(screen.getByLabelText(/^stock$/i), '5');
    await user.click(screen.getByRole('button', { name: /update product/i }));
    expect(await screen.findByText(/product updated/i)).toBeInTheDocument();

    await user.click(within(productPanel).getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(calls.map((call) => call.action)).toEqual(expect.arrayContaining(['create', 'update', 'delete'])));
  });

  it('processes jastiper order status changes and cancellation', async () => {
    const calls = [];
    renderAppAt(
      '/jastiper/orders',
      {
        ...authenticatedRoutes(jastiperProfile),
        'GET /orders/jastiper': { body: { success: true, data: [sampleOrder] } },
        'PATCH /orders/1001/status': ({ body }) => {
          calls.push({ action: 'status', body });
          return { body: { success: true, data: { ...sampleOrder, status: body.nextStatus } } };
        },
        'POST /orders/1001/cancel': () => {
          calls.push({ action: 'cancel' });
          return { body: { success: true, data: { ...sampleOrder, status: 'CANCELLED' } } };
        },
      },
      jastiperProfile,
    );

    expect(await screen.findByRole('heading', { name: /process active orders/i })).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /mark purchased/i }));
    expect(await screen.findByText(/order 1001 moved to purchased/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(await screen.findByText(/order 1001 was cancelled and refunded/i)).toBeInTheDocument();
    expect(calls).toEqual(expect.arrayContaining([
      { action: 'status', body: { nextStatus: 'PURCHASED' } },
      { action: 'cancel' },
    ]));
  });
});
