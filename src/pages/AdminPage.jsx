import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';
import { canCancelOrder, formatCurrency, formatDate, slugStatus, statusLabel } from '../lib/format';

const EMPTY_VOUCHER_FORM = {
  code: '',
  discountType: 'FIXED',
  discountValue: 50000,
  minSpend: 0,
  quotaTotal: 10,
  startAt: '',
  endAt: '',
};

function toLocalDateTimeInput(offsetDays = 0) {
  const value = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const pad = (number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [orders, setOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [voucherForm, setVoucherForm] = useState({
    ...EMPTY_VOUCHER_FORM,
    startAt: toLocalDateTimeInput(-1),
    endAt: toLocalDateTimeInput(7),
  });
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const orderPromise = api.listAdminOrders();
      const voucherPromise = adminToken ? api.listAdminVouchers(adminToken) : Promise.resolve([]);
      const [orderData, voucherData] = await Promise.all([orderPromise, voucherPromise]);
      setOrders(orderData);
      setVouchers(voucherData);
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

  if (loading) {
    return <LoadingState label="Loading admin console..." />;
  }

  return (
    <section className="page">
      <article className="card card--hero">
        <div className="section-head">
          <div>
            <p className="eyebrow">Admin Console</p>
            <h1>Voucher management and order monitoring</h1>
          </div>
          <span className="pill pill--accent">{orders.length} orders</span>
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

      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Order Monitoring</p>
            <h2>System-wide orders</h2>
          </div>
        </div>
        <div className="order-list">
          {orders.map((order) => (
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
          ))}
        </div>
      </article>
    </section>
  );
}
