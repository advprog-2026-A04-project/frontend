import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';
import { canCancelOrder, canRateOrder, formatCurrency, formatDate, statusLabel } from '../lib/format';

const TIMELINE = ['PAID', 'PURCHASED', 'SHIPPED', 'COMPLETED'];

export default function OrderResultPage() {
  const location = useLocation();
  const params = useParams();
  const { user } = useSession();
  const queryOrderId = new URLSearchParams(location.search).get('orderId');
  const orderId = params.orderId || queryOrderId;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cancelling, setCancelling] = useState(false);
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
    if (orderId) {
      loadOrder();
    } else {
      setLoading(false);
      setError('Order id is missing.');
    }
  }, [loadOrder, orderId]);

  const completedSteps = useMemo(() => {
    const currentIndex = TIMELINE.indexOf(order?.status);
    if (currentIndex < 0) {
      return 0;
    }
    return currentIndex + 1;
  }, [order]);

  const canCancel = user && canCancelOrder(order?.status) &&
    (user.role === 'JASTIPER' || user.role === 'ADMIN');

  async function handleCancel() {
    if (!window.confirm('Cancel this order? Wallet will be refunded automatically if the order was paid.')) {
      return;
    }

    setCancelling(true);
    setError('');
    setMessage('');

    try {
      const updated = await api.cancelOrder(orderId);
      setOrder(updated);
      setMessage('Order has been cancelled. Wallet refund has been processed.');
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setCancelling(false);
    }
  }

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
      setMessage('Rating submitted successfully.');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmittingRating(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading order detail..." />;
  }

  if (error && !order) {
    return (
      <PageShell active="orders">
        <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-200">{error || 'Order not found.'}</div>
      </PageShell>
    );
  }

  return (
    <PageShell active="orders">
      <section className="space-y-8">
        {location.state?.flash && (
          <div
            className={`rounded-[22px] border p-4 text-sm ${
              location.state.success
                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200'
                : 'border-rose-400/20 bg-rose-500/10 text-rose-200'
            }`}
          >
            {location.state.flash}
          </div>
        )}

        {message && <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{message}</div>}
        {error && <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

        <article className="card--hero overflow-hidden rounded-[32px] border border-white/10 bg-[#13112A]/80 p-8 shadow-[0_0_36px_rgba(0,240,255,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                  order.status === 'COMPLETED'
                    ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                    : order.status === 'CANCELLED'
                      ? 'border border-rose-400/30 bg-rose-500/10 text-rose-300'
                      : order.status === 'FAILED'
                        ? 'border border-orange-400/30 bg-orange-500/10 text-orange-300'
                        : 'border border-cyan/20 bg-cyan/10 text-cyan'
                }`}>
                  {statusLabel(order)}
                </span>
                <span className="text-sm text-slate-400">Order #{order.id}</span>
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-white">
                  {location.pathname === '/success' ? 'Order Created' : 'Order Detail'}
                </h1>
                <p className="mt-3 max-w-2xl text-base text-slate-300">
                  Status, totals, refund visibility, and buyer rating are all driven by the live Order service.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-cyan/20 bg-cyan/10 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">Total Paid</p>
              <p className="mt-2 text-3xl font-black text-white">{formatCurrency(order.totalPaid)}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Created</p>
              <p className="mt-2 text-sm font-bold text-white">{formatDate(order.createdAt)}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Last Updated</p>
              <p className="mt-2 text-sm font-bold text-white">{formatDate(order.updatedAt || order.createdAt)}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Voucher</p>
              <p className="mt-2 text-sm font-bold text-white">{order.voucherCode || '-'}</p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Shipping</p>
              <p className="mt-2 text-sm font-bold text-white">{order.shippingAddress}</p>
            </div>
          </div>

          {order.status !== 'CANCELLED' && order.status !== 'FAILED' && (
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {TIMELINE.map((step, index) => (
                  <span key={step} className={index < completedSteps ? 'text-cyan' : ''}>
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
              Refund has been processed and returned to the buyer&apos;s wallet.
            </div>
          )}

          {order.failureReason && (
            <div className="mt-6 rounded-[20px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">
              {order.failureReason}
            </div>
          )}
        </article>

        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Items</p>
                <h2 className="text-2xl font-black text-white">Order lines</h2>
              </div>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-[#13112A]/75 p-5 sm:flex-row sm:items-center sm:justify-between"
                  key={`${order.id}-${item.productId}`}
                >
                  <div>
                    <h3 className="text-lg font-black text-white">{item.productNameSnapshot}</h3>
                    <p className="mt-2 text-sm text-slate-400">Qty {item.qty} | Unit price {formatCurrency(item.unitPriceSnapshot)}</p>
                  </div>
                  <strong className="text-xl font-black text-cyan">{formatCurrency(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Totals</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Subtotal</span>
                  <strong className="text-lg text-white">{formatCurrency(order.subtotal)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">Discount</span>
                  <strong className="text-lg text-emerald-300">{formatCurrency(order.discountTotal)}</strong>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-base font-bold text-white">Total paid</span>
                    <strong className="text-3xl font-black text-cyan">{formatCurrency(order.totalPaid)}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-cyan/30 hover:text-cyan"
                  to="/orders"
                >
                  <span className="material-symbols-outlined text-base">receipt_long</span>
                  Back to Orders
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-cyan/30 hover:text-cyan"
                  to="/wallet"
                >
                  <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                  Open Wallet
                </Link>

                {canCancel && (
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-rose-300 transition-colors hover:border-rose-400/50 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={cancelling}
                    onClick={handleCancel}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-base">cancel</span>
                    {cancelling ? 'Cancelling...' : 'Cancel Order'}
                  </button>
                )}
              </div>
            </article>

            {order.rating && (
              <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Rating</p>
                <h2 className="mt-2 text-2xl font-black text-white">Submitted review</h2>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-400">Product rating</span>
                    <strong className="text-lg text-white">{order.rating.productRating}/5</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-400">Jastiper rating</span>
                    <strong className="text-lg text-white">{order.rating.jastiperRating}/5</strong>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-[#13112A]/75 p-4 text-sm text-slate-300">
                    {order.rating.comment || 'No comment.'}
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>

        {canRateOrder(order, user?.role) && (
          <article className="rounded-[30px] border border-white/10 bg-white/5 p-8 backdrop-blur-md">
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Rate order</p>
              <h2 className="mt-2 text-2xl font-black text-white">Submit buyer review</h2>
            </div>

            <form className="space-y-5" onSubmit={handleRatingSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-white">Product rating (1–5)</span>
                  <input
                    className="rounded-[20px] border border-white/10 bg-[#13112A]/75 px-5 py-4 text-white outline-none"
                    max={5}
                    min={1}
                    type="number"
                    value={ratingForm.productRating}
                    onChange={(event) =>
                      setRatingForm((current) => ({ ...current, productRating: event.target.value }))
                    }
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-white">Jastiper rating (1–5)</span>
                  <input
                    className="rounded-[20px] border border-white/10 bg-[#13112A]/75 px-5 py-4 text-white outline-none"
                    max={5}
                    min={1}
                    type="number"
                    value={ratingForm.jastiperRating}
                    onChange={(event) =>
                      setRatingForm((current) => ({ ...current, jastiperRating: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-bold text-white">Comment (optional)</span>
                <textarea
                  className="min-h-28 rounded-[20px] border border-white/10 bg-[#13112A]/75 px-5 py-4 text-white outline-none"
                  value={ratingForm.comment}
                  onChange={(event) => setRatingForm((current) => ({ ...current, comment: event.target.value }))}
                />
              </label>

              <button
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_0_22px_rgba(217,0,255,0.32)] disabled:cursor-not-allowed disabled:opacity-50"
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