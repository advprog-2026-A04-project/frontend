import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PageShell from '../components/PageShell';
import ProductCard from '../components/ProductCard';
import { useSession } from '../context/SessionContext';
import { api } from '../lib/api';

export default function HomePage() {
  const { isAuthenticated, user } = useSession();
  const [health, setHealth] = useState(null);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeState() {
      try {
        const [healthData, productData] = await Promise.all([api.getHealth(), api.listProducts('')]);
        if (!cancelled) {
          setHealth(healthData);
          setFeaturedProducts(productData.slice(0, 4));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadHomeState();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageShell active="home">
      <section className="space-y-8">
        <article className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#13112A]/80 p-8 shadow-[0_0_40px_rgba(0,240,255,0.08)] sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,240,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(217,0,255,0.16),transparent_32%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.22em] text-fuchsia-200">
                <span className="material-symbols-outlined text-base text-cyan">bolt</span>
                Limited Drop Marketplace
              </div>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Secure hype drops through the newer JSON storefront.
                </h1>
                <p className="max-w-2xl text-base text-slate-300 sm:text-lg">
                  The UI now follows the newest attached frontend. Buyer pages keep that visual system, while the
                  data layer stays wired to the Milestone 75 services for wallet top-up, voucher checkout, order
                  lifecycle tracking, refund visibility, and rating after completion.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan to-blue-500 px-6 py-3 text-sm font-black uppercase tracking-[0.18em] text-[#0B0914] shadow-[0_0_22px_rgba(0,240,255,0.35)]"
                  to={isAuthenticated ? '/browse' : '/register'}
                >
                  <span className="material-symbols-outlined text-base">shopping_bag</span>
                  {isAuthenticated ? 'Open Catalog' : 'Create Account'}
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors hover:border-cyan/30 hover:text-cyan"
                  to={isAuthenticated ? '/orders' : '/login'}
                >
                  <span className="material-symbols-outlined text-base">receipt_long</span>
                  {isAuthenticated ? 'Track Orders' : 'Log In'}
                </Link>
              </div>
            </div>

            <aside className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Current Session</p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {user ? user.fullName || user.username : 'Guest Visitor'}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  {user ? `${user.role} flow is available from the same deployed frontend.` : 'Register or log in to top up, checkout, and track orders.'}
                </p>
              </div>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-cyan/20 bg-cyan/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">Buyer Flow</p>
                  <p className="mt-2 text-sm text-slate-200">Browse, top up wallet, redeem voucher, and rate completed orders.</p>
                </div>
                <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-200">Jastiper Flow</p>
                  <p className="mt-2 text-sm text-slate-200">Process Paid, Purchased, Shipped, and Completed transitions, with cancellation limited to early-stage orders.</p>
                </div>
                <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Admin Flow</p>
                  <p className="mt-2 text-sm text-slate-200">Monitor system orders and manage voucher lifecycle with an explicit admin token.</p>
                </div>
              </div>
            </aside>
          </div>
        </article>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan/15 text-cyan">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <h2 className="text-xl font-bold text-white">Wallet-backed checkout</h2>
            <p className="mt-2 text-sm text-slate-400">Balance, top-up history, deduct, and refund stay in the Wallet service.</p>
          </article>
          <article className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 text-cyan">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <h2 className="text-xl font-bold text-white">Stock-safe ordering</h2>
            <p className="mt-2 text-sm text-slate-400">Inventory validation stays behind the Order orchestrator, not in the browser.</p>
          </article>
          <article className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-md">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
              <span className="material-symbols-outlined">sell</span>
            </div>
            <h2 className="text-xl font-bold text-white">Voucher lifecycle</h2>
            <p className="mt-2 text-sm text-slate-400">Public voucher listing is safe; admin mutations require a manual token entry at runtime.</p>
          </article>
        </section>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Featured Drops</p>
              <h2 className="mt-2 text-2xl font-black text-white">Newest UI, live inventory data</h2>
            </div>
            <Link className="text-sm font-bold uppercase tracking-[0.18em] text-cyan" to="/browse">
              View all
            </Link>
          </div>

          {loading ? (
            <LoadingState label="Loading storefront..." />
          ) : featuredProducts.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-white/15 bg-white/5 p-10 text-center text-slate-400">
              No products were returned by Inventory.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Service Health</p>
            <h2 className="mt-2 text-2xl font-black text-white">Deployed integration snapshot</h2>
          </div>

          {loading ? (
            <LoadingState label="Checking service health..." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {(health?.services || []).map((service) => (
                <article
                  className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-md"
                  key={service.key}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-white">{service.name}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                        service.status === 'UP'
                          ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                          : 'border border-rose-400/30 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-slate-300">{service.note}</p>
                  <p className="mt-3 text-xs text-slate-500">{service.detail}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </PageShell>
  );
}
