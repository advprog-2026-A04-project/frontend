import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import { useSession } from '../context/SessionContext';
import { authenticatedRoutes, renderAppAt, sampleOrder, sampleProduct } from './testUtils.jsx';

const buyerProfile = {
  id: 1000,
  email: 'demo@json.app',
  username: 'demo-buyer',
  fullName: 'Demo Buyer',
  role: 'TITIPER',
  kycStatus: 'NOT_SUBMITTED',
};

const jastiperProfile = {
  id: 2003,
  email: 'jastiper@json.app',
  username: 'jastiper-2003',
  fullName: 'Jastiper 2003',
  role: 'JASTIPER',
  kycStatus: 'APPROVED',
};

const adminProfile = {
  id: 9001,
  email: 'admin@json.app',
  username: 'json-admin',
  fullName: 'JSON Admin',
  role: 'ADMIN',
};

function homeRoutes() {
  return {
    'GET /actuator/health': { body: { status: 'UP' } },
    'GET /health': { body: { status: 'UP', db: 'UP' } },
    'GET /api/products/search': { body: [sampleProduct] },
  };
}

describe('edge page and regression flows', () => {
  it('guards session hook usage outside the provider', () => {
    function SessionProbe() {
      useSession();
      return null;
    }

    expect(() => render(<SessionProbe />)).toThrow('useSession must be used inside SessionProvider.');
  });

  it('renders product card fallback labels and image fallback errors', () => {
    const fallbackProduct = {
      id: 'fallback-product',
      name: 'Fallback <Drop>',
      description: 'No category, origin, or trusted image.',
      price: 90000,
      stock: 1,
      imageUrl: 'not-a-url',
    };

    render(
      <MemoryRouter>
        <ProductCard product={fallbackProduct} />
        <ProductImage product={{ ...fallbackProduct, imageUrl: 'https://example.com/broken.jpg' }} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Limited drop')).toBeInTheDocument();
    expect(screen.getByText('Global pickup')).toBeInTheDocument();
    expect(screen.getByText('Stock 1')).toBeInTheDocument();

    const brokenImage = screen.getAllByAltText('Fallback <Drop>')[1];
    fireEvent.error(brokenImage);
    expect(brokenImage.getAttribute('src')).toContain('data:image/svg+xml');
  });

  it('clears a stale persisted session when hydration fails', async () => {
    renderAppAt(
      '/profile',
      {
        'GET /auth/me': {
          status: 401,
          body: { message: 'Session expired' },
        },
      },
      buyerProfile,
    );

    expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    expect(localStorage.getItem('json.sessionToken')).toBeNull();
  });

  it('redirects unauthenticated and unauthorized protected routes', async () => {
    const { view } = renderAppAt('/wallet', {});

    expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
    view.unmount();

    renderAppAt(
      '/admin',
      {
        ...authenticatedRoutes(buyerProfile),
        ...homeRoutes(),
      },
      buyerProfile,
    );

    expect(await screen.findByRole('heading', { name: /secure hype drops/i })).toBeInTheDocument();
  });

  it('submits KYC evidence from profile and logs out cleanly', async () => {
    renderAppAt(
      '/profile',
      {
        ...authenticatedRoutes(buyerProfile),
        'POST /profile/kyc': ({ body }) => ({
          body: {
            ...buyerProfile,
            kycStatus: 'PENDING',
            kycDocumentUrl: body.documentUrl,
          },
        }),
        ...homeRoutes(),
      },
      buyerProfile,
    );

    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: buyerProfile.fullName })).toBeInTheDocument();
    await user.type(screen.getByTestId('kyc-document-url'), 'https://docs.example/kyc.pdf');
    await user.type(screen.getByTestId('kyc-note'), 'Ready to become a jastiper.');
    expect(screen.getByTestId('kyc-full-name')).toHaveValue('Demo Buyer');
    await user.click(screen.getByTestId('submit-kyc-button'));

    expect(await screen.findByText(/kyc submitted for admin review/i)).toBeInTheDocument();
    expect((await screen.findAllByText(/current status: pending/i)).length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem('json.sessionUser'))).toMatchObject({ kycStatus: 'PENDING' });

    await user.click(screen.getByRole('button', { name: /logout/i }));
    expect(await screen.findByRole('heading', { name: /secure hype drops/i })).toBeInTheDocument();
    expect(localStorage.getItem('json.sessionToken')).toBeNull();
  });

  it('requires a legal name and saves it before submitting KYC', async () => {
    const profileWithoutName = { ...buyerProfile, fullName: '' };
    const calls = [];
    renderAppAt(
      '/profile',
      {
        ...authenticatedRoutes(profileWithoutName),
        'PUT /profile': ({ body }) => {
          calls.push({ action: 'profile', body });
          return { body: { ...profileWithoutName, ...body } };
        },
        'POST /profile/kyc': ({ body }) => {
          calls.push({ action: 'kyc', body });
          return { body: { ...profileWithoutName, fullName: body.fullName, kycStatus: 'PENDING' } };
        },
      },
      profileWithoutName,
    );

    const user = userEvent.setup();
    expect(await screen.findByText(/kyc not_submitted/i)).toBeInTheDocument();
    await user.type(screen.getByTestId('kyc-full-name'), 'Budi');
    await user.type(screen.getByTestId('kyc-document-url'), 'https://docs.example/budi.pdf');
    await user.click(screen.getByTestId('submit-kyc-button'));
    expect(await screen.findByText(/full name is required/i)).toBeInTheDocument();

    await user.clear(screen.getByTestId('kyc-full-name'));
    await user.type(screen.getByTestId('kyc-full-name'), 'Budi Santoso');
    await user.click(screen.getByTestId('submit-kyc-button'));

    expect(await screen.findByText(/kyc submitted for admin review/i)).toBeInTheDocument();
    expect(calls).toEqual([
      { action: 'profile', body: { username: 'demo-buyer', fullName: 'Budi Santoso' } },
      {
        action: 'kyc',
        body: {
          fullName: 'Budi Santoso',
          documentUrl: 'https://docs.example/budi.pdf',
          note: '',
        },
      },
    ]);
  });

  it('keeps KYC status pending when profile refresh lags after submission', async () => {
    let authCalls = 0;
    renderAppAt(
      '/profile',
      {
        'GET /auth/me': () => {
          authCalls += 1;
          if (authCalls === 1) {
            return { body: buyerProfile };
          }
          return { status: 503, body: { message: 'Profile refresh is still catching up' } };
        },
        'POST /profile/kyc': ({ body }) => ({
          body: {
            fullName: body.fullName,
            documentUrl: body.documentUrl,
          },
        }),
      },
      buyerProfile,
    );

    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: buyerProfile.fullName })).toBeInTheDocument();
    await user.type(screen.getByTestId('kyc-document-url'), 'https://docs.example/pending.pdf');
    await user.click(screen.getByTestId('submit-kyc-button'));

    expect(await screen.findByText(/kyc submitted for admin review/i)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('json.sessionUser'))).toMatchObject({ kycStatus: 'PENDING' });
  });

  it('shows jastiper profile affordances and propagates profile errors', async () => {
    renderAppAt(
      '/profile',
      {
        ...authenticatedRoutes({ ...jastiperProfile, banned: true }),
        'PUT /profile': {
          status: 422,
          body: { error: { details: ['Username is already taken'] } },
        },
      },
      { ...jastiperProfile, banned: true },
    );

    const user = userEvent.setup();
    expect(await screen.findByText(/banned/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /jastiper queue/i })).toHaveAttribute('href', '/jastiper/orders');

    await user.clear(screen.getByLabelText(/username/i));
    await user.type(screen.getByLabelText(/username/i), 'duplicate');
    await user.click(screen.getByRole('button', { name: /save profile/i }));

    expect(await screen.findByText(/username is already taken/i)).toBeInTheDocument();
  });

  it('shows the admin profile shortcut for administrators', async () => {
    renderAppAt(
      '/profile',
      {
        ...authenticatedRoutes({
          ...buyerProfile,
          role: 'ADMIN',
          fullName: 'Admin User',
        }),
      },
      {
        ...buyerProfile,
        role: 'ADMIN',
        fullName: 'Admin User',
      },
    );

    expect(await screen.findByRole('heading', { name: 'Admin User' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /admin console/i })).toHaveAttribute('href', '/admin');
  });

  it('renders profile fallbacks for incomplete persisted users', async () => {
    const sparseProfile = {
      id: 1000,
      email: '',
      username: '',
      fullName: '',
      role: 'TITIPER',
    };

    renderAppAt(
      '/profile',
      {
        ...authenticatedRoutes(sparseProfile),
      },
      sparseProfile,
    );

    expect(await screen.findByText(/kyc not_submitted/i)).toBeInTheDocument();
    expect(screen.getAllByAltText(/profile avatar/i)[0].getAttribute('src')).toContain('seed=json');
  });

  it('searches catalog by jastiper, filters categories, and reports empty results', async () => {
    const bareProduct = { ...sampleProduct, id: 'bare-1', name: 'Mystery Drop', category: '', originLocation: '' };
    const japanProduct = { ...sampleProduct, id: 'jp-1', name: 'Tokyo Exclusive', category: 'Collectible', originLocation: 'Japan' };
    const koreaProduct = { ...sampleProduct, id: 'kr-1', name: 'Seoul Beauty Kit', category: 'Beauty', originLocation: 'Korea' };

    renderAppAt('/browse', {
      'GET /api/products/search': { body: [bareProduct, japanProduct, koreaProduct] },
      'GET /api/products/jastipers/2003': { body: [] },
    });

    const user = userEvent.setup();
    expect(await screen.findByText('Tokyo Exclusive')).toBeInTheDocument();
    expect(screen.getAllByText(/jastiper id: 2003/i).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /^beauty$/i }));
    expect(screen.queryByText('Tokyo Exclusive')).not.toBeInTheDocument();
    expect(screen.getByText('Seoul Beauty Kit')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^jastiper$/i }));
    await user.type(screen.getByPlaceholderText(/browse products from a jastiper/i), '2003');
    expect(await screen.findByText(/no products matched this search/i)).toBeInTheDocument();
  });

  it('reports catalog service errors without hiding filters', async () => {
    renderAppAt('/browse', {
      'GET /api/products/search': {
        status: 503,
        body: { message: 'Inventory unavailable' },
      },
    });

    expect(await screen.findByText(/inventory unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^product$/i })).toBeInTheDocument();
  });

  it('handles product detail guest checkout and out-of-stock states', async () => {
    const lowStockProduct = { ...sampleProduct, stock: 2, category: 'Ticket', avgRating: 4.25, imageUrl: '' };

    renderAppAt('/product/low-stock', {
      'GET /api/products/low-stock': { body: lowStockProduct },
    });

    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: lowStockProduct.name })).toBeInTheDocument();
    expect(screen.getByText('Jastiper ID')).toBeInTheDocument();
    await user.click(screen.getByText('add').closest('button'));
    await user.click(screen.getByText('add').closest('button'));
    await user.click(screen.getByText('remove').closest('button'));
    await user.click(screen.getByRole('button', { name: /log in to checkout/i }));

    expect(await screen.findByRole('heading', { name: /^log in$/i })).toBeInTheDocument();
  });

  it('shows submitted rating context on inventory detail', async () => {
    const ratedOrder = {
      ...sampleOrder,
      status: 'COMPLETED',
      rating: {
        productRating: 4,
        jastiperRating: 5,
        comment: 'Arrived safely.',
      },
    };

    renderAppAt(
      `/product/${sampleProduct.id}`,
      {
        ...authenticatedRoutes(buyerProfile),
        [`GET /api/products/${sampleProduct.id}`]: { body: sampleProduct },
        'POST /wallet/balance': { body: { userId: 1000, balance: 500000, currency: 'IDR' } },
        'GET /orders/my': { body: { success: true, data: [ratedOrder] } },
      },
      buyerProfile,
    );

    expect(await screen.findByRole('heading', { name: sampleProduct.name })).toBeInTheDocument();
    const reviewPanel = await screen.findByTestId('product-review-summary');
    expect(reviewPanel).toHaveTextContent('Your submitted review');
    expect(reviewPanel).toHaveTextContent('Arrived safely.');
    expect(reviewPanel).toHaveTextContent('4/5');
  });

  it('keeps administrators out of checkout and wallet flows', async () => {
    const { view } = renderAppAt(
      '/wallet',
      {
        ...authenticatedRoutes(adminProfile),
        'GET /orders/admin': { body: { success: true, data: [] } },
        'GET /api/products': { body: [] },
        'GET /profile/admin/users': { body: [] },
        'GET /wallet/admin/topups': { body: [] },
      },
      adminProfile,
    );

    expect(await screen.findByTestId('admin-dashboard')).toHaveTextContent('Admin overview');
    expect(screen.queryByRole('button', { name: /top up wallet/i })).not.toBeInTheDocument();
    view.unmount();

    renderAppAt(
      `/product/${sampleProduct.id}`,
      {
        ...authenticatedRoutes(adminProfile),
        [`GET /api/products/${sampleProduct.id}`]: { body: sampleProduct },
      },
      adminProfile,
    );

    const adminCheckout = await screen.findByRole('button', { name: /admin cannot checkout/i });
    expect(adminCheckout).toBeDisabled();
    expect(screen.queryByRole('link', { name: /^wallet$/i })).not.toBeInTheDocument();
  });

  it('renders product detail load failures and disabled checkout for empty stock', async () => {
    const { view } = renderAppAt('/product/missing', {
      'GET /api/products/missing': {
        status: 404,
        body: { message: 'Product missing' },
      },
    });

    expect(await screen.findByText(/product missing/i)).toBeInTheDocument();
    view.unmount();

    renderAppAt('/product/out', {
      'GET /api/products/out': {
        body: {
          id: 'out',
          name: 'Unavailable Mystery',
          description: 'No metadata should still render.',
          price: 100000,
          stock: 0,
          category: '',
          originLocation: '',
          purchaseDate: '',
          returnDate: '',
          avgRating: 0,
        },
      },
    });

    expect(await screen.findByText(/^out of stock$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in to checkout/i })).toBeDisabled();
  });

  it('handles checkout validation, fixed vouchers, submit failures, and missing product selection', async () => {
    const { view } = renderAppAt(
      '/checkout',
      {
        ...authenticatedRoutes(buyerProfile),
      },
      buyerProfile,
    );

    expect(await screen.findByText(/no product was selected/i)).toBeInTheDocument();
    view.unmount();

    const calls = [];
    renderAppAt(
      `/checkout?productId=${sampleProduct.id}&qty=2`,
      {
        ...authenticatedRoutes(buyerProfile),
        [`GET /api/products/${sampleProduct.id}`]: { body: sampleProduct },
        'POST /wallet/balance': { body: { userId: 1000, balance: 1000, currency: 'IDR' } },
        'GET /vouchers/active': {
          body: [
            {
              code: 'SAVE50',
              discountType: 'FIXED',
              discountValue: 50000,
              minSpend: 2000000,
            },
          ],
        },
        'POST /orders/checkout': ({ body }) => {
          calls.push(body);
          return {
            status: 400,
            body: { error: { message: 'Wallet balance is insufficient' } },
          };
        },
      },
      buyerProfile,
    );

    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: /complete your order/i })).toBeInTheDocument();
    await user.type(screen.getByLabelText(/voucher code/i), 'wrong');
    expect(screen.getByText(/this code is not in the active voucher list/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/voucher code/i));
    await user.type(screen.getByLabelText(/voucher code/i), 'save50');
    expect(screen.getByText(/code SAVE50 is currently active/i)).toBeInTheDocument();
    vi.stubGlobal('crypto', {});
    await user.click(screen.getByRole('button', { name: /checkout now/i }));
    expect(await screen.findByText(/wallet balance is insufficient/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /checkout now/i }));

    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ voucherCode: 'SAVE50' });
  });

  it('shows checkout load errors when the selected product cannot be fetched', async () => {
    renderAppAt(
      '/checkout?productId=broken&qty=1',
      {
        ...authenticatedRoutes(buyerProfile),
        'GET /api/products/broken': {
          status: 500,
          body: { message: 'Checkout product lookup failed' },
        },
        'POST /wallet/balance': { body: { userId: 1000, balance: 500000, currency: 'IDR' } },
        'GET /vouchers/active': { body: [] },
      },
      buyerProfile,
    );

    expect(await screen.findByText(/checkout product lookup failed/i)).toBeInTheDocument();
  });

  it('submits ratings and displays failure/refund order details', async () => {
    const completedOrder = {
      ...sampleOrder,
      status: 'COMPLETED',
      failureReason: 'Late shipment was resolved with a refund note.',
      refundDone: true,
      rating: null,
    };
    const ratedOrder = {
      ...completedOrder,
      rating: {
        productRating: 4,
        jastiperRating: 5,
        comment: 'Arrived safely.',
      },
    };

    renderAppAt(
      '/orders/1001',
      {
        ...authenticatedRoutes(buyerProfile),
        'GET /orders/1001': { body: { success: true, data: completedOrder } },
        'POST /orders/1001/rating': ({ body }) => ({
          body: {
            success: true,
            data: {
              ...ratedOrder,
              rating: body,
            },
          },
        }),
      },
      buyerProfile,
    );

    const user = userEvent.setup();
    expect(await screen.findByText(/refund has already been recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/late shipment was resolved/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/product rating/i));
    await user.type(screen.getByLabelText(/product rating/i), '4');
    await user.clear(screen.getByLabelText(/jastiper rating/i));
    await user.type(screen.getByLabelText(/jastiper rating/i), '5');
    await user.type(screen.getByLabelText(/comment/i), 'Arrived safely.');
    await user.click(screen.getByRole('button', { name: /submit rating/i }));

    expect(await screen.findByText(/rating submitted/i)).toBeInTheDocument();
    expect(await screen.findByText(/arrived safely/i)).toBeInTheDocument();
  });

  it('handles missing and failed order result states', async () => {
    const { view } = renderAppAt(
      '/success',
      {
        ...authenticatedRoutes(buyerProfile),
      },
      buyerProfile,
    );

    expect(await screen.findByText(/order id is missing/i)).toBeInTheDocument();
    view.unmount();

    renderAppAt(
      '/orders/404',
      {
        ...authenticatedRoutes(buyerProfile),
        'GET /orders/404': {
          status: 404,
          body: { message: 'Order not found' },
        },
      },
      buyerProfile,
    );

    expect(await screen.findByText(/order not found/i)).toBeInTheDocument();
  });

  it('shows registration failures from the auth service', async () => {
    renderAppAt('/register', {
      'POST /auth/register': {
        status: 409,
        body: { message: 'Email already registered' },
      },
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'taken@json.app');
    await user.type(screen.getByLabelText(/username/i), 'taken');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /register/i }));

    expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
  });

  it('renders empty orders, fallback order summaries, and order load errors', async () => {
    const { view } = renderAppAt(
      '/orders',
      {
        ...authenticatedRoutes(buyerProfile),
        'GET /orders/my': { body: { success: true, data: [] } },
        'GET /orders/my/active': { body: { success: true, data: [] } },
      },
      buyerProfile,
    );

    expect(await screen.findByText(/no active orders/i)).toBeInTheDocument();
    expect(screen.getByText(/no orders yet/i)).toBeInTheDocument();
    view.unmount();

    const unknownOrder = {
      ...sampleOrder,
      id: 3030,
      status: 'CANCELLED',
      voucherCode: '',
      refundDone: true,
      items: [],
    };

    const { view: fallbackView } = renderAppAt(
      '/orders',
      {
        ...authenticatedRoutes(buyerProfile),
        'GET /orders/my': { body: { success: true, data: [unknownOrder] } },
        'GET /orders/my/active': { body: { success: true, data: [unknownOrder] } },
      },
      buyerProfile,
    );

    expect(await screen.findAllByText(/order 3030/i)).toHaveLength(2);
    expect(screen.getAllByText(/refund recorded/i)).toHaveLength(2);
    expect(screen.getAllByText(/0 line item/i)).toHaveLength(2);
    fallbackView.unmount();

    renderAppAt(
      '/orders',
      {
        ...authenticatedRoutes(buyerProfile),
        'GET /orders/my': {
          status: 503,
          body: { message: 'Orders unavailable' },
        },
        'GET /orders/my/active': { body: { success: true, data: [] } },
      },
      buyerProfile,
    );

    expect(await screen.findByText(/orders unavailable/i)).toBeInTheDocument();
  });

  it('renders empty jastiper queues and action errors', async () => {
    const { view } = renderAppAt(
      '/jastiper/orders',
      {
        ...authenticatedRoutes(jastiperProfile),
        'GET /orders/jastiper': { body: { success: true, data: [] } },
      },
      jastiperProfile,
    );

    expect(await screen.findByText(/no assigned orders/i)).toBeInTheDocument();
    view.unmount();

    renderAppAt(
      '/jastiper/orders',
      {
        ...authenticatedRoutes(jastiperProfile),
        'GET /orders/jastiper': { body: { success: true, data: [{ ...sampleOrder, status: 'SHIPPED' }] } },
        'PATCH /orders/1001/status': {
          status: 409,
          body: { message: 'Invalid status transition' },
        },
      },
      jastiperProfile,
    );

    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: /process active orders/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cancel$/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /mark completed/i }));
    expect(await screen.findByText(/invalid status transition/i)).toBeInTheDocument();
  });

  it('handles sparse jastiper catalog records, delete reset, and load failures', async () => {
    const sparseProduct = {
      id: 'sparse-product',
      price: null,
      stock: null,
    };
    const calls = [];

    const { view } = renderAppAt(
      '/jastiper/catalog',
      {
        ...authenticatedRoutes(jastiperProfile),
        'GET /api/products/me': ({ calls: fetchCalls }) => {
          const deleteHasRun = fetchCalls.some((call) => call.path === '/api/products/sparse-product' && call.method === 'DELETE');
          return { body: deleteHasRun ? [] : [sparseProduct] };
        },
        'DELETE /api/products/sparse-product': () => {
          calls.push('delete');
          return { body: {} };
        },
      },
      jastiperProfile,
    );

    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: /manage products and stock/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(screen.getByRole('heading', { name: /edit product/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(await screen.findByText(/product deleted/i)).toBeInTheDocument();
    expect(await screen.findByText(/no products yet/i)).toBeInTheDocument();
    expect(calls).toEqual(['delete']);
    view.unmount();

    renderAppAt(
      '/jastiper/catalog',
      {
        ...authenticatedRoutes(jastiperProfile),
        'GET /api/products/me': {
          status: 500,
          body: { message: 'Catalog manager failed' },
        },
      },
      jastiperProfile,
    );

    expect(await screen.findByText(/catalog manager failed/i)).toBeInTheDocument();
  });

  it('shows wallet empty, refund, load-error, and top-up-error states', async () => {
    const { view } = renderAppAt(
      '/wallet',
      {
        ...authenticatedRoutes(buyerProfile),
        'POST /wallet/balance': { body: { userId: 1000, balance: 0, currency: 'IDR' } },
        'POST /wallet/transactions': { body: [] },
      },
      buyerProfile,
    );

    expect(await screen.findByText(/no wallet transactions yet/i)).toBeInTheDocument();
    view.unmount();

    const { view: refundView } = renderAppAt(
      '/wallet',
      {
        ...authenticatedRoutes(buyerProfile),
        'POST /wallet/balance': { body: { userId: 1000, balance: 50000, currency: 'IDR' } },
        'POST /wallet/transactions': {
          body: [
            {
              id: 91,
              userId: 1000,
              type: 'REFUND',
              amount: 25000,
              refType: 'ORDER',
              refId: 1001,
              status: 'SUCCESS',
              createdAt: '2026-05-22T04:00:00Z',
            },
          ],
        },
        'POST /wallet/topup': {
          status: 409,
          body: { message: 'Top-up rejected by policy' },
        },
      },
      buyerProfile,
    );

    const user = userEvent.setup();
    expect(await screen.findByText('REFUND')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /top up wallet/i }));
    expect(await screen.findByText(/top-up rejected by policy/i)).toBeInTheDocument();
    refundView.unmount();

    renderAppAt(
      '/wallet',
      {
        ...authenticatedRoutes(buyerProfile),
        'POST /wallet/balance': {
          status: 503,
          body: { message: 'Wallet unavailable' },
        },
        'POST /wallet/transactions': { body: [] },
      },
      buyerProfile,
    );

    expect(await screen.findByText(/wallet unavailable/i)).toBeInTheDocument();
  });

  it('covers authenticated home fallbacks and down service health', async () => {
    renderAppAt(
      '/',
      {
        ...authenticatedRoutes({ ...buyerProfile, fullName: '' }),
        'GET /actuator/health': ({ parsed }) => {
          if (parsed.host.includes('8083')) {
            return { status: 503, body: { message: 'Wallet maintenance' } };
          }
          return { body: { status: 'UP' } };
        },
        'GET /health': { body: { status: 'DOWN', message: 'Voucher database down' } },
        'GET /api/products/search': { body: [] },
      },
      { ...buyerProfile, fullName: '' },
    );

    expect(await screen.findByText(buyerProfile.username)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open catalog/i })).toHaveAttribute('href', '/browse');
    expect(screen.getByRole('link', { name: /track orders/i })).toHaveAttribute('href', '/orders');
    expect(await screen.findByText(/no products were returned by inventory/i)).toBeInTheDocument();
    expect(screen.getAllByText('DOWN').length).toBeGreaterThan(0);
  });

  it('handles admin empty queues, sparse records, and rejection controls', async () => {
    const sparseProduct = {
      id: 'admin-sparse',
      name: '',
      description: '',
      price: null,
      stock: null,
      originLocation: '',
      purchaseDate: '',
      returnDate: '',
    };
    const bannedUser = {
      id: 55,
      email: 'banned@json.app',
      username: 'banned-user',
      fullName: '',
      role: 'JASTIPER',
      kycStatus: '',
      banned: true,
    };
    const calls = [];

    renderAppAt(
      '/admin',
      {
        ...authenticatedRoutes(adminProfile),
        'GET /orders/admin': {
          body: {
            success: true,
            data: [
              {
                ...sampleOrder,
                status: 'COMPLETED',
                jastiperId: null,
                updatedAt: null,
              },
            ],
          },
        },
        'GET /api/products': { body: [sparseProduct] },
        'GET /profile/admin/users': { body: [bannedUser] },
        'GET /wallet/admin/topups': { body: [] },
        'GET /admin/vouchers': { body: [] },
        'GET /admin/vouchers/redemptions': { body: [] },
        'POST /profile/admin/users/55/kyc/reject': () => {
          calls.push('reject');
          return { body: { ...bannedUser, kycStatus: 'REJECTED' } };
        },
        'POST /profile/admin/users/55/demote': () => {
          calls.push('demote');
          return { body: { ...bannedUser, role: 'TITIPER' } };
        },
        'POST /profile/admin/users/55/unban': () => {
          calls.push('unban');
          return { body: { ...bannedUser, banned: false } };
        },
      },
      adminProfile,
    );

    const user = userEvent.setup();
    expect(await screen.findByRole('heading', { name: /voucher management and order monitoring/i })).toBeInTheDocument();
    expect(screen.getByTestId('wallet-topup-approval')).toHaveTextContent('No wallet top-up requests');
    expect(screen.getByTestId('admin-user-monitoring')).toHaveTextContent('User is banned.');

    await user.clear(screen.getByLabelText(/^code$/i));
    await user.type(screen.getByLabelText(/^code$/i), 'notoken');
    await user.click(screen.getByRole('button', { name: /create voucher/i }));
    expect(await screen.findByText(/admin voucher token is required/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/voucher admin token/i), 'admin-token');
    expect(await screen.findByText(/no voucher redemptions have been recorded/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(screen.getByRole('heading', { name: /edit selected product/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^reset$/i }));
    expect(screen.getByRole('heading', { name: /select a product/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reject kyc/i }));
    await user.click(screen.getByRole('button', { name: /demote/i }));
    await user.click(screen.getByRole('button', { name: /unban/i }));

    await waitFor(() => {
      expect(calls).toEqual(expect.arrayContaining(['reject', 'demote', 'unban']));
    });
  });

  it('renders the not-found page', async () => {
    renderAppAt('/route-that-does-not-exist', {});

    expect(await screen.findByRole('heading', { name: /that page does not exist/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back home/i })).toHaveAttribute('href', '/');
  });
});
