import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';
import {
  allowedNextStatuses,
  canCancelOrder,
  canRateOrder,
  formatCurrency,
  formatDate,
  statusLabel,
} from '../lib/format';

const TIMELINE = ['PAID', 'PURCHASED', 'SHIPPED', 'COMPLETED'];

function StarRating({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={`text-2xl transition-transform hover:scale-110 disabled:cursor-default ${
            star <= value ? 'text-amber-400' : 'text-white/20'
          }`}
          disabled={disabled}
          type="button"
          onClick={() => onChange?.(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const { user } = useSession();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [ratingForm, setRatingForm] = useState({ productRating: 5, jastiperRating: 5, comment: '' });
  const [submittingRating, setSubmittingRating] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) loadOrder();
    else { setLoading(false); setError('Order id is missing.'); }
  }, [loadOrder, orderId]);

  const completedSteps = useMemo(() => {
    const idx = TIMELINE.indexOf(order?.status);
    return idx < 0 ? 0 : idx + 1;
  }, [order]);

  const isJastiper = user?.role === 'JASTIPER';
  const isAdmin = user?.role === 'ADMIN';
  const isBuyer = user?.role === 'TITIPER';

  const canCancel = order && canCancelOrder(order.status) && (isJastiper || isAdmin);
  const showRating = order && canRateOrder(order, user?.role);
  const nextStatuses = order ? allowedNextStatuses(order.status) : [];
  const showStatusActions = (isJastiper || isAdmin) && nextStatuses.length > 0;
  const showConfirmComplete = isBuyer && order?.status === 'SHIPPED';

  async function handleStatusChange(nextStatus) {
    setBusy(true); setError(''); setMessage('');
    try {
      const updated = await api.updateOrderStatus(orderId, nextStatus);
      setOrder(updated);
      setMessage(`Order moved to ${statusLabel(nextStatus)}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this order? If already paid, the wallet will be refunded automatically.')) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const updated = await api.cancelOrder(orderId);
      setOrder(updated);
      setMessage('Order cancelled. Refund has been processed.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRatingSubmit(event) {
    event.preventDefault();
    setSubmittingRating(true); setError(''); setMessage('');
    try {
      const updated = await api.submitOrderRating(orderId, {
        productRating: Number(ratingForm.productRating),
        jastiperRating: Number(ratingForm.jastiperRating),
        comment: ratingForm.comment,
      });
      setOrder(updated);
      setMessage('Rating submitted successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingRating(false);
    }
  }

  if (loading) return <LoadingState label="Loading order detail..." />;

  if (error && !order) {
    return (
      <PageShell active="orders">
        <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-200">{error}</div>
      </PageShell>
    );
  }

  const statusColor =
    order.status === 'COMPLETED'
      ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
      : order.status === 'CANCELLED'
        ? 'border-rose-400/30 bg-rose-500/10 text-rose-300'
        : order.status === 'FAILED'
          ? 'border-orange-400/30 bg-orange-500/10 text-orange-300'
          : 'border-cyan/20 bg-cyan/10 text-cyan';

  return (
    <PageShell active="orders">
      <section className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Order Detail</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">
              #{order.id}
            </h1>
          </div>
          <Link
            className="text-sm font-bold uppercase tracking-[0.18em] text-cyan hover:underline"
            to="/orders"
          >
            ← Back to Orders
          </Link>
        </div>

        {message && (
          <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Hero card */}
        <article className="overflow-hidden rounded-[32px] border border-white/10 bg-[#13112A]/80 p-8 shadow-[0_0_36px_rgba(0,240,255,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${statusColor}`}>
                  {statusLabel(order)}
                </span>
                <span className="text-sm text-slate-400">Order #{order.id}</span>
                {order.voucherCode && (
                  <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-200">
                    {order.voucherCode}
                  </span>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">
                  {order.items?.[0]?.productNameSnapshot ?? 'Order Detail'}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Created {formatDate(order.createdAt)} · Updated {formatDate(order.updatedAt || order.createdAt)}
                </p>
              </div>
            </div>
            <div className="rounded-[24px] border border-cyan/20 bg-cyan/10 px-5 py-4 text-right">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">Total Paid</p>
              <p className="mt-1 text-3xl font-black text-white">{formatCurrency(order.totalPaid)}</p>
            </div>
          </div>

          {/* Timeline progress */}
          {order.status !== 'CANCELLED' && order.status !== 'FAILED' && (
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {TIMELINE.map((step, i) => (
                  <span key={step} className={i < completedSteps ? 'text-cyan' : ''}>
                    {statusLabel(step)}
                  </span>
                ))}
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan to-blue-500 transition-all duration-500"
                  style={{ width: `${(completedSteps / TIMELINE.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {order.refundDone && (
            <div className="mt-6 rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <span className="material-symbols-outlined mr-2 align-middle text-base">check_circle</span>
              Refund has been processed to the buyer's wallet.
            </div>
          )}
          {order.failureReason && (
            <div className="mt-6 rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
              {order.failureReason}
            </div>
          )}
        </article>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          {/* Items */}
          <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Items</p>
            <h2 className="mt-1 text-2xl font-black text-white">Order lines</h2>
            <div className="mt-6 space-y-4">
              {order.items?.map((item) => (
                <div
                  key={`${order.id}-${item.productId}`}
                  className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-[#13112A]/75 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="text-lg font-black text-white">{item.productNameSnapshot}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Qty {item.qty} · Unit {formatCurrency(item.unitPriceSnapshot)}
                    </p>
                  </div>
                  <strong className="text-xl font-black text-cyan">{formatCurrency(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          </article>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Totals */}
            <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Summary</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Subtotal</span>
                  <strong className="text-white">{formatCurrency(order.subtotal)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Discount</span>
                  <strong className="text-emerald-300">{formatCurrency(order.discountTotal)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Shipping to</span>
                  <strong className="max-w-[180px] text-right text-sm text-white">{order.shippingAddress}</strong>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-white">Total paid</span>
                    <strong className="text-3xl font-black text-cyan">{formatCurrency(order.totalPaid)}</strong>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3">
                {/* Jastiper / Admin: advance status */}
                {showStatusActions && nextStatuses.map((ns) => (
                  <button
                    key={ns}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-blue-500 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#0B0914] disabled:opacity-50"
                    disabled={busy}
                    type="button"
                    onClick={() => handleStatusChange(ns)}
                  >
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                    Mark {statusLabel(ns)}
                  </button>
                ))}

                {/* Titiper: confirm completion */}
                {showConfirmComplete && (
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white disabled:opacity-50"
                    disabled={busy}
                    type="button"
                    onClick={() => handleStatusChange('COMPLETED')}
                  >
                    <span className="material-symbols-outlined text-base">verified</span>
                    Confirm Received
                  </button>
                )}

                {/* Cancel */}
                {canCancel && (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                    disabled={busy}
                    type="button"
                    onClick={handleCancel}
                  >
                    <span className="material-symbols-outlined text-base">cancel</span>
                    {busy ? 'Processing...' : 'Cancel Order'}
                  </button>
                )}

                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white hover:border-cyan/30 hover:text-cyan"
                  to="/orders"
                >
                  <span className="material-symbols-outlined text-base">receipt_long</span>
                  All Orders
                </Link>
              </div>
            </article>

            {/* Existing rating */}
            {order.rating && (
              <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Review</p>
                <h2 className="mt-1 text-2xl font-black text-white">Buyer rating</h2>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-400">Product</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-lg ${s <= order.rating.productRating ? 'text-amber-400' : 'text-white/20'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-400">Jastiper</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-lg ${s <= order.rating.jastiperRating ? 'text-amber-400' : 'text-white/20'}`}>★</span>
                      ))}
                    </div>
                  </div>
                  {order.rating.comment && (
                    <p className="rounded-[18px] border border-white/10 bg-[#13112A]/75 p-4 text-sm text-slate-300">
                      {order.rating.comment}
                    </p>
                  )}
                </div>
              </article>
            )}
          </div>
        </div>

        {/* Rating form */}
        {showRating && (
          <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Rate this order</p>
            <h2 className="mt-1 text-2xl font-black text-white">Submit your review</h2>

            <form className="mt-6 space-y-6" onSubmit={handleRatingSubmit}>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-3 text-sm font-bold text-white">Product quality</p>
                  <StarRating
                    disabled={submittingRating}
                    value={ratingForm.productRating}
                    onChange={(v) => setRatingForm((p) => ({ ...p, productRating: v }))}
                  />
                </div>
                <div>
                  <p className="mb-3 text-sm font-bold text-white">Jastiper service</p>
                  <StarRating
                    disabled={submittingRating}
                    value={ratingForm.jastiperRating}
                    onChange={(v) => setRatingForm((p) => ({ ...p, jastiperRating: v }))}
                  />
                </div>
              </div>

              <div>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-white">Comment (optional)</span>
                  <textarea
                    className="min-h-28 rounded-[20px] border border-white/10 bg-[#13112A]/75 px-5 py-4 text-white outline-none placeholder:text-slate-500"
                    disabled={submittingRating}
                    placeholder="Tell us about your experience..."
                    value={ratingForm.comment}
                    onChange={(e) => setRatingForm((p) => ({ ...p, comment: e.target.value }))}
                  />
                </label>
              </div>

              <button
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_22px_rgba(217,0,255,0.32)] disabled:opacity-50"
                disabled={submittingRating}
                type="submit"
              >
                <span className="material-symbols-outlined text-base">reviews</span>
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </form>
          </article>
        )}
      </section>
    </PageShell>
  );
}