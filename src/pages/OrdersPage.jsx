import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';
import { formatCurrency, formatDate, slugStatus, statusLabel } from '../lib/format';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    setError('');

    try {
      const [allOrders, currentActiveOrders] = await Promise.all([
        api.listOrders(),
        api.listActiveOrders(),
      ]);
      setOrders(allOrders);
      setActiveOrders(currentActiveOrders);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading orders..." />;
  }

  return (
    <section className="page">
      <div className="grid-two">
        <article className="card card--hero">
          <div className="section-head">
            <div>
              <p className="eyebrow">Orders</p>
              <h1>My order history</h1>
            </div>
            <span className="pill pill--accent">{orders.length} total</span>
          </div>
          <p className="lead lead--compact">
            Buyer history shows the full lifecycle, while active orders stay visible in a separate queue for status tracking.
          </p>
        </article>

        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Active</p>
              <h2>Current order status</h2>
            </div>
          </div>

          {activeOrders.length === 0 ? (
            <div className="empty-state">
              <h2>No active orders.</h2>
              <p>Paid, Purchased, and Shipped orders will appear here.</p>
            </div>
          ) : (
            <div className="order-list">
              {activeOrders.map((order) => (
                <article className="order-card" key={`active-${order.id}`}>
                  <div className="order-card__top">
                    <div>
                      <p className="eyebrow">Order</p>
                      <h2>{order.id}</h2>
                    </div>
                    <span className={`status-pill status-pill--${slugStatus(order.status)}`}>{statusLabel(order)}</span>
                  </div>

                  <div className="summary-list">
                    <div className="summary-row">
                      <span>Total</span>
                      <strong>{formatCurrency(order.totalPaid)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Updated</span>
                      <strong>{formatDate(order.updatedAt || order.createdAt)}</strong>
                    </div>
                  </div>

                  <Link className="button button--secondary button--block" to={`/orders/${order.id}`}>
                    Open detail
                  </Link>
                </article>
              ))}
            </div>
          )}
        </article>
      </div>

      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">History</p>
            <h2>All orders</h2>
          </div>
        </div>

        {error && <div className="notice notice--danger">{error}</div>}

        {!error && orders.length === 0 && (
          <div className="empty-state">
            <h2>No orders yet.</h2>
            <p>Your first checkout will appear here after payment is recorded.</p>
          </div>
        )}

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
                  <span>Total</span>
                  <strong>{formatCurrency(order.totalPaid)}</strong>
                </div>
                <div className="summary-row">
                  <span>Created</span>
                  <strong>{formatDate(order.createdAt)}</strong>
                </div>
              </div>

              <Link className="button button--secondary button--block" to={`/orders/${order.id}`}>
                Open detail
              </Link>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
