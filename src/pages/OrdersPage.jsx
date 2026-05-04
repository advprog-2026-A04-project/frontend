import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import { api } from '../lib/api';
import { formatCurrency, formatDate, slugStatus, statusLabel } from '../lib/format';

const STATUS_STEPS = ['PAID', 'PURCHASED', 'SHIPPED', 'COMPLETED'];

function progressWidth(status) {
  const index = STATUS_STEPS.indexOf(status);
  if (index < 0) {
    return '0%';
  }

  return `${((index + 1) / STATUS_STEPS.length) * 100}%`;
}

function OrderCard({ order, active = false }) {
  return (
    <article className="order-card rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-colors hover:border-cyan/30">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                order.status === 'COMPLETED'
                  ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                  : order.status === 'CANCELLED'
                    ? 'border border-rose-400/30 bg-rose-500/10 text-rose-300'
                    : 'border border-cyan/20 bg-cyan/10 text-cyan'
              }`}
            >
              {statusLabel(order)}
            </span>
            <span className="text-sm text-slate-400">Order #{order.id}</span>
            {order.voucherCode && (
              <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-fuchsia-200">
                {order.voucherCode}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              {order.items?.length ? order.items[0].productNameSnapshot : `Order ${order.id}`}
            </h2>
            <p className="text-sm text-slate-400">
              Created {formatDate(order.createdAt)} | Updated {formatDate(order.updatedAt || order.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <span>Total {formatCurrency(order.totalPaid)}</span>
            <span>{order.items?.length || 0} line item(s)</span>
            {order.refundDone && <span className="text-emerald-300">Refund recorded</span>}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <strong className="text-3xl font-black text-cyan">{formatCurrency(order.totalPaid)}</strong>
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-cyan/30 hover:text-cyan"
            to={`/orders/${order.id}`}
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            Open Detail
          </Link>
        </div>
      </div>

      {active && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {STATUS_STEPS.map((step) => (
              <span key={step} className={slugStatus(order.status) === slugStatus(step) ? 'text-cyan' : ''}>
                {statusLabel(step)}
              </span>
            ))}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-blue-500 transition-all duration-500"
              style={{ width: progressWidth(order.status) }}
            />
          </div>
        </div>
      )}
    </article>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError('');

      try {
        const [allOrders, currentActiveOrders] = await Promise.all([api.listOrders(), api.listActiveOrders()]);
        if (!cancelled) {
          setOrders(allOrders);
          setActiveOrders(currentActiveOrders);
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
    <PageShell active="orders">
      <section className="space-y-8">
        <article className="rounded-[32px] border border-white/10 bg-[#13112A]/80 p-8 shadow-[0_0_36px_rgba(0,240,255,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">My Orders</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Track your active and completed orders.</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300">
                Buyer history stays backed by the Order service. Active orders keep their lifecycle status visible
                separately from the full order history.
              </p>
            </div>
            <div className="rounded-[24px] border border-cyan/20 bg-cyan/10 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">Totals</p>
              <p className="mt-2 text-2xl font-black text-white">{orders.length} orders</p>
            </div>
          </div>
        </article>

        {error && <div className="rounded-[22px] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Active Queue</p>
            <h2 className="mt-2 text-2xl font-black text-white">Current order status</h2>
          </div>

          {activeOrders.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-12 text-center text-slate-400">
              No active orders.
            </div>
          ) : (
            <div className="space-y-5">
              {activeOrders.map((order) => (
                <OrderCard active key={`active-${order.id}`} order={order} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">History</p>
            <h2 className="mt-2 text-2xl font-black text-white">All orders</h2>
          </div>

          {!error && orders.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-12 text-center text-slate-400">
              No orders yet.
            </div>
          ) : (
            <div className="space-y-5">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </section>
      </section>
    </PageShell>
  );
}
