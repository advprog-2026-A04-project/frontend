import express from 'express';
import {
  clearSession,
  completeOrder,
  createPendingOrder,
  createSession,
  getDemoCredentials,
  getOrder,
  getProduct,
  getServiceModes,
  getSession,
  getWallet,
  listOrders,
  listProducts,
  loginUser,
  markOrderFailed,
  registerUser,
  topUpWallet,
} from './store.js';
import {
  claimVoucher,
  ensureDemoVoucher,
  fetchVoucherHealth,
  listActiveVouchers,
  validateVoucher,
  voucherConfig,
} from './voucherClient.js';

function getBearerToken(request) {
  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice(7).trim();
}

function requireSession(request, response, next) {
  const token = getBearerToken(request);
  const session = token ? getSession(token) : null;

  if (!session) {
    response.status(401).json({ message: 'Please log in first.' });
    return;
  }

  request.session = session;
  next();
}

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get(
    '/api/health',
    asyncRoute(async (_request, response) => {
      const voucherHealth = await fetchVoucherHealth();

      response.json({
        milestoneScope: ['25%', '50%'],
        demoVoucherCode: voucherConfig.demoVoucherCode,
        demoCredentials: getDemoCredentials(),
        services: {
          ...getServiceModes(),
          voucher: {
            mode: voucherHealth.status === 'UP' ? 'live' : 'degraded',
            note:
              voucherHealth.status === 'UP'
                ? 'Voucher validation and claim use the live Cloud Run deployment.'
                : 'Voucher service is currently unavailable; checkout will surface that clearly.',
            health: voucherHealth,
            baseUrl: voucherConfig.baseUrl,
          },
        },
      });
    }),
  );

  app.post('/api/auth/register', (request, response) => {
    const user = registerUser(request.body || {});
    response.status(201).json({
      message: 'Registration successful. You can log in immediately.',
      user,
    });
  });

  app.post('/api/auth/login', (request, response) => {
    const user = loginUser(request.body || {});
    const session = createSession(user.id);

    response.json(session);
  });

  app.post('/api/auth/logout', requireSession, (request, response) => {
    clearSession(request.session.token);
    response.status(204).end();
  });

  app.get('/api/session', requireSession, (request, response) => {
    response.json({
      user: request.session.user,
    });
  });

  app.get('/api/products', (request, response) => {
    const items = listProducts(request.query.q);
    response.json({ items });
  });

  app.get('/api/products/:productId', (request, response) => {
    response.json({
      product: getProduct(request.params.productId),
    });
  });

  app.get('/api/wallet', requireSession, (request, response) => {
    response.json(getWallet(request.session.user.id));
  });

  app.post('/api/wallet/topup', requireSession, (request, response) => {
    const transaction = topUpWallet(request.session.user.id, request.body?.amount);
    response.status(201).json(transaction);
  });

  app.get('/api/orders', requireSession, (request, response) => {
    response.json({
      items: listOrders(request.session.user.id),
    });
  });

  app.get('/api/orders/:orderId', requireSession, (request, response) => {
    response.json({
      order: getOrder(request.session.user.id, request.params.orderId),
    });
  });

  app.get(
    '/api/vouchers/active',
    asyncRoute(async (_request, response) => {
      const items = await listActiveVouchers();
      response.json({ items });
    }),
  );

  app.post(
    '/api/vouchers/validate',
    requireSession,
    asyncRoute(async (request, response) => {
      const data = await validateVoucher({
        code: request.body?.code,
        orderAmount: request.body?.orderAmount,
        buyerId: request.session.user.id,
      });

      response.json(data);
    }),
  );

  app.post(
    '/api/checkout',
    requireSession,
    asyncRoute(async (request, response) => {
      const userId = request.session.user.id;
      const productId = Number(request.body?.productId);
      const quantity = Number(request.body?.quantity);
      const shippingAddress = request.body?.shippingAddress;
      const voucherCode = String(request.body?.voucherCode || '').trim().toUpperCase();

      const pendingOrder = createPendingOrder(userId, {
        productId,
        quantity,
        shippingAddress,
        voucherCode,
      });

      const currentProduct = getProduct(productId);

      if (currentProduct.stock < quantity) {
        const failedOrder = markOrderFailed(userId, pendingOrder.id, {
          code: 'INSUFFICIENT_STOCK',
          message: `Only ${currentProduct.stock} item(s) left in stock.`,
          voucherCode,
          voucherMessage: voucherCode ? 'Skipped because stock validation failed.' : 'Not used',
          totalPaid: pendingOrder.subtotal,
        });

        response.json({
          success: false,
          message: failedOrder.failureReason.message,
          order: failedOrder,
        });
        return;
      }

      let discountTotal = 0;
      let voucherMessage = voucherCode ? 'Validated successfully.' : 'Not used';

      if (voucherCode) {
        const voucherValidation = await validateVoucher({
          code: voucherCode,
          orderAmount: pendingOrder.subtotal,
          buyerId: userId,
        });

        if (!voucherValidation.valid) {
          const failedOrder = markOrderFailed(userId, pendingOrder.id, {
            code: 'VOUCHER_INVALID',
            message: voucherValidation.message || 'Voucher is invalid.',
            voucherCode,
            voucherMessage: voucherValidation.message || 'Voucher validation failed.',
            totalPaid: pendingOrder.subtotal,
          });

          response.json({
            success: false,
            message: failedOrder.failureReason.message,
            order: failedOrder,
          });
          return;
        }

        discountTotal = Number(voucherValidation.discountAmount || 0);
        voucherMessage = voucherValidation.message || 'Voucher validated.';
      }

      const wallet = getWallet(userId);
      const totalPaid = Math.max(pendingOrder.subtotal - discountTotal, 0);

      if (wallet.balance < totalPaid) {
        const failedOrder = markOrderFailed(userId, pendingOrder.id, {
          code: 'INSUFFICIENT_WALLET',
          message: 'Wallet balance is insufficient for this checkout.',
          voucherCode,
          voucherMessage,
          discountTotal,
          totalPaid,
        });

        response.json({
          success: false,
          message: failedOrder.failureReason.message,
          order: failedOrder,
        });
        return;
      }

      if (voucherCode) {
        await ensureDemoVoucher().catch(() => undefined);
        const voucherClaim = await claimVoucher({
          code: voucherCode,
          orderId: pendingOrder.id,
          orderAmount: pendingOrder.subtotal,
          buyerId: userId,
        });

        if (!voucherClaim.success) {
          const failedOrder = markOrderFailed(userId, pendingOrder.id, {
            code: 'VOUCHER_CLAIM_FAILED',
            message: voucherClaim.message || 'Voucher claim failed.',
            voucherCode,
            voucherMessage: voucherClaim.message || 'Voucher claim failed.',
            discountTotal,
            totalPaid,
          });

          response.json({
            success: false,
            message: failedOrder.failureReason.message,
            order: failedOrder,
          });
          return;
        }

        voucherMessage = voucherClaim.idempotent
          ? 'Voucher was already claimed for this order.'
          : 'Voucher claimed successfully.';
      }

      const completedOrder = completeOrder(userId, pendingOrder.id, {
        productId,
        quantity,
        discountTotal,
        totalPaid,
        voucherCode,
        voucherMessage,
      });

      response.status(201).json({
        success: true,
        message: 'Checkout completed and payment recorded.',
        order: completedOrder,
      });
    }),
  );

  app.use((error, _request, response, _next) => {
    response.status(error.status || 500).json({
      message: error.message || 'Unexpected server error.',
    });
  });

  return app;
}
