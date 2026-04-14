import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { api } from '../lib/api';
import { formatCurrency, formatDate, slugStatus, statusLabel } from '../lib/format';

export default function OrderResultPage() {
  const location = useLocation();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError('');

      try {
        const data = await api.getOrder(orderId);
        if (!cancelled) {
          setOrder(data.order);
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

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return <LoadingState label="Loading order result…" />;
  }

  if (error || !order) {
    return <div className="notice notice--danger">{error || 'Order not found.'}</div>;
  }

  return (
    <section className="page">
      {location.state?.flash && (
        <div className={`notice ${location.state.success ? 'notice--success' : 'notice--danger'}`}>
          {location.state.flash}
        </div>
      )}

      <article className="card card--hero">
        <div className="section-head">
          <div>
            <p className="eyebrow">Order result</p>
            <h1>{order.id}</h1>
          </div>
          <span className={`status-pill status-pill--${slugStatus(order.status)}`}>{statusLabel(order)}</span>
        </div>

        <div className="summary-list">
          <div className="summary-row">
            <span>Payment status</span>
            <strong>{order.paymentStatus}</strong>
          </div>
          <div className="summary-row">
            <span>Created at</span>
            <strong>{formatDate(order.createdAt)}</strong>
          </div>
          <div className="summary-row">
            <span>Shipping address</span>
            <strong>{order.shippingAddress}</strong>
          </div>
          <div className="summary-row">
            <span>Voucher</span>
            <strong>{order.voucherCode || '-'}</strong>
          </div>
          <div className="summary-row">
            <span>Voucher outcome</span>
            <strong>{order.voucherMessage}</strong>
          </div>
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(order.subtotal)}</strong>
          </div>
          <div className="summary-row">
            <span>Discount</span>
            <strong>{formatCurrency(order.discountTotal)}</strong>
          </div>
          <div className="summary-row summary-row--total">
            <span>Total paid</span>
            <strong>{formatCurrency(order.totalPaid)}</strong>
          </div>
        </div>

        {order.failureReason && (
          <div className="notice notice--danger">
            <strong>{order.failureReason.code}</strong>: {order.failureReason.message}
          </div>
        )}

        <div className="button-row">
          <Link className="button" to="/orders">
            Back to orders
          </Link>
          <Link className="button button--secondary" to="/wallet">
            Open wallet
          </Link>
        </div>
      </article>

      <article className="card">
        <h2>Items</h2>
        <div className="order-list">
          {order.items.map((item) => (
            <div className="service-panel" key={`${order.id}-${item.productId}`}>
              <div className="service-panel__top">
                <strong>{item.productName}</strong>
                <span className="pill">{item.quantity} pcs</span>
              </div>
              <p className="muted">
                Unit price {formatCurrency(item.unitPrice)}. Line total {formatCurrency(item.lineTotal)}.
              </p>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
