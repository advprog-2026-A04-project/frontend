import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';
import { allowedNextStatuses, canCancelOrder, formatCurrency, formatDate, slugStatus, statusLabel } from '../lib/format';

export default function JastiperOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyOrderId, setBusyOrderId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError('');

    try {
      const data = await api.listJastiperOrders();
      setOrders(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId, nextStatus) {
    setBusyOrderId(orderId);
    setError('');
    setMessage('');

    try {
      await api.updateOrderStatus(orderId, nextStatus);
      setMessage(`Order ${orderId} moved to ${statusLabel(nextStatus)}.`);
      await loadOrders();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyOrderId(null);
    }
  }

  async function handleCancel(orderId) {
    setBusyOrderId(orderId);
    setError('');
    setMessage('');

    try {
      await api.cancelOrder(orderId);
      setMessage(`Order ${orderId} was cancelled and refunded.`);
      await loadOrders();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyOrderId(null);
    }
  }

  if (loading) {
    return <LoadingState label="Loading jastiper queue..." />;
  }

  return (
    <section className="page">
      <article className="card card--hero">
        <div className="section-head">
          <div>
            <p className="eyebrow">Jastiper Queue</p>
            <h1>Process active orders</h1>
          </div>
          <span className="pill pill--accent">{orders.length} orders</span>
        </div>
        <p className="lead">
          Paid orders move through Purchased, Shipped, and Completed. Cancellation is limited to the early stages and triggers an automatic wallet refund.
        </p>
      </article>

      {message && <div className="notice notice--success">{message}</div>}
      {error && <div className="notice notice--danger">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state">
          <h2>No assigned orders.</h2>
          <p>Orders will appear here when the logged-in jastiper owns the checked-out products.</p>
        </div>
      ) : (
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
                      key={nextStatus}
                      className="button"
                      disabled={busyOrderId === order.id}
                      onClick={() => handleStatusChange(order.id, nextStatus)}
                      type="button"
                    >
                      Mark {statusLabel(nextStatus)}
                    </button>
                  ))}
                  {canCancelOrder(order.status) && (
                    <button
                      className="button button--ghost"
                      disabled={busyOrderId === order.id}
                      onClick={() => handleCancel(order.id)}
                      type="button"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
