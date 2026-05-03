import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';
import { canRateOrder, formatCurrency, formatDate, slugStatus, statusLabel } from '../lib/format';

export default function OrderResultPage() {
  const location = useLocation();
  const { orderId } = useParams();
  const { user } = useSession();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [ratingForm, setRatingForm] = useState({
    productRating: 5,
    jastiperRating: 5,
    comment: '',
  });
  const [submittingRating, setSubmittingRating] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function handleRatingSubmit(event) {
    event.preventDefault();
    setSubmittingRating(true);
    setError('');
    setMessage('');

    try {
      const updatedOrder = await api.submitOrderRating(orderId, {
        productRating: Number(ratingForm.productRating),
        jastiperRating: Number(ratingForm.jastiperRating),
        comment: ratingForm.comment,
      });
      setOrder(updatedOrder);
      setMessage('Rating submitted.');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmittingRating(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading order result..." />;
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
      {message && <div className="notice notice--success">{message}</div>}

      <article className="card card--hero">
        <div className="section-head">
          <div>
            <p className="eyebrow">Order detail</p>
            <h1>{order.id}</h1>
          </div>
          <span className={`status-pill status-pill--${slugStatus(order.status)}`}>{statusLabel(order)}</span>
        </div>

        <div className="summary-list">
          <div className="summary-row">
            <span>Status</span>
            <strong>{statusLabel(order)}</strong>
          </div>
          <div className="summary-row">
            <span>Created at</span>
            <strong>{formatDate(order.createdAt)}</strong>
          </div>
          <div className="summary-row">
            <span>Updated at</span>
            <strong>{formatDate(order.updatedAt)}</strong>
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

        {order.refundDone && (
          <div className="notice notice--success">
            Refund has already been recorded for this order.
          </div>
        )}

        {order.failureReason && <div className="notice notice--danger">{order.failureReason}</div>}

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
                <strong>{item.productNameSnapshot}</strong>
                <span className="pill">{item.qty} pcs</span>
              </div>
              <p className="muted">
                Unit price {formatCurrency(item.unitPriceSnapshot)}. Line total {formatCurrency(item.lineTotal)}.
              </p>
            </div>
          ))}
        </div>
      </article>

      {order.rating && (
        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Rating</p>
              <h2>Submitted review</h2>
            </div>
          </div>
          <div className="summary-list">
            <div className="summary-row">
              <span>Product rating</span>
              <strong>{order.rating.productRating}/5</strong>
            </div>
            <div className="summary-row">
              <span>Jastiper rating</span>
              <strong>{order.rating.jastiperRating}/5</strong>
            </div>
            <div className="summary-row">
              <span>Comment</span>
              <strong>{order.rating.comment || '-'}</strong>
            </div>
          </div>
        </article>
      )}

      {canRateOrder(order, user?.role) && (
        <article className="card">
          <div className="section-head">
            <div>
              <p className="eyebrow">Rate order</p>
              <h2>Submit buyer review</h2>
            </div>
          </div>

          <form className="form-stack" onSubmit={handleRatingSubmit}>
            <div className="grid-two">
              <label className="field">
                <span>Product rating</span>
                <input
                  className="input"
                  max={5}
                  min={1}
                  type="number"
                  value={ratingForm.productRating}
                  onChange={(event) => setRatingForm((current) => ({ ...current, productRating: event.target.value }))}
                />
              </label>
              <label className="field">
                <span>Jastiper rating</span>
                <input
                  className="input"
                  max={5}
                  min={1}
                  type="number"
                  value={ratingForm.jastiperRating}
                  onChange={(event) => setRatingForm((current) => ({ ...current, jastiperRating: event.target.value }))}
                />
              </label>
            </div>

            <label className="field">
              <span>Comment</span>
              <textarea
                className="textarea"
                value={ratingForm.comment}
                onChange={(event) => setRatingForm((current) => ({ ...current, comment: event.target.value }))}
              />
            </label>

            {error && <div className="notice notice--danger">{error}</div>}

            <button className="button button--block" disabled={submittingRating} type="submit">
              {submittingRating ? 'Submitting...' : 'Submit rating'}
            </button>
          </form>
        </article>
      )}
    </section>
  );
}
