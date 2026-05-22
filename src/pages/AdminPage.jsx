import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';
import { allowedNextStatuses, canCancelOrder, formatCurrency, formatDate, slugStatus, statusLabel } from '../lib/format';
import PageShell from '../components/PageShell';

const EMPTY_VOUCHER_FORM = {
  code: '',
  discountType: 'FIXED',
  discountValue: 50000,
  minSpend: 0,
  quotaTotal: 10,
  startAt: '',
  endAt: '',
};

const EMPTY_PRODUCT_FORM = {
  name: '',
  description: '',
  price: 100000,
  stock: 0,
  originLocation: '',
  purchaseDate: '',
  returnDate: '',
};

function toLocalDateTimeInput(offsetDays = 0) {
  const value = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const pad = (number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { logout } = useSession();
  const [adminToken, setAdminToken] = useState('');
  const [orders, setOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [topUpRequests, setTopUpRequests] = useState([]);
  const [voucherForm, setVoucherForm] = useState({
    ...EMPTY_VOUCHER_FORM,
    startAt: toLocalDateTimeInput(-1),
    endAt: toLocalDateTimeInput(7),
  });
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [editingProductId, setEditingProductId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const orderPromise = api.listAdminOrders();
      const productPromise = api.listAdminProducts();
      const voucherPromise = adminToken ? api.listAdminVouchers(adminToken) : Promise.resolve([]);
      const redemptionPromise = adminToken ? api.listVoucherRedemptions(adminToken) : Promise.resolve([]);
      const usersPromise = api.listAuthUsers();
      const topUpPromise = api.listWalletTopUpRequests();
      const [orderData, productData, voucherData, redemptionData, userData, topUpData] = await Promise.all([
        orderPromise,
        productPromise,
        voucherPromise,
        redemptionPromise,
        usersPromise,
        topUpPromise,
      ]);
      setOrders(orderData);
      setProducts(productData);
      setVouchers(voucherData);
      setRedemptions(redemptionData);
      setUsers(userData);
      setTopUpRequests(topUpData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const activeVouchers = useMemo(() => vouchers.filter((voucher) => voucher.status === 'ACTIVE'), [vouchers]);
  const expiredVouchers = useMemo(() => vouchers.filter((voucher) => voucher.status === 'EXPIRED'), [vouchers]);
  const disabledVouchers = useMemo(() => vouchers.filter((voucher) => voucher.status === 'INACTIVE'), [vouchers]);
  const lowStockProducts = useMemo(() => products.filter((product) => Number(product.stock || 0) <= 3), [products]);
  const pendingTopUps = useMemo(() => topUpRequests.filter((request) => request.status === 'PENDING'), [topUpRequests]);
  const pendingKycUsers = useMemo(() => users.filter((account) => account.kycStatus === 'PENDING'), [users]);
  const activeOrders = useMemo(() => orders.filter((order) => ['PAID', 'PURCHASED', 'SHIPPED'].includes(order.status)), [orders]);
  const completedRevenue = useMemo(
    () =>
      orders
        .filter((order) => order.status === 'COMPLETED')
        .reduce((sum, order) => sum + Number(order.totalPaid || 0), 0),
    [orders],
  );

  async function refreshVouchers() {
    if (!adminToken) {
      setError('Admin voucher token is required to manage vouchers.');
      return;
    }
    const data = await api.listAdminVouchers(adminToken);
    setVouchers(data);
  }

  async function handleVoucherSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusyKey('voucher-form');

    try {
      const payload = {
        ...voucherForm,
        minSpend: Number(voucherForm.minSpend || 0),
        discountValue: Number(voucherForm.discountValue),
        quotaTotal: Number(voucherForm.quotaTotal),
      };

      if (editingVoucherId) {
        await api.updateAdminVoucher(adminToken, editingVoucherId, payload);
        setMessage(`Voucher ${voucherForm.code} updated.`);
      } else {
        await api.createAdminVoucher(adminToken, payload);
        setMessage(`Voucher ${voucherForm.code} created.`);
      }

      setEditingVoucherId(null);
      setVoucherForm({
        ...EMPTY_VOUCHER_FORM,
        startAt: toLocalDateTimeInput(-1),
        endAt: toLocalDateTimeInput(7),
      });
      await refreshVouchers();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  function startEditVoucher(voucher) {
    setEditingVoucherId(voucher.id);
    setVoucherForm({
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minSpend: voucher.minSpend || 0,
      quotaTotal: voucher.quotaTotal,
      startAt: String(voucher.startAt).slice(0, 16),
      endAt: String(voucher.endAt).slice(0, 16),
    });
  }

  function startEditProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      originLocation: product.originLocation || '',
      purchaseDate: product.purchaseDate || '',
      returnDate: product.returnDate || '',
    });
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(EMPTY_PRODUCT_FORM);
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
    if (!editingProductId) {
      return;
    }

    setBusyKey('product-form');
    setError('');
    setMessage('');
    try {
      await api.adminUpdateProduct(editingProductId, {
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
      });
      setMessage(`Product ${productForm.name} updated.`);
      resetProductForm();
      setProducts(await api.listAdminProducts());
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  async function handleDeleteProduct(productId) {
    setBusyKey(`product-${productId}`);
    setError('');
    setMessage('');
    try {
      await api.adminDeleteProduct(productId);
      setMessage(`Product ${productId} deleted.`);
      if (editingProductId === productId) {
        resetProductForm();
      }
      setProducts(await api.listAdminProducts());
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  async function handleDisableVoucher(voucherId) {
    setBusyKey(`voucher-${voucherId}`);
    setError('');
    setMessage('');
    try {
      await api.disableAdminVoucher(adminToken, voucherId);
      setMessage(`Voucher ${voucherId} disabled.`);
      await refreshVouchers();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  async function handleCancelOrder(orderId) {
    setBusyKey(`order-${orderId}`);
    setError('');
    setMessage('');
    try {
      await api.cancelOrder(orderId);
      setMessage(`Order ${orderId} was cancelled and refunded.`);
      setOrders(await api.listAdminOrders());
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  async function handleTopUpAction(requestId, action) {
    setBusyKey(`topup-${requestId}-${action}`);
    setError('');
    setMessage('');
    try {
      if (action === 'approve') {
        await api.markWalletTopUpSuccess(requestId);
        setMessage(`Top-up request ${requestId} approved.`);
      } else {
        await api.markWalletTopUpFailed(requestId);
        setMessage(`Top-up request ${requestId} rejected.`);
      }
      setTopUpRequests(await api.listWalletTopUpRequests());
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  async function handleStatusChange(orderId, nextStatus) {
    setBusyKey(`order-${orderId}`);
    setError('');
    setMessage('');
    try {
      await api.updateOrderStatus(orderId, nextStatus);
      setMessage(`Order ${orderId} moved to ${statusLabel(nextStatus)}.`);
      setOrders(await api.listAdminOrders());
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  async function handleUserAction(userId, action) {
    setBusyKey(`user-${userId}-${action}`);
    setError('');
    setMessage('');
    try {
      if (action === 'approve') {
        await api.approveKyc(userId, 'Approved during admin review.');
      } else if (action === 'reject') {
        await api.rejectKyc(userId, 'Rejected during admin review.');
      } else if (action === 'ban') {
        await api.banUser(userId, 'Banned during admin review.');
      } else if (action === 'unban') {
        await api.unbanUser(userId);
      } else if (action === 'demote') {
        await api.demoteUser(userId, 'Demoted during admin review.');
      }
      setMessage(`User ${userId} updated.`);
      setUsers(await api.listAuthUsers());
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyKey('');
    }
  }

  if (loading) {
    return <LoadingState label="Loading admin console..." />;
  }

  return (
    <PageShell active="admin">
    <section className="page">
      <article className="card card--hero">
        <div className="section-head">
          <div>
            <p className="eyebrow">Admin Console</p>
            <h1>Voucher management and order monitoring</h1>
          </div>
          <div className="button-row">
            <span className="pill pill--accent">{orders.length} orders</span>
            <button className="button button--ghost" onClick={handleLogout} type="button">
              Logout
            </button>
          </div>
        </div>
        <div className="form-stack">
          <label className="field">
            <span>Voucher admin token</span>
            <input
              className="input"
              autoComplete="off"
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="Paste a local or deployment admin token manually"
            />
          </label>
          <button className="button button--secondary" onClick={loadAdminData} type="button">
            Refresh admin data
          </button>
        </div>
      </article>

      {message && <div className="notice notice--success">{message}</div>}
      {error && <div className="notice notice--danger">{error}</div>}

      <article className="card" data-testid="admin-dashboard">
        <div className="section-head">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h2>Admin overview</h2>
          </div>
          <span className="pill pill--accent">{activeOrders.length} active orders</span>
        </div>
        <div className="grid-two">
          <div className="summary-row">
            <span>Total orders</span>
            <strong>{orders.length}</strong>
          </div>
          <div className="summary-row">
            <span>Pending top-ups</span>
            <strong>{pendingTopUps.length}</strong>
          </div>
          <div className="summary-row">
            <span>Pending KYC</span>
            <strong>{pendingKycUsers.length}</strong>
          </div>
          <div className="summary-row">
            <span>Active vouchers</span>
            <strong>{activeVouchers.length}</strong>
          </div>
          <div className="summary-row">
            <span>Low stock products</span>
            <strong>{lowStockProducts.length}</strong>
          </div>
          <div className="summary-row">
            <span>Completed revenue</span>
            <strong>{formatCurrency(completedRevenue)}</strong>
          </div>
        </div>
      </article>

      <div className="grid-two">
        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Voucher Form</p>
              <h2>{editingVoucherId ? 'Edit voucher' : 'Create voucher'}</h2>
            </div>
            {editingVoucherId && (
              <button
                className="button button--ghost"
                onClick={() => {
                  setEditingVoucherId(null);
                  setVoucherForm({
                    ...EMPTY_VOUCHER_FORM,
                    startAt: toLocalDateTimeInput(-1),
                    endAt: toLocalDateTimeInput(7),
                  });
                }}
                type="button"
              >
                Reset
              </button>
            )}
          </div>

          <form className="form-stack" onSubmit={handleVoucherSubmit}>
            <div className="grid-two">
              <label className="field">
                <span>Code</span>
                <input
                  className="input"
                  value={voucherForm.code}
                  onChange={(event) => setVoucherForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                  required
                />
              </label>
              <label className="field">
                <span>Discount type</span>
                <select
                  className="input"
                  value={voucherForm.discountType}
                  onChange={(event) => setVoucherForm((current) => ({ ...current, discountType: event.target.value }))}
                >
                  <option value="FIXED">FIXED</option>
                  <option value="PERCENT">PERCENT</option>
                </select>
              </label>
            </div>

            <div className="grid-two">
              <label className="field">
                <span>Discount value</span>
                <input
                  className="input"
                  min={1}
                  type="number"
                  value={voucherForm.discountValue}
                  onChange={(event) => setVoucherForm((current) => ({ ...current, discountValue: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Minimum spend</span>
                <input
                  className="input"
                  min={0}
                  type="number"
                  value={voucherForm.minSpend}
                  onChange={(event) => setVoucherForm((current) => ({ ...current, minSpend: event.target.value }))}
                />
              </label>
            </div>

            <div className="grid-two">
              <label className="field">
                <span>Quota total</span>
                <input
                  className="input"
                  min={1}
                  type="number"
                  value={voucherForm.quotaTotal}
                  onChange={(event) => setVoucherForm((current) => ({ ...current, quotaTotal: event.target.value }))}
                  required
                />
              </label>
              <label className="field">
                <span>Start at</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={voucherForm.startAt}
                  onChange={(event) => setVoucherForm((current) => ({ ...current, startAt: event.target.value }))}
                  required
                />
              </label>
            </div>

            <label className="field">
              <span>End at</span>
              <input
                className="input"
                type="datetime-local"
                value={voucherForm.endAt}
                onChange={(event) => setVoucherForm((current) => ({ ...current, endAt: event.target.value }))}
                required
              />
            </label>

            <button className="button button--block" disabled={busyKey === 'voucher-form'} type="submit">
              {editingVoucherId ? 'Update voucher' : 'Create voucher'}
            </button>
          </form>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Voucher Status</p>
              <h2>Current inventory</h2>
            </div>
          </div>
          <div className="summary-list">
            <div className="summary-row">
              <span>Active</span>
              <strong>{activeVouchers.length}</strong>
            </div>
            <div className="summary-row">
              <span>Expired</span>
              <strong>{expiredVouchers.length}</strong>
            </div>
            <div className="summary-row">
              <span>Disabled</span>
              <strong>{disabledVouchers.length}</strong>
            </div>
          </div>
          <div className="order-list">
            {vouchers.map((voucher) => (
              <div className="service-panel" key={voucher.id}>
                <div className="service-panel__top">
                  <div>
                    <strong>{voucher.code}</strong>
                    <p className="muted">
                      {voucher.discountType} {voucher.discountValue} | quota {voucher.quotaRemaining}/{voucher.quotaTotal}
                    </p>
                  </div>
                  <span className={`status-pill status-pill--${slugStatus(voucher.status)}`}>{voucher.status}</span>
                </div>
                <p className="muted">
                  Window {formatDate(voucher.startAt)} - {formatDate(voucher.endAt)}
                </p>
                <div className="button-row">
                  <button className="button button--secondary" onClick={() => startEditVoucher(voucher)} type="button">
                    Edit
                  </button>
                  {voucher.status !== 'EXPIRED' && voucher.status !== 'INACTIVE' && (
                    <button
                      className="button button--ghost"
                      disabled={busyKey === `voucher-${voucher.id}`}
                      onClick={() => handleDisableVoucher(voucher.id)}
                      type="button"
                    >
                      Disable
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="grid-two">
        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Product Monitoring</p>
              <h2>System-wide catalog</h2>
            </div>
            <span className="pill pill--accent">{lowStockProducts.length} low stock</span>
          </div>
          <div className="order-list">
            {products.map((product) => (
              <div className="service-panel" key={product.id}>
                <div className="service-panel__top">
                  <div>
                    <strong>{product.name}</strong>
                    <p className="muted">
                      Jastiper {product.jastiperId} | {product.originLocation} | stock {product.stock}
                    </p>
                  </div>
                  <strong>{formatCurrency(product.price)}</strong>
                </div>
                <p className="muted">
                  Window {formatDate(product.purchaseDate)} - {formatDate(product.returnDate)}
                </p>
                <div className="button-row">
                  <button className="button button--secondary" onClick={() => startEditProduct(product)} type="button">
                    Edit
                  </button>
                  <button
                    className="button button--ghost"
                    disabled={busyKey === `product-${product.id}`}
                    onClick={() => handleDeleteProduct(product.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Product Controls</p>
              <h2>{editingProductId ? 'Edit selected product' : 'Select a product'}</h2>
            </div>
            {editingProductId && (
              <button className="button button--ghost" onClick={resetProductForm} type="button">
                Reset
              </button>
            )}
          </div>
          <form className="form-stack" onSubmit={handleProductSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                disabled={!editingProductId}
                required
                value={productForm.name}
                onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                className="input min-h-24"
                disabled={!editingProductId}
                required
                value={productForm.description}
                onChange={(event) => setProductForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <div className="grid-two">
              <label className="field">
                <span>Price</span>
                <input
                  className="input"
                  disabled={!editingProductId}
                  min={1}
                  required
                  type="number"
                  value={productForm.price}
                  onChange={(event) => setProductForm((current) => ({ ...current, price: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Stock</span>
                <input
                  className="input"
                  disabled={!editingProductId}
                  min={0}
                  required
                  type="number"
                  value={productForm.stock}
                  onChange={(event) => setProductForm((current) => ({ ...current, stock: event.target.value }))}
                />
              </label>
            </div>
            <label className="field">
              <span>Origin Location</span>
              <input
                className="input"
                disabled={!editingProductId}
                required
                value={productForm.originLocation}
                onChange={(event) => setProductForm((current) => ({ ...current, originLocation: event.target.value }))}
              />
            </label>
            <div className="grid-two">
              <label className="field">
                <span>Purchase Date</span>
                <input
                  className="input"
                  disabled={!editingProductId}
                  required
                  type="date"
                  value={productForm.purchaseDate}
                  onChange={(event) => setProductForm((current) => ({ ...current, purchaseDate: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Return Date</span>
                <input
                  className="input"
                  disabled={!editingProductId}
                  required
                  type="date"
                  value={productForm.returnDate}
                  onChange={(event) => setProductForm((current) => ({ ...current, returnDate: event.target.value }))}
                />
              </label>
            </div>
            <button className="button button--block" disabled={!editingProductId || busyKey === 'product-form'} type="submit">
              Update product
            </button>
          </form>
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Order Monitoring</p>
            <h2>System-wide orders</h2>
          </div>
        </div>
        <div className="order-list">
          {orders.map((order) => {
            const nextStatuses = allowedNextStatuses(order.status);
            return (
              <article className="order-card" key={order.id}>
                <div className="order-card__top">
                  <div>
                    <p className="eyebrow">Order</p>
                    <h2>{order.id}</h2>
                  </div>
                  <span className={`status-pill status-pill--${slugStatus(order.status)}`}>{statusLabel(order)}</span>
                </div>
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Buyer</span>
                    <strong>{order.buyerId}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Jastiper</span>
                    <strong>{order.jastiperId ?? '-'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Total</span>
                    <strong>{formatCurrency(order.totalPaid)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Updated</span>
                    <strong>{formatDate(order.updatedAt || order.createdAt)}</strong>
                  </div>
                </div>
                <div className="button-row">
                  <Link className="button button--secondary" to={`/orders/${order.id}`}>
                    Open detail
                  </Link>
                  {nextStatuses.map((nextStatus) => (
                    <button
                      className="button"
                      disabled={busyKey === `order-${order.id}`}
                      key={nextStatus}
                      onClick={() => handleStatusChange(order.id, nextStatus)}
                      type="button"
                    >
                      Mark {statusLabel(nextStatus)}
                    </button>
                  ))}
                  {canCancelOrder(order.status) && (
                    <button
                      className="button button--ghost"
                      disabled={busyKey === `order-${order.id}`}
                      onClick={() => handleCancelOrder(order.id)}
                      type="button"
                    >
                      Cancel and refund
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </article>

      <article className="card" data-testid="wallet-topup-approval">
        <div className="section-head">
          <div>
            <p className="eyebrow">Wallet Verification</p>
            <h2>Top-up approval queue</h2>
          </div>
          <span className="pill pill--accent">
            {topUpRequests.filter((request) => request.status === 'PENDING').length} pending
          </span>
        </div>
        {topUpRequests.length === 0 ? (
          <p className="muted">No wallet top-up requests have been submitted yet.</p>
        ) : (
          <div className="order-list">
            {topUpRequests.map((request) => (
              <article className="service-panel" key={request.id}>
                <div className="service-panel__top">
                  <div>
                    <strong>Top-up #{request.id}</strong>
                    <p className="muted">
                      User {request.userId} | {formatDate(request.createdAt || request.updatedAt)}
                    </p>
                  </div>
                  <span className={`status-pill status-pill--${slugStatus(request.status)}`}>{request.status}</span>
                </div>
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Amount</span>
                    <strong>{formatCurrency(request.amount)}</strong>
                  </div>
                </div>
                {request.status === 'PENDING' && (
                  <div className="button-row">
                    <button
                      className="button button--secondary"
                      disabled={busyKey.startsWith(`topup-${request.id}`)}
                      onClick={() => handleTopUpAction(request.id, 'approve')}
                      type="button"
                    >
                      Approve
                    </button>
                    <button
                      className="button button--ghost"
                      disabled={busyKey.startsWith(`topup-${request.id}`)}
                      onClick={() => handleTopUpAction(request.id, 'reject')}
                      type="button"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="card" data-testid="voucher-redemption-audit">
        <div className="section-head">
          <div>
            <p className="eyebrow">Voucher Audit</p>
            <h2>Redemption history</h2>
          </div>
          <span className="pill pill--accent">{redemptions.length} claims</span>
        </div>
        {!adminToken ? (
          <p className="muted">Enter the voucher admin token to load redemption history.</p>
        ) : redemptions.length === 0 ? (
          <p className="muted">No voucher redemptions have been recorded yet.</p>
        ) : (
          <div className="order-list">
            {redemptions.map((redemption) => (
              <article className="service-panel" key={redemption.id || `${redemption.code}-${redemption.orderId}`}>
                <div className="service-panel__top">
                  <div>
                    <strong>{redemption.code}</strong>
                    <p className="muted">Order {redemption.orderId}</p>
                  </div>
                  <span className="pill">Buyer {redemption.buyerId ?? '-'}</span>
                </div>
                <div className="summary-list">
                  <div className="summary-row">
                    <span>Order amount</span>
                    <strong>{formatCurrency(redemption.orderAmount)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Discount</span>
                    <strong>{formatCurrency(redemption.discountApplied)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Claimed</span>
                    <strong>{formatDate(redemption.claimedAt)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </article>

      <article className="card" data-testid="admin-user-monitoring">
        <div className="section-head">
          <div>
            <p className="eyebrow">User Monitoring</p>
            <h2>KYC, ban, and role control</h2>
          </div>
          <span className="pill pill--accent">{users.length} users</span>
        </div>
        <div className="order-list">
          {users.map((account) => (
            <article className="service-panel" key={account.id}>
              <div className="service-panel__top">
                <div>
                  <strong>{account.fullName || account.username}</strong>
                  <p className="muted">
                    @{account.username} | {account.email}
                  </p>
                </div>
                <span className={`status-pill status-pill--${slugStatus(account.kycStatus || 'NOT_SUBMITTED')}`}>
                  {account.role} / {account.kycStatus || 'NOT_SUBMITTED'}
                </span>
              </div>
              {account.banned && <p className="notice notice--danger">User is banned.</p>}
              <div className="button-row">
                <button className="button button--secondary" disabled={busyKey.startsWith(`user-${account.id}`)} onClick={() => handleUserAction(account.id, 'approve')} type="button">
                  Approve KYC
                </button>
                <button className="button button--ghost" disabled={busyKey.startsWith(`user-${account.id}`)} onClick={() => handleUserAction(account.id, 'reject')} type="button">
                  Reject KYC
                </button>
                <button className="button button--ghost" disabled={busyKey.startsWith(`user-${account.id}`)} onClick={() => handleUserAction(account.id, 'demote')} type="button">
                  Demote
                </button>
                <button
                  className="button button--ghost"
                  disabled={busyKey.startsWith(`user-${account.id}`)}
                  onClick={() => handleUserAction(account.id, account.banned ? 'unban' : 'ban')}
                  type="button"
                >
                  {account.banned ? 'Unban' : 'Ban'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
    </PageShell>
  );
}
