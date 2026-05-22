import { describe, expect, it } from 'vitest';
import { api } from './api';
import { installFetchMock, jsonResponse, textResponse } from '../test/testUtils.jsx';

describe('api client', () => {
  it('checks all service health endpoints and marks failures down', async () => {
    installFetchMock({
      'GET /actuator/health': ({ parsed }) => {
        if (parsed.host.includes('8084')) {
          return jsonResponse({ message: 'maintenance' }, 503);
        }
        if (parsed.host.includes('8083')) {
          throw new Error('network refused');
        }
        return { body: { status: 'UP' } };
      },
      'GET /health': { body: { status: 'UP', db: 'UP' } },
    });

    const result = await api.getHealth();

    expect(result.services).toHaveLength(5);
    expect(result.services.find((service) => service.key === 'auth')).toMatchObject({ status: 'UP' });
    expect(result.services.find((service) => service.key === 'order')).toMatchObject({
      status: 'DOWN',
      detail: 'maintenance',
    });
    expect(result.services.find((service) => service.key === 'wallet')).toMatchObject({
      status: 'DOWN',
      detail: 'network refused',
    });
  });

  it('wraps auth, profile, and user-management endpoints with bearer tokens', async () => {
    localStorage.setItem('json.sessionToken', 'session-token');
    const calls = installFetchMock({
      'POST /auth/register': { status: 201, body: { id: 1 } },
      'POST /auth/login': { body: { token: 'next', id: 1, role: 'TITIPER' } },
      'GET /auth/me': { body: { id: 1, role: 'TITIPER' } },
      'PUT /profile': { body: { id: 1, fullName: 'Updated' } },
      'POST /profile/kyc': { body: { id: 1, kycStatus: 'PENDING' } },
      'GET /profile/admin/users': { body: [{ id: 1 }] },
      'POST /profile/admin/users/1/kyc/approve': { body: { id: 1, kycStatus: 'APPROVED' } },
      'POST /profile/admin/users/1/kyc/reject': { body: { id: 1, kycStatus: 'REJECTED' } },
      'POST /profile/admin/users/1/ban': { body: { id: 1, banned: true } },
      'POST /profile/admin/users/1/unban': { body: { id: 1, banned: false } },
      'POST /profile/admin/users/1/demote': { body: { id: 1, role: 'TITIPER' } },
    });

    await expect(api.register({ email: 'a@b.c' })).resolves.toEqual({ id: 1 });
    await expect(api.login({ email: 'a@b.c' })).resolves.toMatchObject({ token: 'next' });
    await expect(api.getCurrentUser('custom-token')).resolves.toMatchObject({ id: 1 });
    await expect(api.updateProfile({ fullName: 'Updated' })).resolves.toMatchObject({ fullName: 'Updated' });
    await expect(api.submitKyc({ nik: '1' })).resolves.toMatchObject({ kycStatus: 'PENDING' });
    await expect(api.listAuthUsers()).resolves.toHaveLength(1);
    await expect(api.approveKyc(1, 'ok')).resolves.toMatchObject({ kycStatus: 'APPROVED' });
    await expect(api.rejectKyc(1, 'bad')).resolves.toMatchObject({ kycStatus: 'REJECTED' });
    await expect(api.banUser(1, 'fraud')).resolves.toMatchObject({ banned: true });
    await expect(api.unbanUser(1)).resolves.toMatchObject({ banned: false });
    await expect(api.demoteUser(1, 'done')).resolves.toMatchObject({ role: 'TITIPER' });

    expect(calls.find((call) => call.path === '/auth/me').headers.Authorization).toBe('Bearer custom-token');
    expect(calls.find((call) => call.path === '/profile').headers.Authorization).toBe('Bearer session-token');
  });

  it('wraps inventory and wallet operations', async () => {
    const calls = installFetchMock({
      'GET /api/products/search': { body: [{ id: 'p1' }] },
      'GET /api/products/search?keyword=shoe': { body: [{ id: 'p2' }] },
      'GET /api/products/jastipers/2003': { body: [{ id: 'p3' }] },
      'GET /api/products/p1': { body: { id: 'p1' } },
      'GET /api/products/me': { body: [{ id: 'mine' }] },
      'POST /api/products': { body: { id: 'created' } },
      'PUT /api/products/p1': { body: { id: 'p1', name: 'Updated' } },
      'DELETE /api/products/p1': { body: {} },
      'GET /api/products': { body: [{ id: 'admin' }] },
      'PUT /api/products/admin/p1': { body: { id: 'p1', stock: 3 } },
      'DELETE /api/products/admin/p1': { body: {} },
      'POST /wallet/balance': { body: { userId: 1, balance: 1000 } },
      'POST /wallet/transactions': { body: [{ id: 1 }] },
      'POST /wallet/topup': { body: { requestId: 10 } },
      'GET /wallet/admin/topups': { body: [{ id: 10 }] },
      'POST /wallet/topup/10/mark-success': { body: { id: 10, status: 'SUCCESS' } },
      'POST /wallet/topup/10/mark-failed': { body: { id: 10, status: 'FAILED' } },
    });

    await expect(api.listProducts()).resolves.toEqual([{ id: 'p1' }]);
    await expect(api.listProducts('shoe')).resolves.toEqual([{ id: 'p2' }]);
    await expect(api.listProductsByJastiper(2003)).resolves.toEqual([{ id: 'p3' }]);
    await expect(api.getProduct('p1')).resolves.toEqual({ id: 'p1' });
    await expect(api.listMyProducts()).resolves.toEqual([{ id: 'mine' }]);
    await expect(api.createProduct({ name: 'A' })).resolves.toEqual({ id: 'created' });
    await expect(api.updateProduct('p1', { name: 'Updated' })).resolves.toMatchObject({ name: 'Updated' });
    await expect(api.deleteProduct('p1')).resolves.toEqual({});
    await expect(api.listAdminProducts()).resolves.toEqual([{ id: 'admin' }]);
    await expect(api.adminUpdateProduct('p1', { stock: 3 })).resolves.toMatchObject({ stock: 3 });
    await expect(api.adminDeleteProduct('p1')).resolves.toEqual({});

    await expect(api.getWallet(1)).resolves.toMatchObject({ balance: 1000 });
    await expect(api.listWalletTransactions(1)).resolves.toHaveLength(1);
    await expect(api.topUpWallet(1, 5000)).resolves.toMatchObject({ requestId: 10, approved: false });
    await expect(api.listWalletTopUpRequests()).resolves.toHaveLength(1);
    await expect(api.markWalletTopUpSuccess(10)).resolves.toMatchObject({ status: 'SUCCESS' });
    await expect(api.markWalletTopUpFailed(10)).resolves.toMatchObject({ status: 'FAILED' });

    expect(calls.find((call) => call.path === '/wallet/balance').body).toBe(JSON.stringify({ userId: 1 }));
  });

  it('wraps order and voucher operations, including envelopes and admin-token validation', async () => {
    const calls = installFetchMock({
      'GET /orders/my': { body: { success: true, data: [{ id: 1 }] } },
      'GET /orders/my/active': { body: { success: true, data: [{ id: 2 }] } },
      'GET /orders/jastiper': { body: { success: true, data: [{ id: 3 }] } },
      'GET /orders/admin': { body: { success: true, data: [{ id: 4 }] } },
      'GET /orders/1': { body: { success: true, data: { id: 1 } } },
      'POST /orders/checkout': { status: 201, body: { success: true, data: { id: 5 } } },
      'POST /orders/1/cancel': { body: { success: true, data: { id: 1, status: 'CANCELLED' } } },
      'PATCH /orders/1/status': { body: { success: true, data: { id: 1, status: 'SHIPPED' } } },
      'POST /orders/1/rating': { body: { success: true, data: { id: 1, rating: { productRating: 5 } } } },
      'GET /vouchers/active': { body: [{ code: 'MILESTONE10' }] },
      'GET /admin/vouchers?status=ACTIVE': { body: [{ id: 7 }] },
      'GET /admin/vouchers/redemptions': { body: [{ id: 8 }] },
      'POST /admin/vouchers': { status: 201, body: { id: 9 } },
      'PUT /admin/vouchers/9': { body: { id: 9, code: 'NEXT' } },
      'POST /admin/vouchers/9/disable': { body: { id: 9, status: 'INACTIVE' } },
      'GET /orders/500': { body: { success: false, error: { message: 'Envelope rejected' }, data: null } },
      'POST /orders/checkout-no-key': { status: 201, body: { success: true, data: { id: 6 } } },
      'POST /auth/login-details': { status: 400, body: { error: { details: ['Email is invalid', 'Password is weak'] } } },
      'GET /bad-json': textResponse('plain failure', 500, { 'Content-Type': 'text/plain' }),
    });

    await expect(api.listOrders()).resolves.toEqual([{ id: 1 }]);
    await expect(api.listActiveOrders()).resolves.toEqual([{ id: 2 }]);
    await expect(api.listJastiperOrders()).resolves.toEqual([{ id: 3 }]);
    await expect(api.listAdminOrders()).resolves.toEqual([{ id: 4 }]);
    await expect(api.getOrder(1)).resolves.toEqual({ id: 1 });
    await expect(api.checkout({
      productId: 'p1',
      quantity: 2,
      shippingAddress: 'Jl. Testing',
      voucherCode: ' MILESTONE10 ',
      idempotencyKey: 'idem-1',
    })).resolves.toEqual({ id: 5 });
    await expect(api.cancelOrder(1)).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(api.updateOrderStatus(1, 'SHIPPED')).resolves.toMatchObject({ status: 'SHIPPED' });
    await expect(api.submitOrderRating(1, { productRating: 5 })).resolves.toMatchObject({ rating: { productRating: 5 } });
    await expect(api.listActiveVouchers()).resolves.toEqual([{ code: 'MILESTONE10' }]);
    await expect(api.listAdminVouchers(' admin-token ', 'ACTIVE')).resolves.toEqual([{ id: 7 }]);
    await expect(api.listVoucherRedemptions('admin-token')).resolves.toEqual([{ id: 8 }]);
    await expect(api.createAdminVoucher('admin-token', { code: 'A' })).resolves.toEqual({ id: 9 });
    await expect(api.updateAdminVoucher('admin-token', 9, { code: 'NEXT' })).resolves.toMatchObject({ code: 'NEXT' });
    await expect(api.disableAdminVoucher('admin-token', 9)).resolves.toMatchObject({ status: 'INACTIVE' });
    expect(() => api.listAdminVouchers('')).toThrow('Admin voucher token is required.');
    await expect(api.getOrder(500)).rejects.toThrow('Envelope rejected');

    const checkoutCall = calls.find((call) => call.path === '/orders/checkout');
    expect(checkoutCall.headers['Idempotency-Key']).toBe('idem-1');
    expect(JSON.parse(checkoutCall.body)).toMatchObject({
      address: 'Jl. Testing',
      voucherCode: 'MILESTONE10',
      items: [{ productId: 'p1', qty: 2 }],
    });
    expect(calls.find((call) => call.path === '/admin/vouchers').headers['X-Admin-Token']).toBe('admin-token');
  });

  it('normalizes validation details and optional checkout fields', async () => {
    const calls = installFetchMock({
      'POST /orders/checkout': { status: 201, body: { success: true, data: { id: 6 } } },
      'POST /auth/login': { status: 400, body: { error: { details: ['Email is invalid', 'Password is weak'] } } },
    });

    await expect(api.login({ email: 'bad' })).rejects.toThrow('Email is invalid, Password is weak');
    await expect(api.checkout({
      productId: 'p2',
      quantity: 1,
      shippingAddress: 'Jl. Optional',
      voucherCode: '   ',
    })).resolves.toEqual({ id: 6 });

    const checkoutCall = calls.find((call) => call.path === '/orders/checkout');
    expect(checkoutCall.headers['Idempotency-Key']).toBeUndefined();
    expect(JSON.parse(checkoutCall.body)).toMatchObject({ voucherCode: null });
  });
});
