import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { authenticatedRoutes, renderAppAt, sampleOrder, sampleProduct } from './testUtils.jsx';

const adminProfile = {
  id: 9001,
  email: 'admin@json.app',
  username: 'json-admin',
  fullName: 'JSON Admin',
  role: 'ADMIN',
};

const voucher = {
  id: 77,
  code: 'MILESTONE10',
  discountType: 'PERCENT',
  discountValue: 10,
  minSpend: 0,
  quotaTotal: 12,
  quotaRemaining: 9,
  status: 'ACTIVE',
  startAt: '2026-05-01T00:00:00Z',
  endAt: '2026-06-01T00:00:00Z',
};

const adminUser = {
  id: 44,
  email: 'kyc@json.app',
  username: 'kyc-user',
  fullName: 'KYC User',
  role: 'TITIPER',
  kycStatus: 'PENDING',
  banned: false,
};

function adminRoutes(extra = {}) {
  return {
    ...authenticatedRoutes(adminProfile),
    'GET /orders/admin': { body: { success: true, data: [sampleOrder] } },
    'GET /api/products': { body: [sampleProduct] },
    'GET /profile/admin/users': { body: [adminUser] },
    'GET /wallet/admin/topups': {
      body: [
        {
          id: 501,
          userId: 1000,
          amount: 250000,
          status: 'PENDING',
          createdAt: '2026-05-22T03:00:00Z',
        },
      ],
    },
    ...extra,
  };
}

describe('admin console coverage', () => {
  it('renders monitoring data and manages vouchers with an explicit admin token', async () => {
    const calls = [];
    renderAppAt(
      '/admin',
      adminRoutes({
        'GET /admin/vouchers': ({ headers }) => {
          calls.push({ action: 'list-vouchers', headers });
          return { body: [voucher] };
        },
        'GET /admin/vouchers/redemptions': {
          body: [
            {
              id: 1,
              code: 'MILESTONE10',
              orderId: 1001,
              buyerId: 1000,
              orderAmount: 780000,
              discountApplied: 78000,
              claimedAt: '2026-05-22T03:15:00Z',
            },
          ],
        },
        'POST /admin/vouchers': ({ body, headers }) => {
          calls.push({ action: 'create-voucher', body, headers });
          return { status: 201, body: { id: 88, ...body, status: 'ACTIVE', quotaRemaining: body.quotaTotal } };
        },
        'PUT /admin/vouchers/77': ({ body, headers }) => {
          calls.push({ action: 'update-voucher', body, headers });
          return { body: { id: 77, ...body, status: 'ACTIVE', quotaRemaining: body.quotaTotal } };
        },
        'POST /admin/vouchers/77/disable': ({ headers }) => {
          calls.push({ action: 'disable-voucher', headers });
          return { body: { ...voucher, status: 'INACTIVE' } };
        },
      }),
      adminProfile,
    );

    expect(await screen.findByRole('heading', { name: /voucher management and order monitoring/i })).toBeInTheDocument();
    expect(screen.getByTestId('admin-dashboard')).toHaveTextContent('Admin overview');
    expect(screen.getByTestId('admin-dashboard')).toHaveTextContent('Pending top-ups');
    expect(screen.getByText(sampleProduct.name)).toBeInTheDocument();
    expect(screen.getByTestId('wallet-topup-approval')).toHaveTextContent('Top-up #501');
    expect(screen.getByTestId('voucher-redemption-audit')).toHaveTextContent('Enter the voucher admin token');

    const user = userEvent.setup();
    fireEvent.change(screen.getByLabelText(/voucher admin token/i), { target: { value: 'admin-token' } });

    await waitFor(() => {
      expect(calls.some((call) => call.action === 'list-vouchers' && call.headers['X-Admin-Token'] === 'admin-token')).toBe(true);
    });
    expect(await screen.findAllByText('MILESTONE10')).toHaveLength(2);
    expect(screen.getByTestId('voucher-redemption-audit')).toHaveTextContent('Order 1001');

    await user.clear(screen.getByLabelText(/^code$/i));
    await user.type(screen.getByLabelText(/^code$/i), 'audit10');
    await user.selectOptions(screen.getByLabelText(/discount type/i), 'PERCENT');
    await user.clear(screen.getByLabelText(/discount value/i));
    await user.type(screen.getByLabelText(/discount value/i), '15');
    await user.click(screen.getByRole('button', { name: /create voucher/i }));

    expect(await screen.findByText(/voucher AUDIT10 created/i)).toBeInTheDocument();
    expect(calls.find((call) => call.action === 'create-voucher')).toMatchObject({
      body: expect.objectContaining({ code: 'AUDIT10', discountType: 'PERCENT', discountValue: 15 }),
    });

    const voucherPanel = screen.getAllByText('MILESTONE10')[0].closest('article');
    await user.click(within(voucherPanel).getByRole('button', { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/quota total/i));
    await user.type(screen.getByLabelText(/quota total/i), '20');
    await user.click(screen.getByRole('button', { name: /update voucher/i }));

    expect(await screen.findByText(/voucher MILESTONE10 updated/i)).toBeInTheDocument();
    expect(calls.find((call) => call.action === 'update-voucher')).toMatchObject({
      body: expect.objectContaining({ quotaTotal: 20 }),
    });

    await user.click(within(voucherPanel).getByRole('button', { name: /^disable$/i }));
    expect(await screen.findByText(/voucher 77 disabled/i)).toBeInTheDocument();
  });

  it('updates products, orders, wallet approvals, and user controls', async () => {
    const calls = [];
    renderAppAt(
      '/admin',
      adminRoutes({
        'GET /admin/vouchers': { body: [voucher] },
        'GET /admin/vouchers/redemptions': { body: [] },
        'PUT /api/products/admin/66666666-6666-6666-6666-666666666666': ({ body }) => {
          calls.push({ action: 'update-product', body });
          return { body: { ...sampleProduct, ...body } };
        },
        'DELETE /api/products/admin/66666666-6666-6666-6666-666666666666': () => {
          calls.push({ action: 'delete-product' });
          return { body: {} };
        },
        'POST /orders/1001/cancel': () => {
          calls.push({ action: 'cancel-order' });
          return { body: { success: true, data: { ...sampleOrder, status: 'CANCELLED' } } };
        },
        'POST /wallet/topup/501/mark-success': () => {
          calls.push({ action: 'approve-topup' });
          return { body: { id: 501, status: 'SUCCESS' } };
        },
        'POST /profile/admin/users/44/kyc/approve': () => {
          calls.push({ action: 'approve-kyc' });
          return { body: { ...adminUser, kycStatus: 'APPROVED' } };
        },
        'POST /profile/admin/users/44/ban': () => {
          calls.push({ action: 'ban-user' });
          return { body: { ...adminUser, banned: true } };
        },
        'POST /profile/admin/users/44/kyc/reject': () => {
          calls.push({ action: 'reject-kyc' });
          return { body: { ...adminUser, kycStatus: 'REJECTED' } };
        },
        'POST /profile/admin/users/44/demote': () => {
          calls.push({ action: 'demote-user' });
          return { body: { ...adminUser, role: 'TITIPER' } };
        },
      }),
      adminProfile,
    );

    expect(await screen.findByRole('heading', { name: /system-wide catalog/i })).toBeInTheDocument();
    const user = userEvent.setup();

    const productPanel = screen.getByText(sampleProduct.name).closest('article');
    await user.click(within(productPanel).getByRole('button', { name: /^edit$/i }));
    await user.clear(screen.getByLabelText(/^stock$/i));
    await user.type(screen.getByLabelText(/^stock$/i), '3');
    await user.click(screen.getByRole('button', { name: /update product/i }));
    expect(await screen.findByText(/product Rare Sonny Angel Winter Wonderland updated/i)).toBeInTheDocument();

    await user.click(within(productPanel).getByRole('button', { name: /^delete$/i }));
    expect(await screen.findByText(/product 66666666-6666-6666-6666-666666666666 deleted/i)).toBeInTheDocument();

    const orderCard = screen.getByText('Order').closest('article');
    await user.click(within(orderCard).getByRole('button', { name: /cancel and refund/i }));
    expect(await screen.findByText(/order 1001 was cancelled and refunded/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    expect(await screen.findByText(/top-up request 501 approved/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /approve kyc/i }));
    expect(await screen.findByText(/user 44 updated/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^ban$/i }));
    expect(calls.map((call) => call.action)).toEqual(expect.arrayContaining([
      'update-product',
      'delete-product',
      'cancel-order',
      'approve-topup',
      'approve-kyc',
      'ban-user',
    ]));
  });
});
