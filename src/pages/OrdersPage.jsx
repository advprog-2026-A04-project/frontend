import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';
import { formatCurrency, formatDate, slugStatus, statusLabel } from '../lib/format';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError('');

      try {
        const data = await api.listOrders();
        if (!cancelled) {
          setOrders(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading orders..." />;
  }

  return (
    <section className="page">
      <article className="card">
        <div className="section-head">
          <div>
            <p className="eyebrow">Orders</p>
            <h1>My checkout results</h1>
          </div>
        </div>

        {error && <div className="notice notice--danger">{error}</div>}

        {!error && orders.length === 0 && (
          <div className="empty-state">
            <h2>No orders yet.</h2>
            <p>The first successful checkout will show up here after payment is completed.</p>
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
                Open result
              </Link>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
